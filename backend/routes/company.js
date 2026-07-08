// routes/company.js — company profile + its internships + applicants
const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')

// GET /api/company/profile
router.get('/profile', authRequired, requireRole('company'), async (req, res, next) => {
  try {
    const [profiles] = await pool.query('SELECT * FROM company_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) {
      return res.status(404).json({ message: 'Profile not found' })
    }
    const profile = profiles[0]

    const [internships] = await pool.query(
      `SELECT i.*,
              (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS application_count
       FROM internships i
       WHERE i.company_id = ?
       ORDER BY i.created_at DESC`,
      [profile.id]
    )

    res.json({ profile, internships })
  } catch (err) {
    next(err)
  }
})

// POST /api/company/profile
router.post('/profile', authRequired, requireRole('company'), async (req, res, next) => {
  try {
    const { company_name, industry, description, website, location } = req.body
    if (!company_name || !industry) {
      return res.status(400).json({ message: 'Company name and industry are required' })
    }

    const profileComplete =
      company_name.trim().length > 0 &&
      industry.trim().length > 0 &&
      (description || '').trim().length > 0 ? 1 : 0

    const [existing] = await pool.query('SELECT id FROM company_profiles WHERE user_id = ?', [req.user.id])

    if (existing.length) {
      await pool.query(
        `UPDATE company_profiles
         SET company_name = ?, industry = ?, description = ?, website = ?, location = ?, profile_complete = ?
         WHERE user_id = ?`,
        [company_name, industry, description || '', website || '', location || '', profileComplete, req.user.id]
      )
    } else {
      await pool.query(
        `INSERT INTO company_profiles (user_id, company_name, industry, description, website, location, profile_complete)
         VALUES (?,?,?,?,?,?,?)`,
        [req.user.id, company_name, industry, description || '', website || '', location || '', profileComplete]
      )
    }

    const [rows] = await pool.query('SELECT * FROM company_profiles WHERE user_id = ?', [req.user.id])
    res.json({ message: 'Company profile saved', profile: rows[0] })
  } catch (err) {
    next(err)
  }
})

// GET /api/company/applications?status=&internship_id=
router.get('/applications', authRequired, requireRole('company'), async (req, res, next) => {
  try {
    const { status, internship_id } = req.query
    const [profiles] = await pool.query('SELECT id FROM company_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) {
      return res.status(404).json({ message: 'Company profile not found' })
    }
    const companyId = profiles[0].id

    let sql = `
      SELECT a.*, i.title AS internship_title, i.location AS internship_location,
             sp.course, sp.skills, sp.phone, sp.bio, sp.cv_file_name,
             u.name AS student_name, u.email AS student_email
      FROM applications a
      JOIN internships i ON i.id = a.internship_id
      JOIN student_profiles sp ON sp.id = a.student_id
      JOIN users u ON u.id = sp.user_id
      WHERE i.company_id = ?
    `
    const params = [companyId]
    if (status && status !== 'all') {
      sql += ' AND a.status = ?'
      params.push(status)
    }
    if (internship_id) {
      sql += ' AND a.internship_id = ?'
      params.push(internship_id)
    }
    sql += ' ORDER BY a.created_at DESC'

    const [applications] = await pool.query(sql, params)
    res.json({ applications })
  } catch (err) {
    next(err)
  }
})

module.exports = router
