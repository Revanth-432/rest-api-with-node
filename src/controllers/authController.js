const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/db");

/**
 * POST /api/auth/register
 * Creates a new user account.
 */
async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    // Check if username or email already exists
    const existing = await db.getOne(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );

    if (existing) {
      return res.status(400).json({
        error: "A user with that username or email already exists.",
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 12);

    const user = await db.getOne(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id, username, email, created_at",
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered successfully.",
      user,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT token.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await db.getOne("SELECT * FROM users WHERE email = ?", [email]);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
async function getProfile(req, res) {
  try {
    const user = await db.getOne(
      "SELECT id, username, email, created_at FROM users WHERE id = ?",
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ user });
  } catch (err) {
    console.error("GetProfile error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}

module.exports = { register, login, getProfile };
