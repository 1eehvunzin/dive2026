import type { Response } from 'express';

export type ApiErrorBody = {
  error: string;
  code: string;
  details?: Record<string, unknown>;
};

export function sendApiError(
  res: Response,
  status: number,
  code: string,
  error: string,
  details?: Record<string, unknown>,
) {
  const body: ApiErrorBody = details ? { error, code, details } : { error, code };
  return res.status(status).json(body);
}

export function parseUniquePositiveIntegerIds(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const parsed: number[] = [];
  for (const value of input) {
    const normalized = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
    if (!/^[1-9]\d*$/.test(normalized)) return null;
    const id = Number(normalized);
    if (!Number.isSafeInteger(id)) return null;
    parsed.push(id);
  }
  return [...new Set(parsed)];
}

export function parsePositiveInteger(input: unknown): number | null {
  const normalized = typeof input === 'number' ? String(input) : typeof input === 'string' ? input.trim() : '';
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) ? value : null;
}

export function parseDateOnly(input: unknown): { text: string; date: Date } | null {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input) return null;
  return { text: input, date };
}
