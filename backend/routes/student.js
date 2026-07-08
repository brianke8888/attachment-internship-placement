// routes/student.js — student profile + applications
const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')
const { pool } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')

// --- Multer storage for CV uploads ---
const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf'
    cb(null, `${req.user.id}-${crypto.randomUUID()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|doc|docx)$/i
    if (allowed.test(file.originalname)) return cb(null, true)
    cb(new Error('Only PDF, DOC, or DOCX files are allowed'))
  },
})

// GET /api/student/profile
router.get('/profile', authRequired, requireRole('student'), async (req, res, next) => {
  try {
    const [profiles] = await pool.query('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) {
      return res.status(404).json({ message: 'Profile not found' })
    }
    const profile = profiles[0]

    const [applications] = await pool.query(
      `SELECT a.*, i.title AS internship_title, i.location AS internship_location, i.company_id,
              cp.company_name
       FROM applications a
       JOIN internships i ON i.id = a.internship_id
       JOIN company_profiles cp ON cp.id = i.company_id
       WHERE a.student_id = ?
       ORDER BY a.created_at DESC`,
      [profile.id]
    )

    res.json({ profile, applications })
  } catch (err) {
    next(err)
  }
})

// POST /api/student/profile (multipart/form-data with CV upload)
router.post('/profile', authRequired, requireRole('student'), upload.single('cv'), async (req, res, next) => {
  try {
    const { course, skills, phone, bio } = req.body
    if (!course || !skills) {
      return res.status(400).json({ message: 'Course and skills are required' })
    }

    const cvFileName = req.file ? req.file.filename : null
    const profileComplete = course.trim().length > 0 && skills.trim().length > 0 ? 1 : 0

    // Upsert
    const [existing] = await pool.query('SELECT id, cv_file_name FROM student_profiles WHERE user_id = ?', [req.user.id])

    if (existing.length) {
      // If a new CV was uploaded, optionally delete the old file
      if (cvFileName && existing[0].cv_file_name) {
        const oldPath = path.join(uploadDir, existing[0].cv_file_name)
        fs.unlink(oldPath, () => {}) // best-effort
      }
      await pool.query(
        `UPDATE student_profiles
         SET course = ?, skills = ?, phone = ?, bio = ?, profile_complete = ?,
             cv_file_name = COALESCE(?, cv_file_name)
         WHERE user_id = ?`,
        [course, skills, phone || '', bio || '', profileComplete, cvFileName, req.user.id]
      )
    } else {
      await pool.query(
        `INSERT INTO student_profiles (user_id, course, skills, phone, bio, cv_file_name, profile_complete)
         VALUES (?,?,?,?,?,?,?)`,
        [req.user.id, course, skills, phone || '', bio || '', cvFileName, profileComplete]
      )
    }

    const [rows] = await pool.query('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id])
    res.json({ message: 'Student profile saved', profile: rows[0] })
  } catch (err) {
    next(err)
  }
})

module.exports = router
