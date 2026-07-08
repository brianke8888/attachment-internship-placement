// middleware/auth.js — JWT verification + role guard
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

/**
 * Verify the Authorization: Bearer <token> header.
 * Attaches req.user = { id, role, email, name } on success.
 */
function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: no token provided' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: invalid or expired token' })
  }
}

/**
 * Require a specific role. Use after authRequired.
 *   router.get('/admin', authRequired, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' })
    }
    next()
  }
}

module.exports = { authRequired, requireRole, JWT_SECRET }
