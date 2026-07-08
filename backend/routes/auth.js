// routes/auth.js — register, login, me, password reset
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { pool } = require('../db')
const { authRequired } = require('../middleware/auth')
const { sendEmail, emailTemplates } = require('../email')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d'

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    if (!['student', 'company', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [String(email).toLowerCase()])
    if (existing.length) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
      [name.trim(), email.toLowerCase().trim(), hashed, role]
    )
    const userId = result.insertId

    // Auto-create matching profile
    if (role === 'student') {
      await pool.query('INSERT INTO student_profiles (user_id) VALUES (?)', [userId])
    } else if (role === 'company') {
      await pool.query("INSERT INTO company_profiles (user_id, status) VALUES (?, 'pending')", [userId])
    }

    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId])
    const user = rows[0]
    const token = signToken(user)

    // Send welcome email (non-blocking)
    sendEmail({
      to: user.email,
      ...emailTemplates().welcome(user.name, user.role),
    })

    // Notify admin (non-blocking)
    pool.query('SELECT email FROM users WHERE role = ?', ['admin']).then(([admins]) => {
      if (admins.length) {
        sendEmail({
          to: admins[0].email,
          ...emailTemplates().adminNotification(
            'New user registered',
            `<p><strong>${user.name}</strong> (${user.email}) just registered as a <strong>${user.role}</strong>.</p>
             <p><a href="http://localhost:${process.env.PORT || 5000}/pages/admin-dashboard.html" style="color:#059669;">View in admin dashboard</a></p>`
          ),
        })
      }
    })

    res.json({ message: 'Account created', token, user })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase().trim()])
    const user = rows[0]
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been suspended. Contact the administrator.' })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role }
    const token = signToken(safeUser)

    res.json({ message: 'Login successful', token, user: safeUser })
  } catch (err) {
    next(err)
  }
})

// GET /api/auth/me
router.get('/me', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              s.id AS student_id, s.course, s.skills, s.phone, s.bio, s.cv_file_name, s.profile_complete AS student_complete,
              c.id AS company_id, c.company_name, c.industry, c.description AS company_description, c.website, c.location AS company_location, c.profile_complete AS company_complete
       FROM users u
       LEFT JOIN student_profiles s ON s.user_id = u.id
       LEFT JOIN company_profiles c ON c.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    )
    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' })
    }
    const r = rows[0]
    const user = {
      id: r.id, name: r.name, email: r.email, role: r.role, created_at: r.created_at,
      student: r.student_id ? {
        id: r.student_id, course: r.course, skills: r.skills, phone: r.phone, bio: r.bio,
        cv_file_name: r.cv_file_name, profile_complete: !!r.student_complete,
      } : null,
      company: r.company_id ? {
        id: r.company_id, company_name: r.company_name, industry: r.industry,
        description: r.company_description, website: r.website, location: r.company_location,
        profile_complete: !!r.company_complete,
      } : null,
    }
    res.json({ user })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ message: 'Email is required' })
    }

    const [rows] = await pool.query('SELECT id, name, email FROM users WHERE email = ?', [String(email).toLowerCase().trim()])
    // Always return same message regardless of whether email exists (security)
    if (!rows.length) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    const user = rows[0]
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [token, expires, user.id]
    )

    const resetLink = `http://localhost:${process.env.PORT || 5000}/reset-password.html?token=${token}`
    sendEmail({
      to: user.email,
      ...emailTemplates().passwordReset(user.name, resetLink),
    })

    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const [rows] = await pool.query(
      'SELECT id, name, email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    )
    if (!rows.length) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    const user = rows[0]
    const hashed = await bcrypt.hash(password, 10)

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashed, user.id]
    )

    res.json({ message: 'Password updated successfully. You can now sign in.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
