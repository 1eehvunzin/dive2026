import "dotenv/config"
import express from "express"
import cors from "cors"
import companiesRouter from "./routes/companies"
import programsRouter from "./routes/programs"
import agentRouter from "./routes/agent"
import uploadRouter from "./routes/upload"
import reportRouter from "./routes/report"

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"] }))
app.use(express.json({ limit: "10mb" }))

app.use("/api/companies", companiesRouter)
app.use("/api/programs", programsRouter)
app.use("/api/agent", agentRouter)
app.use("/api/upload", uploadRouter)
app.use("/api/report", reportRouter)

app.get("/health", (_req, res) => res.json({ status: "ok", db: "dive2026.db" }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
