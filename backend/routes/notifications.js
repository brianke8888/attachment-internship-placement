// routes/notifications.js — notification CRUD
const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authRequired } = require('../middleware/auth')
const socket = require('../socket')

// POST helper (used by other routes to push notifications)
async function createNotification({ user_id, type, title, message, link }) {
  const [result] = await pool.query(
    'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?,?,?,?,?)',
    [user_id, type || 'info', title, message || '', link || '']
  )

  // Emit real-time event
  const io = socket.getIO()
  if (io) {
    io.to(`user:${user_id}`).emit('notification', {
      id: result.insertId,
      type: type || 'info',
      title,
      message: message || '',
      link: link || '',
      is_read: 0,
      created_at: new Date().toISOString(),
    })
  }
}

// GET /api/notifications?limit=10
router.get('/', authRequired, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)
    const [rows] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [req.user.id, limit]
    )
    res.json({ notifications: rows })
  } catch (err) { next(err) }
})

// GET /api/notifications/unread-count
router.get('/unread-count', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    )
    res.json({ count: rows[0].count })
  } catch (err) { next(err) }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authRequired, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Notification not found' })
    res.json({ message: 'Marked as read' })
  } catch (err) { next(err) }
})

// PATCH /api/notifications/read-all
router.patch('/read-all', authRequired, async (req, res, next) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    )
    res.json({ message: 'All marked as read' })
  } catch (err) { next(err) }
})

module.exports = { router, createNotification }
