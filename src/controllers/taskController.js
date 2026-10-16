const db = require("../database/db");

/**
 * GET /api/tasks
 * Lists all tasks belonging to the authenticated user.
 * Supports query params: status, priority, search, page, limit
 */
async function getAllTasks(req, res) {
  try {
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
      query += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)";
      countQuery += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)";
      const searchPattern = `%${search.toLowerCase()}%`;
      params.push(searchPattern, searchPattern);
    }

    const countRow = await db.getOne(countQuery, params);
    const total = parseInt(countRow?.total || 0, 10);

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

    const tasks = await db.getAll(query, [...params, limitNum, offset]);

    res.json({
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("GetAllTasks error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /api/tasks/:id
 * Returns a single task by ID (must belong to the authenticated user).
 */
async function getTaskById(req, res) {
  try {
    const task = await db.getOne(
      "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    res.json({ task });
  } catch (err) {
    console.error("GetTaskById error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 */
async function createTask(req, res) {
  try {
    const { title, description = "", status = "pending", priority = "medium", due_date = null } = req.body;

    const task = await db.getOne(
      `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [req.user.id, title, description, status, priority, due_date]
    );

    res.status(201).json({
      message: "Task created successfully.",
      task,
    });
  } catch (err) {
    console.error("CreateTask error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PUT /api/tasks/:id
 * Fully updates an existing task (must belong to the authenticated user).
 */
async function updateTask(req, res) {
  try {
    const { title, description = "", status = "pending", priority = "medium", due_date = null } = req.body;

    const task = await db.getOne(
      `UPDATE tasks
       SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?
       RETURNING *`,
      [title, description, status, priority, due_date, req.params.id, req.user.id]
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    res.json({
      message: "Task updated successfully.",
      task,
    });
  } catch (err) {
    console.error("UpdateTask error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * PATCH /api/tasks/:id
 * Partially updates an existing task (only the fields provided).
 */
async function patchTask(req, res) {
  try {
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

    const task = await db.getOne(
      `UPDATE tasks SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? RETURNING *`,
      [...values, req.params.id, req.user.id]
    );

    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    res.json({
      message: "Task updated successfully.",
      task,
    });
  } catch (err) {
    console.error("PatchTask error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * DELETE /api/tasks/:id
 * Deletes a task (must belong to the authenticated user).
 */
async function deleteTask(req, res) {
  try {
    const result = await db.execute(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Task not found." });
    }

    res.json({ message: "Task deleted successfully." });
  } catch (err) {
    console.error("DeleteTask error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask,
};
