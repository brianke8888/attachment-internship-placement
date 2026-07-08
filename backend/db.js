// db.js — MySQL connection pool
const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'attachment_internship',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
})

async function testConnection() {
  try {
    const conn = await pool.getConnection()
    await conn.ping()
    conn.release()
    console.log('Connected to MySQL database:', process.env.DB_NAME)
  } catch (err) {
    console.error('MySQL connection failed:', err.message)
    console.error('Check your .env credentials and that MySQL is running.')
    process.exit(1)
  }
}

module.exports = { pool, testConnection }
