const { db } = require("../database/db");

/**
 * GET /api/tasks
 * Lists all tasks belonging to the authenticated user.
 * Supports query params: status, priority, search, page, limit
 */
function getAllTasks(req, res) {
  const userId = req.user.id;
  const {
    status,
    priority,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  let query = "SELECT * FROM tasks WHERE user_id = ?";
  let countQuery = "SELECT COUNT(*) as total FROM tasks WHERE user_id = ?";
  const params = [userId];

  if (status) {
    query += " AND status = ?";
    countQuery += " AND status = ?";
    params.push(status);
  }

  if (priority) {
    query += " AND priority = ?";
    countQuery += " AND priority = ?";
    params.push(priority);
  }

  if (search) {
    query += " AND (title LIKE ? OR description LIKE ?)";
    countQuery += " AND (title LIKE ? OR description LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = db.prepare(countQuery).get(...params).total;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

  const tasks = db.prepare(query).all(...params, limitNum, offset);

  res.json({
    tasks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

/**
 * GET /api/tasks/:id
 * Returns a single task by ID (must belong to the authenticated user).
 */
function getTaskById(req, res) {
  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);

  if (!task) {
    return res.status(404).json({ error: "Task not found." });
  }

  res.json({ task });
}

/**
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 */
function createTask(req, res) {
  const { title, description = "", status = "pending", priority = "medium", due_date = null } = req.body;

  const result = db
    .prepare(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, title, description, status, priority, due_date);

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json({
    message: "Task created successfully.",
    task,
  });
}

/**
 * PUT /api/tasks/:id
 * Fully updates an existing task (must belong to the authenticated user).
 */
function updateTask(req, res) {
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Task not found." });
  }

  const { title, description = "", status = "pending", priority = "medium", due_date = null } = req.body;

  db.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(title, description, status, priority, due_date, req.params.id, req.user.id);

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);

  res.json({
    message: "Task updated successfully.",
    task,
  });
}

/**
 * PATCH /api/tasks/:id
 * Partially updates an existing task (only the fields provided).
 */
function patchTask(req, res) {
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Task not found." });
  }

  const fields = {};
  const allowedFields = ["title", "description", "status", "priority", "due_date"];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      fields[field] = req.body[field];
    }
  }

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: "No valid fields provided for update." });
  }

  const setClauses = Object.keys(fields)
    .map((f) => `${f} = ?`)
    .join(", ");
  const values = Object.values(fields);

  db.prepare(
    `UPDATE tasks SET ${setClauses}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
  ).run(...values, req.params.id, req.user.id);

  const task = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(req.params.id);

  res.json({
    message: "Task updated successfully.",
    task,
  });
}

/**
 * DELETE /api/tasks/:id
 * Deletes a task (must belong to the authenticated user).
 */
function deleteTask(req, res) {
  const existing = db
    .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({ error: "Task not found." });
  }

  db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(
    req.params.id,
    req.user.id
  );

  res.json({ message: "Task deleted successfully." });
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask,
};
