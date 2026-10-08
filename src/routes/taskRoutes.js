const { Router } = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/auth");
const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask,
} = require("../controllers/taskController");

const router = Router();

// All task routes require authentication
router.use(authenticate);

const statusValues = ["pending", "in_progress", "completed"];
const priorityValues = ["low", "medium", "high"];

// Validation rules for creating a task (POST)
const createRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required.")
    .isLength({ max: 200 })
    .withMessage("Title must be at most 200 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be at most 2000 characters."),
  body("status")
    .optional()
    .isIn(statusValues)
    .withMessage(`Status must be one of: ${statusValues.join(", ")}.`),
  body("priority")
    .optional()
    .isIn(priorityValues)
    .withMessage(`Priority must be one of: ${priorityValues.join(", ")}.`),
  body("due_date")
    .optional({ values: "null" })
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date."),
];

// Validation rules for full update (PUT) — title is required
const updateRules = [...createRules];

// Validation rules for partial update (PATCH) — all fields optional
const patchRules = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty.")
    .isLength({ max: 200 })
    .withMessage("Title must be at most 200 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description must be at most 2000 characters."),
  body("status")
    .optional()
    .isIn(statusValues)
    .withMessage(`Status must be one of: ${statusValues.join(", ")}.`),
  body("priority")
    .optional()
    .isIn(priorityValues)
    .withMessage(`Priority must be one of: ${priorityValues.join(", ")}.`),
  body("due_date")
    .optional({ values: "null" })
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date."),
];

// ── GET    /api/tasks      ───────────────────────────────────
router.get("/", getAllTasks);

// ── GET    /api/tasks/:id  ───────────────────────────────────
router.get("/:id", getTaskById);

// ── POST   /api/tasks      ───────────────────────────────────
router.post("/", createRules, validate, createTask);

// ── PUT    /api/tasks/:id  ───────────────────────────────────
router.put("/:id", updateRules, validate, updateTask);

// ── PATCH  /api/tasks/:id  ───────────────────────────────────
router.patch("/:id", patchRules, validate, patchTask);

// ── DELETE /api/tasks/:id  ───────────────────────────────────
router.delete("/:id", deleteTask);

module.exports = router;
