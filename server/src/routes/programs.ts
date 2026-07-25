import { Router } from "express"
import { programs } from "../lib/data"
import type { Program } from "../lib/types"

const router = Router()

const store: Program[] = [...programs]

router.get("/", (_req, res) => {
  res.json(store)
})

router.post("/", (req, res) => {
  const body = req.body as Omit<Program, "id">
  const program: Program = { ...body, id: `prog-${Date.now()}` }
  store.push(program)
  res.status(201).json(program)
})

router.put("/:id", (req, res) => {
  const idx = store.findIndex((p) => p.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: "Program not found" })
    return
  }
  store[idx] = { ...req.body, id: req.params.id }
  res.json(store[idx])
})

export default router
