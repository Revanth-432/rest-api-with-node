const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const { initialize } = require("./database/db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Global Middleware ────────────────────────────────────────
const clientUrl = process.env.CLIENT_URL;
app.use(
  cors({
    origin: clientUrl ? [clientUrl, "http://localhost:5173", "http://localhost:3000"] : true,
    credentials: true,
  })
);
app.use(express.json());

// ── Root & Health Check Endpoints ─────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    message: "Task Manager REST API is running.",
    health: "/api/health",
    docs: "See README for endpoints",
  });
});

app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "ok",
    database: process.env.DATABASE_URL ? "postgresql" : "sqlite",
    timestamp: new Date().toISOString(),
  });
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
async function startServer() {
  try {
    await initialize();
    app.listen(PORT, () => {
      console.log(`\n  🚀 Task Manager API running on port ${PORT}`);
      console.log(`  📋 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

module.exports = app;
