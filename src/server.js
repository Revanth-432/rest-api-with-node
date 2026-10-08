require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initialize } = require("./database/db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health Check ─────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ── Global Error Handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// ── Start Server ─────────────────────────────────────────────
initialize();

app.listen(PORT, () => {
  console.log(`\n  🚀  Task Manager API running at http://localhost:${PORT}`);
  console.log(`  📋  Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
