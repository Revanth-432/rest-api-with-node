const { Router } = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const authenticate = require("../middleware/auth");
const { register, login, getProfile } = require("../controllers/authController");

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────
router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("Username must be 3-30 characters."),
    body("email")
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters."),
  ],
  validate,
  register
);

// ── POST /api/auth/login ─────────────────────────────────────
router.post(
  "/login",
  [
    body("email")
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage("A valid email is required."),
    body("password")
      .notEmpty()
      .withMessage("Password is required."),
  ],
  validate,
  login
);

// ── GET /api/auth/me ─────────────────────────────────────────
router.get("/me", authenticate, getProfile);

module.exports = router;
