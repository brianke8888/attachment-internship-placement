// db.js — MySQL connection pool
const mysql = require('mysql2/promise')
require('dotenv').config()

const isRailway = !!process.env.MYSQLHOST

const poolConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'attachment_internship',
  port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
}

if (isRailway || process.env.DB_SSL === 'true' || process.env.MYSQL_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false }
}

const pool = mysql.createPool(poolConfig)

async function testConnection() {
  try {
    console.log('Connecting to MySQL at', poolConfig.host + ':' + poolConfig.port, 'as', poolConfig.user, 'db:', poolConfig.database)
    const conn = await pool.getConnection()
    await conn.ping()
    conn.release()
    console.log('Connected to MySQL database:', poolConfig.database)
  } catch (err) {
    console.error('MySQL connection failed:', err.message)
    console.error('Check your .env credentials and that MySQL is running.')
    process.exit(1)
  }
}

module.exports = { pool, testConnection }
