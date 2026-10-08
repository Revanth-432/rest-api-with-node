const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../database/db");

/**
 * POST /api/auth/register
 * Creates a new user account.
 */
function register(req, res) {
  const { username, email, password } = req.body;

  // Check if username or email already exists
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username, email);

  if (existing) {
    return res.status(400).json({
      error: "A user with that username or email already exists.",
    });
  }

  const hashedPassword = bcrypt.hashSync(password, 12);

  const result = db
    .prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)")
    .run(username, email, hashedPassword);

  const user = db
    .prepare("SELECT id, username, email, created_at FROM users WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json({
    message: "User registered successfully.",
    user,
  });
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT token.
 */
function login(req, res) {
  const { email, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
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
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
function getProfile(req, res) {
  const user = db
    .prepare("SELECT id, username, email, created_at FROM users WHERE id = ?")
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  res.json({ user });
}

module.exports = { register, login, getProfile };
