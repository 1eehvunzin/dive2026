#!/usr/bin/env python3
"""Download public, no-auth benchmark data used by the DIVE analysis backend."""

from __future__ import annotations

import datetime as dt
import hashlib
import html
import http.cookiejar
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw"
USER_AGENT = "DIVE2026-public-data-loader/1.0"
COOKIE_JAR = http.cookiejar.CookieJar()
OPENER = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(COOKIE_JAR)
)

BUSAN_CATEGORIES = {
    "business_census": "STTMSTR_000000000295QRGsrfVsBr",
    "mining_manufacturing": "STTMSTR_000000000297lochSrqWvA",
    "marine_industry": "STTMSTR_000000000303QZUiIcBhuk",
    "district_grdp": "STTMSTR_000000001211ykuHhWHvuw",
    "manufacturing_survey": "STTMSTR_000000000311YtzDevApOQ",
    "environment_industry": "STTMSTR_000000000321iJVDgjgxSI",
    "jobs_survey": "STTMSTR_000000000323URCEbpEAyw",
    "small_business": "STTMSTR_000000000327GuOXRzILre",
}

SASANG_FILES = [
    ("01_산업세세분류별_총괄.xlsx", 292226),
    ("02_산업소분류_동별_사업체_종사자.xlsx", 292227),
    ("03_산업중분류_종사자규모_동별.xlsx", 292228),
    ("04_산업중분류_사업체구분_동별.xlsx", 292229),
    ("05_산업중분류_조직형태_동별.xlsx", 292230),
    ("06_산업중분류_종사상지위_동별.xlsx", 292231),
    ("07_산업중분류_대표자성별_동별.xlsx", 292232),
    ("08_산업중분류_종사자성별_동별.xlsx", 292233),
    ("09_산업중분류_대표자연령대_동별.xlsx", 292234),
]

BOK_FILES = [
    {
        "filename": "2024_business_analysis_full_report.pdf",
        "url": (
            "https://www.bok.or.kr/fileSrc/portal/"
            "28c42cb6b6b04bc7ac742c84f55f9a6e/1/"
            "648e72ea66ea4ed7a56e82311e4f4d26.pdf"
        ),
        "source_page": (
            "https://www.bok.or.kr/portal/bbs/P0000599/view.do"
            "?depth=200455&menuNo=200455&nttId=10094232"
        ),
        "title": "2024년 기업경영분석",
    },
    {
        "filename": "2024_business_analysis_preliminary_statistics.xlsx",
        "url": (
            "https://www.bok.or.kr/fileSrc/portal/"
            "cad3df74c04b4e1798ced51fdae9d12e/3/"
            "cfc9fab30fca4d4c8a9ba6fea95eaccc.xlsx"
        ),
        "source_page": (
            "https://www.bok.or.kr/portal/bbs/B0000501/view.do"
            "?menuNo=201264&nttId=10091824&oldMenuNo=201263"
        ),
        "title": "2024년 기업경영분석 결과(속보) 통계편",
    },
]


def get(url: str) -> tuple[bytes, str, dict[str, str]]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with OPENER.open(request, timeout=90) as response:
        return response.read(), response.geturl(), dict(response.headers.items())


def looks_like_html(data: bytes, headers: dict[str, str]) -> bool:
    content_type = headers.get("Content-Type", "").lower()
    prefix = data[:512].lstrip().lower()
    return (
        "text/html" in content_type
        or prefix.startswith(b"<!doctype html")
        or prefix.startswith(b"<html")
    )


def clean_filename(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", "", value)).strip()
    value = value.replace("/", "_").replace("\\", "_").replace("\x00", "")
    return re.sub(r"\s+", " ", value)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def save_file(folder: Path, filename: str, data: bytes) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / clean_filename(filename)
    path.write_bytes(data)
    return path


def parse_busan_rows(page: str) -> list[dict]:
    match = re.search(r"let row = (\[.*?\]);\s*let searchWrd", page, re.S)
    if not match:
        raise RuntimeError("Could not locate Busan report row data")
    return json.loads(match.group(1))


def parse_attachments(page: str) -> list[tuple[str, int, str]]:
    pattern = re.compile(
        r"fn_egov_downFile\('([^']+)','(\d+)'\)\">\s*([^<]+?)\s*</a>",
        re.S,
    )
    return [
        (attachment_id, int(file_sn), clean_filename(filename))
        for attachment_id, file_sn, filename in pattern.findall(page)
    ]


def download_busan() -> list[dict]:
    """Best-effort central portal loader.

    Kept for diagnostics only. The central portal returned HTML for attachments
    on 2026-07-25, so main() uses the working Sasang-gu public downloads.
    """
    manifest: list[dict] = []
    base = "https://data.busan.go.kr"
    for dataset_id, bbs_id in BUSAN_CATEGORIES.items():
        print(f"[busan] checking {dataset_id}", flush=True)
        list_url = (
            f"{base}/bdip/board/statRpt.do?bbs={bbs_id}"
            "&pageNum=1&searchCnd=0&searchWrd="
        )
        list_bytes, _, _ = get(list_url)
        rows = parse_busan_rows(list_bytes.decode("utf-8", errors="replace"))
        candidates = [row for row in rows if row.get("atchFileExist") == "Y"]
        if not candidates:
            manifest.append(
                {
                    "dataset_id": f"busan_{dataset_id}",
                    "status": "no_attachment",
                    "source_page": list_url,
                }
            )
            continue
        latest = max(
            candidates,
            key=lambda row: (row.get("frstRegisterPnttm", ""), row.get("nttId", 0)),
        )
        article_url = (
            f"{base}/bdip/board/statRpt.do?bbs={bbs_id}"
            f"&pageNum=1&searchCnd=0&searchWrd=&article={latest['nttId']}"
        )
        article_bytes, _, _ = get(article_url)
        attachments = parse_attachments(
            article_bytes.decode("utf-8", errors="replace")
        )
        if not attachments:
            manifest.append(
                {
                    "dataset_id": f"busan_{dataset_id}",
                    "status": "attachment_parse_failed",
                    "title": latest.get("nttSj"),
                    "source_page": article_url,
                }
            )
            continue
        for attachment_id, file_sn, filename in attachments:
            download_url = (
                f"{base}/bdip/cmm/fms/FileDown.do"
                f"?atchFileId={attachment_id}&fileSn={file_sn}"
            )
            data, resolved_url, headers = get(download_url)
            if looks_like_html(data, headers):
                raise RuntimeError(
                    f"Busan returned HTML instead of attachment: {filename}"
                )
            path = save_file(RAW / "busan" / dataset_id, filename, data)
            manifest.append(
                {
                    "dataset_id": f"busan_{dataset_id}",
                    "status": "downloaded",
                    "title": latest.get("nttSj"),
                    "reference_year": latest.get("nttSj"),
                    "published_at": latest.get("frstRegisterPnttm"),
                    "source_page": article_url,
                    "download_url": download_url,
                    "resolved_url": resolved_url,
                    "path": str(path.relative_to(ROOT)),
                    "filename": path.name,
                    "content_type": headers.get("Content-Type"),
                    "bytes": len(data),
                    "sha256": sha256(data),
                }
            )
            print(f"[busan] downloaded {path.name}", flush=True)
    return manifest


def download_sasang() -> list[dict]:
    manifest: list[dict] = []
    folder = RAW / "busan" / "sasang_business_census_2024"
    source_page = (
        "https://www.sasang.go.kr/index.sasang"
        "?menuCd=DOM_000000120004013000"
    )
    for filename, file_sid in SASANG_FILES:
        path = folder / filename
        url = (
            "https://www.sasang.go.kr/board/download.sasang"
            f"?boardId=BBS_0000153&dataSid=562197&fileSid={file_sid}"
        )
        if path.exists() and path.stat().st_size > 0:
            data = path.read_bytes()
            status = "existing"
            resolved_url = url
            headers: dict[str, str] = {}
        else:
            print(f"[sasang] downloading {filename}", flush=True)
            data, resolved_url, headers = get(url)
            if looks_like_html(data, headers):
                raise RuntimeError(
                    f"Sasang returned HTML instead of attachment: {filename}"
                )
            path = save_file(folder, filename, data)
            status = "downloaded"
        manifest.append(
            {
                "dataset_id": "sasang_business_census_2024",
                "status": status,
                "title": "2024년 기준 사상구 사업체조사",
                "reference_year": 2024,
                "source_page": source_page,
                "download_url": url,
                "resolved_url": resolved_url,
                "path": str(path.relative_to(ROOT)),
                "filename": path.name,
                "content_type": headers.get("Content-Type"),
                "bytes": len(data),
                "sha256": sha256(data),
            }
        )
        print(f"[sasang] {status} {filename}", flush=True)
    return manifest


def download_bok() -> list[dict]:
    manifest: list[dict] = []
    for item in BOK_FILES:
        path = RAW / "bok" / item["filename"]
        if path.exists() and path.stat().st_size > 0:
            data = path.read_bytes()
            manifest.append(
                {
                    "dataset_id": f"bok_{path.stem}",
                    "status": "existing",
                    "title": item["title"],
                    "reference_year": 2024,
                    "source_page": item["source_page"],
                    "download_url": item["url"],
                    "path": str(path.relative_to(ROOT)),
                    "filename": path.name,
                    "bytes": len(data),
                    "sha256": sha256(data),
                }
            )
            print(f"[bok] existing {path.name}", flush=True)
            continue
        print(f"[bok] downloading {item['filename']}", flush=True)
        data, resolved_url, headers = get(item["url"])
        path = save_file(RAW / "bok", item["filename"], data)
        manifest.append(
            {
                "dataset_id": f"bok_{path.stem}",
                "status": "downloaded",
                "title": item["title"],
                "reference_year": 2024,
                "source_page": item["source_page"],
                "download_url": item["url"],
                "resolved_url": resolved_url,
                "path": str(path.relative_to(ROOT)),
                "filename": path.name,
                "content_type": headers.get("Content-Type"),
                "bytes": len(data),
                "sha256": sha256(data),
            }
        )
        print(f"[bok] downloaded {path.name}", flush=True)
    return manifest


def main() -> int:
    ROOT.mkdir(parents=True, exist_ok=True)
    entries: list[dict] = []
    errors: list[dict] = []
    for loader_name, loader in (
        ("sasang", download_sasang),
        ("bok", download_bok),
    ):
        try:
            entries.extend(loader())
        except Exception as exc:
            errors.append(
                {
                    "loader": loader_name,
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )
    output = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "policy": {
            "business_registration_number_external_lookup": False,
            "authenticated_api_used": False,
            "public_no_auth_downloads_only": True,
        },
        "entries": entries,
        "errors": errors,
    }
    (ROOT / "download_manifest.generated.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "downloaded": sum(e.get("status") == "downloaded" for e in entries),
                "non_downloaded": sum(
                    e.get("status") != "downloaded" for e in entries
                ),
                "errors": errors,
            },
            ensure_ascii=False,
        )
    )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
