// routes/applications.js — apply, update status, withdraw
const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')
const { createNotification } = require('./notifications')
const { sendEmail, emailTemplates } = require('../email')

const VALID_STATUSES = ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted']

// POST /api/applications (student applies)
router.post('/', authRequired, requireRole('student'), async (req, res, next) => {
  try {
    const { internship_id, cover_letter } = req.body
    if (!internship_id) {
      return res.status(400).json({ message: 'Internship ID is required' })
    }

    const [profiles] = await pool.query('SELECT * FROM student_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) return res.status(404).json({ message: 'Student profile not found' })
    const profile = profiles[0]
    if (!profile.profile_complete) {
      return res.status(400).json({ message: 'Please complete your profile before applying' })
    }

    const [internships] = await pool.query('SELECT * FROM internships WHERE id = ?', [internship_id])
    if (!internships.length) return res.status(404).json({ message: 'Internship not found' })
    const internship = internships[0]
    if (internship.status !== 'open') {
      return res.status(400).json({ message: 'This internship is no longer open' })
    }
    if (new Date(internship.deadline) < new Date()) {
      return res.status(400).json({ message: 'Application deadline has passed' })
    }

    // Prevent duplicate
    const [dup] = await pool.query(
      'SELECT id FROM applications WHERE student_id = ? AND internship_id = ?',
      [profile.id, internship_id]
    )
    if (dup.length) {
      return res.status(400).json({ message: 'You have already applied to this internship' })
    }

    const [result] = await pool.query(
      'INSERT INTO applications (student_id, internship_id, cover_letter, status) VALUES (?,?,?,?)',
      [profile.id, internship_id, (cover_letter || '').trim(), 'pending']
    )

    // Notify company + send email
    const [companyUsers] = await pool.query(
      'SELECT u.id, u.email FROM users u JOIN company_profiles cp ON cp.user_id = u.id WHERE cp.id = ?',
      [internship.company_id]
    )
    if (companyUsers.length) {
      await createNotification({
        user_id: companyUsers[0].id,
        type: 'application',
        title: 'New application received',
        message: `${req.user.name} applied to "${internship.title}"`,
        link: '/pages/company-applicants.html',
      })
      sendEmail({
        to: companyUsers[0].email,
        ...emailTemplates().applicationReceived(req.user.name, internship.title, internship.company_name || 'your company'),
      })
    }

    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [result.insertId])
    res.json({ message: 'Application submitted', application: rows[0] })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/applications/:id/status (company updates status)
router.patch('/:id/status', authRequired, requireRole('company'), async (req, res, next) => {
  try {
    const { status } = req.body
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const [profiles] = await pool.query('SELECT id FROM company_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) return res.status(404).json({ message: 'Company profile not found' })
    const companyId = profiles[0].id

    const [apps] = await pool.query(
      `SELECT a.*, i.company_id FROM applications a
       JOIN internships i ON i.id = a.internship_id
       WHERE a.id = ?`,
      [req.params.id]
    )
    if (!apps.length) return res.status(404).json({ message: 'Application not found' })
    if (apps[0].company_id !== companyId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await pool.query('UPDATE applications SET status = ? WHERE id = ?', [status, req.params.id])

    // Notify student + send email
    const [studentUsers] = await pool.query(
      'SELECT u.id, u.name, u.email FROM users u JOIN student_profiles sp ON sp.user_id = u.id WHERE sp.id = ?',
      [apps[0].student_id]
    )
    if (studentUsers.length) {
      const [internshipRows] = await pool.query('SELECT title FROM internships WHERE id = ?', [apps[0].internship_id])
      const title = internshipRows.length ? internshipRows[0].title : 'Internship'
      await createNotification({
        user_id: studentUsers[0].id,
        type: 'status',
        title: 'Application status updated',
        message: `Your application for "${title}" has been marked as ${status}`,
        link: '/pages/my-applications.html',
      })
      sendEmail({
        to: studentUsers[0].email,
        ...emailTemplates().statusUpdated(studentUsers[0].name, title, status),
      })
    }

    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id])
    res.json({ message: 'Status updated', application: rows[0] })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/applications/:id (student withdraws own)
router.delete('/:id', authRequired, requireRole('student'), async (req, res, next) => {
  try {
    const [profiles] = await pool.query('SELECT id FROM student_profiles WHERE user_id = ?', [req.user.id])
    if (!profiles.length) return res.status(404).json({ message: 'Student profile not found' })

    const [apps] = await pool.query('SELECT * FROM applications WHERE id = ?', [req.params.id])
    if (!apps.length) return res.status(404).json({ message: 'Application not found' })
    if (apps[0].student_id !== profiles[0].id) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    await pool.query('DELETE FROM applications WHERE id = ?', [req.params.id])
    res.json({ message: 'Application withdrawn' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
