// server.js — Express app entry point
const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
require('dotenv').config()

const { testConnection, pool } = require('./db')
const fs = require('fs')
const socket = require('./socket')

const app = express()
const server = http.createServer(app)

// --- Middleware ---
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded CV files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')))

// --- Routes ---
app.use('/api/auth', require('./routes/auth'))
app.use('/api/student', require('./routes/student'))
app.use('/api/company', require('./routes/company'))
app.use('/api/internships', require('./routes/internships'))
app.use('/api/applications', require('./routes/applications'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/notifications', require('./routes/notifications').router)

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }))

// --- 404 + error handlers ---
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON body' })
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large (max 5MB)' })
  }
  res.status(500).json({ message: 'Server error', error: err.message })
})

// --- Start ---
const PORT = process.env.PORT || 5000

;(async () => {
  await testConnection()

  const schemaPath = path.join(__dirname, '..', 'db', 'init.sql')
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf8')
    const conn = await pool.getConnection()
    try {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0)
      for (const stmt of statements) {
        await conn.query(stmt)
      }
      console.log('Schema verified / tables created.')
    } finally {
      conn.release()
    }
  }

  socket.init(server)
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`  API:   http://localhost:${PORT}/api`)
    console.log(`  Health: http://localhost:${PORT}/api/health`)
  })
})()
