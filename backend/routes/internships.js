// routes/internships.js — list, get, create, update, delete
const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')
const { sendEmail, emailTemplates } = require('../email')

// GET /api/internships?search=&category=&location=&mine=1
router.get('/', async (req, res, next) => {
  try {
    const { search, category, location, mine } = req.query
    const where = []
    const params = []

    if (mine === '1' && req.user && req.user.role === 'company') {
      const [profiles] = await pool.query('SELECT id FROM company_profiles WHERE user_id = ?', [req.user.id])
      if (profiles.length) {
        where.push('i.company_id = ?')
        params.push(profiles[0].id)
      }
    } else {
      where.push("i.status = 'open'")
      where.push('i.is_approved = 1')
    }

    if (search) {
      where.push('(i.title LIKE ? OR i.description LIKE ? OR i.requirements LIKE ?)')
      const like = `%${search}%`
      params.push(like, like, like)
    }
    if (category && category !== 'all') {
      where.push('i.category = ?')
      params.push(category)
    }
    if (location) {
      where.push('i.location LIKE ?')
      params.push(`%${location}%`)
    }

    const sql = `
      SELECT i.*, cp.company_name, cp.industry, u.name AS company_user_name, u.email AS company_email,
             (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS application_count
      FROM internships i
      JOIN company_profiles cp ON cp.id = i.company_id
      JOIN users u ON u.id = cp.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY i.created_at DESC
    `
    const [internships] = await pool.query(sql, params)
    res.json({ internships })
  } catch (err) {
    next(err)
  }
})

// GET /api/internships/:id
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, cp.company_name, cp.industry, u.name AS company_user_name, u.email AS company_email,
             (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS application_count
       FROM internships i
       JOIN company_profiles cp ON cp.id = i.company_id
       JOIN users u ON u.id = cp.user_id
       WHERE i.id = ?`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Not found' })
    res.json({ internship: rows[0] })
  } catch (err) {
    next(err)
  }
})

// POST /api/internships (company only)
router.post('/', authRequired, requireRole('company'), async (req, res, next) => {
  try {
    const { title, description, requirements, location, duration, category, deadline } = req.body
    if (!title || !description || !location || !duration || !deadline) {
      return res.status(400).json({ message: 'Title, description, location, duration, and deadline are required' })
    }

    const [profiles] = await pool.query('SELECT * FROM company_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) return res.status(404).json({ message: 'Company profile not found' })
    const profile = profiles[0]
    if (!profile.profile_complete) {
      return res.status(400).json({ message: 'Please complete your company profile before posting internships' })
    }
    if (profile.status !== 'approved') {
      return res.status(403).json({ message: 'Your company account is pending approval. You cannot post internships yet.' })
    }

    const [result] = await pool.query(
      `INSERT INTO internships (company_id, title, description, requirements, location, duration, category, deadline, status, is_approved)
       VALUES (?,?,?,?,?,?,?,?,'open',0)`,
      [profile.id, title, description, requirements || '', location, duration, category || 'General', deadline]
    )

    const [rows] = await pool.query('SELECT * FROM internships WHERE id = ?', [result.insertId])

    // Notify admin (non-blocking)
    pool.query('SELECT email FROM users WHERE role = ?', ['admin']).then(([admins]) => {
      if (admins.length) {
        sendEmail({
          to: admins[0].email,
          ...emailTemplates().adminNotification(
            'New internship posted',
            `<p><strong>${title}</strong> was posted by <strong>${req.user.name}</strong> (${req.user.company_name || req.user.email}).</p>
             <p>Location: ${location} | Duration: ${duration} | Category: ${category || 'General'}</p>
             <p><a href="http://localhost:${process.env.PORT || 5000}/pages/admin-dashboard.html" style="color:#059669;">View in admin dashboard</a></p>`
          ),
        })
      }
    })

    res.json({ message: 'Internship posted', internship: rows[0] })
  } catch (err) {
    next(err)
  }
})

// PUT /api/internships/:id (owner company)
router.put('/:id', authRequired, requireRole('company'), async (req, res, next) => {
  try {
    const [profiles] = await pool.query('SELECT id FROM company_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) return res.status(404).json({ message: 'Company profile not found' })
    const companyId = profiles[0].id

    const [existing] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id])
    if (!existing.length) return res.status(404).json({ message: 'Not found' })
    if (existing[0].company_id !== companyId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    const allowed = ['title', 'description', 'requirements', 'location', 'duration', 'category', 'deadline', 'status']
    const updates = []
    const params = []
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        updates.push(`${k} = ?`)
        params.push(req.body[k])
      }
    }
    if (!updates.length) return res.status(400).json({ message: 'Nothing to update' })
    params.push(req.params.id)

    await pool.query(`UPDATE internships SET ${updates.join(', ')} WHERE id = ?`, params)
    const [rows] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id])
    res.json({ message: 'Internship updated', internship: rows[0] })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/internships/:id (owner company)
router.delete('/:id', authRequired, requireRole('company'), async (req, res, next) => {
  try {
    const [profiles] = await pool.query('SELECT id FROM company_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) return res.status(404).json({ message: 'Company profile not found' })
    const companyId = profiles[0].id

    const [existing] = await pool.query('SELECT * FROM internships WHERE id = ?', [req.params.id])
    if (!existing.length) return res.status(404).json({ message: 'Not found' })
    if (existing[0].company_id !== companyId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await pool.query('DELETE FROM internships WHERE id = ?', [req.params.id])
    res.json({ message: 'Internship deleted' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
