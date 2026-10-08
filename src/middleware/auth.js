const jwt = require("jsonwebtoken");

/**
 * Middleware that verifies the JWT token from the Authorization header.
 * Attaches `req.user` with { id, username } on success.
 * Returns 401 if the token is missing or invalid.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required. Provide a Bearer token.",
    });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = authenticate;
