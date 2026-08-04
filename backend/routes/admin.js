// routes/admin.js — platform oversight
const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authRequired, requireRole } = require('../middleware/auth')
const { sendEmail, emailTemplates } = require('../email')
const { buildPdf, sectionTitle, statsGrid, drawTable } = require('../pdf')

// GET /api/admin/stats
router.get('/stats', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [[{ total_users }]] = await pool.query('SELECT COUNT(*) AS total_users FROM users')
    const [[{ total_students }]] = await pool.query("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'")
    const [[{ total_companies }]] = await pool.query("SELECT COUNT(*) AS total_companies FROM users WHERE role = 'company'")
    const [[{ total_internships }]] = await pool.query('SELECT COUNT(*) AS total_internships FROM internships')
    const [[{ open_internships }]] = await pool.query("SELECT COUNT(*) AS open_internships FROM internships WHERE status = 'open' AND is_approved = 1")
    const [[{ total_applications }]] = await pool.query('SELECT COUNT(*) AS total_applications FROM applications')
    const [[{ pending_applications }]] = await pool.query("SELECT COUNT(*) AS pending_applications FROM applications WHERE status = 'pending'")
    const [[{ accepted_applications }]] = await pool.query("SELECT COUNT(*) AS accepted_applications FROM applications WHERE status = 'accepted'")
    const [[{ pending_companies }]] = await pool.query("SELECT COUNT(*) AS pending_companies FROM company_profiles WHERE status = 'pending'")
    const [[{ pending_internships }]] = await pool.query('SELECT COUNT(*) AS pending_internships FROM internships WHERE is_approved = 0')
    const [[{ suspended_users }]] = await pool.query('SELECT COUNT(*) AS suspended_users FROM users WHERE is_active = 0')

    const [statusBuckets] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM applications GROUP BY status'
    )

    const [recent] = await pool.query(
      `SELECT a.id, a.status, a.created_at,
              u.name AS student_name, u.email AS student_email,
              i.title AS internship_title, cp.company_name
       FROM applications a
       JOIN student_profiles sp ON sp.id = a.student_id
       JOIN users u ON u.id = sp.user_id
       JOIN internships i ON i.id = a.internship_id
       JOIN company_profiles cp ON cp.id = i.company_id
       ORDER BY a.created_at DESC
       LIMIT 8`
    )

    res.json({
      stats: {
        total_users, total_students, total_companies,
        total_internships, open_internships,
        total_applications, pending_applications, accepted_applications,
        pending_companies, pending_internships, suspended_users,
      },
      status_buckets: statusBuckets,
      recent_applications: recent,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/users
router.get('/users', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
              sp.course, sp.profile_complete AS student_complete,
              cp.company_name, cp.industry, cp.status AS company_status, cp.profile_complete AS company_complete
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN company_profiles cp ON cp.user_id = u.id
       ORDER BY u.created_at DESC`
    )
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/users/:id/suspend
router.post('/users/:id/suspend', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, role FROM users WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'User not found' })
    if (rows[0].role === 'admin') return res.status(400).json({ message: 'Cannot suspend an admin' })
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id])
    res.json({ message: 'User suspended' })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/users/:id/activate
router.post('/users/:id/activate', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id])
    if (!rows.length) return res.status(404).json({ message: 'User not found' })
    await pool.query('UPDATE users SET is_active = 1 WHERE id = ?', [req.params.id])
    res.json({ message: 'User activated' })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/pending-companies
router.get('/pending-companies', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [companies] = await pool.query(
      `SELECT cp.id, cp.company_name, cp.industry, cp.description, cp.website, cp.location, cp.status, cp.created_at,
              u.name AS user_name, u.email AS user_email
       FROM company_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.status = 'pending'
       ORDER BY cp.created_at DESC`
    )
    res.json({ companies })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/companies/:id/approve
router.post('/companies/:id/approve', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.id, cp.company_name, u.name AS user_name, u.email
       FROM company_profiles cp JOIN users u ON u.id = cp.user_id WHERE cp.id = ?`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Company not found' })
    await pool.query("UPDATE company_profiles SET status = 'approved' WHERE id = ?", [req.params.id])
    sendEmail({
      to: rows[0].email,
      ...emailTemplates().adminNotification(
        'Company approved',
        `<p>Hi ${rows[0].user_name},</p>
         <p>Your company <strong>${rows[0].company_name}</strong> has been approved! You can now post internships and review applicants.</p>
         <p><a href="http://localhost:${process.env.PORT || 5000}/pages/company-dashboard.html" style="color:#059669;">Go to your dashboard</a></p>`
      ),
    })
    res.json({ message: 'Company approved' })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/companies/:id/reject
router.post('/companies/:id/reject', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT cp.id, cp.company_name, u.name AS user_name, u.email
       FROM company_profiles cp JOIN users u ON u.id = cp.user_id WHERE cp.id = ?`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Company not found' })
    await pool.query("UPDATE company_profiles SET status = 'rejected' WHERE id = ?", [req.params.id])
    sendEmail({
      to: rows[0].email,
      ...emailTemplates().adminNotification(
        'Company registration not approved',
        `<p>Hi ${rows[0].user_name},</p>
         <p>Unfortunately, your company <strong>${rows[0].company_name}</strong> registration was not approved at this time. Please contact the administrator for more information.</p>`
      ),
    })
    res.json({ message: 'Company rejected' })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/pending-internships
router.get('/pending-internships', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [internships] = await pool.query(
      `SELECT i.*, cp.company_name, u.name AS company_user_name, u.email AS company_email,
              (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS application_count
       FROM internships i
       JOIN company_profiles cp ON cp.id = i.company_id
       JOIN users u ON u.id = cp.user_id
       WHERE i.is_approved = 0
       ORDER BY i.created_at DESC`
    )
    res.json({ internships })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/internships/:id/approve
router.post('/internships/:id/approve', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.title, u.name AS company_name, u.email
       FROM internships i
       JOIN company_profiles cp ON cp.id = i.company_id
       JOIN users u ON u.id = cp.user_id
       WHERE i.id = ?`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Internship not found' })
    await pool.query('UPDATE internships SET is_approved = 1 WHERE id = ?', [req.params.id])
    sendEmail({
      to: rows[0].email,
      ...emailTemplates().adminNotification(
        'Internship approved',
        `<p>Hi ${rows[0].company_name},</p>
         <p>Your internship posting <strong>"${rows[0].title}"</strong> has been approved and is now live for students to view and apply.</p>`
      ),
    })
    res.json({ message: 'Internship approved' })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/internships/:id/reject
router.post('/internships/:id/reject', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.title, u.name AS company_name, u.email
       FROM internships i
       JOIN company_profiles cp ON cp.id = i.company_id
       JOIN users u ON u.id = cp.user_id
       WHERE i.id = ?`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Internship not found' })
    await pool.query("UPDATE internships SET status = 'closed', is_approved = 0 WHERE id = ?", [req.params.id])
    sendEmail({
      to: rows[0].email,
      ...emailTemplates().adminNotification(
        'Internship not approved',
        `<p>Hi ${rows[0].company_name},</p>
         <p>Your internship posting <strong>"${rows[0].title}"</strong> was not approved. Please review the guidelines and contact the administrator.</p>`
      ),
    })
    res.json({ message: 'Internship rejected' })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/internships
router.get('/internships', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [internships] = await pool.query(
      `SELECT i.*, cp.company_name, u.name AS company_user_name, u.email AS company_email,
              (SELECT COUNT(*) FROM applications a WHERE a.internship_id = i.id) AS application_count
       FROM internships i
       JOIN company_profiles cp ON cp.id = i.company_id
       JOIN users u ON u.id = cp.user_id
       ORDER BY i.created_at DESC`
    )
    res.json({ internships })
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/applications
router.get('/applications', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [applications] = await pool.query(
      `SELECT a.*, u.name AS student_name, u.email AS student_email,
              sp.course, sp.skills, sp.cv_file_name,
              i.title AS internship_title, cp.company_name
       FROM applications a
       JOIN student_profiles sp ON sp.id = a.student_id
       JOIN users u ON u.id = sp.user_id
       JOIN internships i ON i.id = a.internship_id
       JOIN company_profiles cp ON cp.id = i.company_id
       ORDER BY a.created_at DESC`
    )
    res.json({ applications })
  } catch (err) {
    next(err)
  }
})

// ==================== Reports data helpers ====================
async function getOverviewData() {
  const [[{ total_students }]] = await pool.query("SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'")
  const [[{ placed_students }]] = await pool.query(
    'SELECT COUNT(DISTINCT a.student_id) AS placed_students FROM applications a WHERE a.status = ?',
    ['accepted']
  )
  const [[{ total_applications }]] = await pool.query('SELECT COUNT(*) AS total_applications FROM applications')
  const [[{ accepted_applications }]] = await pool.query(
    'SELECT COUNT(*) AS accepted_applications FROM applications WHERE status = ?',
    ['accepted']
  )
  const [[{ total_internships }]] = await pool.query('SELECT COUNT(*) AS total_internships FROM internships')
  const [[{ open_internships }]] = await pool.query(
    'SELECT COUNT(*) AS open_internships FROM internships WHERE status = ? AND is_approved = 1',
    ['open']
  )
  const [[{ avg_apps }]] = await pool.query(
    'SELECT COALESCE(AVG(cnt), 0) AS avg_apps FROM (SELECT COUNT(*) AS cnt FROM applications GROUP BY internship_id) t'
  )

  const [funnel] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM applications
     GROUP BY status
     ORDER BY FIELD(status, ?, ?, ?, ?, ?)`,
    ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected']
  )

  const [byCourse] = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(sp.course), ''), 'Not specified') AS course,
            COUNT(*) AS applications,
            COALESCE(SUM(a.status = ?), 0) AS placements
     FROM applications a
     JOIN student_profiles sp ON sp.id = a.student_id
     GROUP BY course
     ORDER BY applications DESC
     LIMIT 10`,
    ['accepted']
  )

  const [byIndustry] = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(cp.industry), ''), 'Not specified') AS industry,
            COUNT(DISTINCT i.id) AS internships,
            COUNT(a.id) AS applications,
            COALESCE(SUM(a.status = ?), 0) AS placements
     FROM company_profiles cp
     LEFT JOIN internships i ON i.company_id = cp.id
     LEFT JOIN applications a ON a.internship_id = i.id
     WHERE cp.status = 'approved'
     GROUP BY industry
     HAVING internships > 0 OR applications > 0
     ORDER BY applications DESC
     LIMIT 10`,
    ['accepted']
  )

  const [monthly] = await pool.query(
    `SELECT DATE_FORMAT(a.created_at, '%Y-%m') AS month,
            COUNT(*) AS applications,
            COALESCE(SUM(a.status = ?), 0) AS placements
     FROM applications a
     WHERE a.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY DATE_FORMAT(a.created_at, '%Y-%m')
     ORDER BY month ASC`,
    ['accepted']
  )

  const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)

  return {
    stats: {
      total_students,
      placed_students,
      unplaced_students: total_students - placed_students,
      placement_rate: pct(placed_students, total_students),
      total_applications,
      accepted_applications,
      acceptance_rate: pct(accepted_applications, total_applications),
      total_internships,
      open_internships,
      avg_applications_per_internship: Math.round(avg_apps * 10) / 10,
    },
    funnel,
    by_course: byCourse,
    by_industry: byIndustry,
    monthly,
  }
}

async function getApplicationsRows(filters = {}) {
  const where = []
  const params = []
  if (filters.status) { where.push('a.status = ?'); params.push(filters.status) }
  if (filters.from) { where.push('a.created_at >= ?'); params.push(filters.from) }
  if (filters.to) { where.push('a.created_at <= ?'); params.push(filters.to) }

  const [rows] = await pool.query(
    `SELECT a.id, a.status, a.created_at AS date,
            u.name AS student_name, u.email AS student_email,
            sp.course, sp.skills,
            i.title AS internship_title,
            cp.company_name
     FROM applications a
     JOIN student_profiles sp ON sp.id = a.student_id
     JOIN users u ON u.id = sp.user_id
     JOIN internships i ON i.id = a.internship_id
     JOIN company_profiles cp ON cp.id = i.company_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY a.created_at DESC`,
    params
  )
  return rows
}

async function getUsersRows() {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at AS date,
            sp.course,
            cp.company_name, cp.industry, cp.status AS company_status
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     LEFT JOIN company_profiles cp ON cp.user_id = u.id
     ORDER BY u.created_at DESC`
  )
  return rows
}

async function getPlacementsRows() {
  const [rows] = await pool.query(
    `SELECT a.id, a.created_at AS date,
            u.name AS student_name, u.email AS student_email, sp.course,
            i.title AS internship_title, cp.company_name, cp.industry
     FROM applications a
     JOIN student_profiles sp ON sp.id = a.student_id
     JOIN users u ON u.id = sp.user_id
     JOIN internships i ON i.id = a.internship_id
     JOIN company_profiles cp ON cp.id = i.company_id
     WHERE a.status = 'accepted'
     ORDER BY a.created_at DESC`
  )
  return rows
}

async function getIndustryTrendsRows() {
  const [rows] = await pool.query(
    `SELECT COALESCE(NULLIF(TRIM(cp.industry), ''), 'Not specified') AS industry,
            COUNT(DISTINCT i.id) AS internships,
            COUNT(a.id) AS applications,
            COALESCE(SUM(a.status = 'accepted'), 0) AS placements
     FROM company_profiles cp
     LEFT JOIN internships i ON i.company_id = cp.id
     LEFT JOIN applications a ON a.internship_id = i.id
     WHERE cp.status = 'approved'
     GROUP BY industry
     HAVING internships > 0 OR applications > 0
     ORDER BY applications DESC`
  )
  return rows
}

// ==================== Reports endpoints ====================

const ratePct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0)
const generatedAt = () => 'Generated ' + new Date().toLocaleString() + ' — PlacementHub administrators'

async function pdfReport(res, filename, title, build, opts = {}) {
  const buf = await buildPdf(title, generatedAt(), build, opts)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)
  res.send(buf)
}

// GET /api/admin/reports/overview
router.get('/reports/overview', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    res.json(await getOverviewData())
  } catch (err) {
    next(err)
  }
})

// CSV export: /api/admin/reports/applications?status=&from=&to=
router.get('/reports/applications', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getApplicationsRows(req.query)

    const header = 'ID,Student,Email,Course,Skills,Internship,Company,Status,Date'
    const csv = rows.map(r =>
      `"${r.id}","${csvEscape(r.student_name)}","${r.student_email}","${csvEscape(r.course)}","${csvEscape(r.skills)}","${csvEscape(r.internship_title)}","${csvEscape(r.company_name)}","${r.status}","${r.date}"`
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=applications.csv')
    res.send(header + '\n' + csv)
  } catch (err) {
    next(err)
  }
})

// CSV export: /api/admin/reports/users
router.get('/reports/users', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getUsersRows()

    const header = 'ID,Name,Email,Role,Active,Course/Company,Industry,Company Status,Date'
    const csv = rows.map(r =>
      `"${r.id}","${csvEscape(r.name)}","${r.email}","${r.role}","${r.is_active ? 'Yes' : 'No'}","${csvEscape(r.course || r.company_name || '')}","${csvEscape(r.industry || '')}","${r.company_status || ''}","${r.date}"`
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv')
    res.send(header + '\n' + csv)
  } catch (err) {
    next(err)
  }
})

// CSV export: /api/admin/reports/placements
router.get('/reports/placements', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getPlacementsRows()

    const header = 'ID,Student,Email,Course,Internship,Company,Industry,Date'
    const csv = rows.map(r =>
      `"${r.id}","${csvEscape(r.student_name)}","${r.student_email}","${csvEscape(r.course)}","${csvEscape(r.internship_title)}","${csvEscape(r.company_name)}","${csvEscape(r.industry)}","${r.date}"`
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=placements.csv')
    res.send(header + '\n' + csv)
  } catch (err) {
    next(err)
  }
})

// CSV export: /api/admin/reports/industry-trends
router.get('/reports/industry-trends', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getIndustryTrendsRows()

    const header = 'Industry,Internships,Applications,Placements,Placement Rate'
    const csv = rows.map(r =>
      `"${csvEscape(r.industry)}","${r.internships}","${r.applications}","${r.placements}","${ratePct(r.placements, r.applications)}%"`
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=industry-trends.csv')
    res.send(header + '\n' + csv)
  } catch (err) {
    next(err)
  }
})

// PDF export: /api/admin/reports/overview/pdf — full placement + industry trends report
router.get('/reports/overview/pdf', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const d = await getOverviewData()
    const s = d.stats
    const pctOfTotal = (n) => (s.total_applications > 0 ? Math.round((n / s.total_applications) * 100) : 0)

    await pdfReport(res, 'placement-trends-report.pdf', 'PlacementHub — Placement & Industry Trends Report', (doc) => {
      sectionTitle(doc, 'Key metrics')
      statsGrid(doc, [
        { label: 'Placement rate', value: s.placement_rate + '%' },
        { label: 'Acceptance rate', value: s.acceptance_rate + '%' },
        { label: 'Students placed', value: s.placed_students + ' / ' + s.total_students },
        { label: 'Unplaced students', value: s.unplaced_students, color: s.unplaced_students > 0 ? '#d97706' : '#059669' },
        { label: 'Applications', value: s.total_applications },
        { label: 'Accepted applications', value: s.accepted_applications },
        { label: 'Open internships', value: s.open_internships + ' / ' + s.total_internships },
        { label: 'Avg apps / internship', value: s.avg_applications_per_internship },
      ], 4)

      sectionTitle(doc, 'Placement funnel')
      drawTable(doc,
        ['Status', 'Count', '% of total'],
        d.funnel.map(f => [f.status, f.count, pctOfTotal(f.count) + '%']),
        [0.4, 0.3, 0.3]
      )

      sectionTitle(doc, 'Placement rate by course')
      drawTable(doc,
        ['Course', 'Applications', 'Placements', 'Rate'],
        d.by_course.map(c => [c.course, c.applications, c.placements, ratePct(c.placements, c.applications) + '%']),
        [0.4, 0.2, 0.2, 0.2]
      )

      sectionTitle(doc, 'Industry trends')
      drawTable(doc,
        ['Industry', 'Internships', 'Applications', 'Placements', 'Rate'],
        d.by_industry.map(i => [i.industry, i.internships, i.applications, i.placements, ratePct(i.placements, i.applications) + '%']),
        [0.28, 0.18, 0.18, 0.18, 0.18]
      )

      sectionTitle(doc, 'Monthly activity (last 6 months)')
      drawTable(doc,
        ['Month', 'Applications', 'Placements'],
        d.monthly.map(m => [m.month, m.applications, m.placements]),
        [0.4, 0.3, 0.3]
      )
    })
  } catch (err) {
    next(err)
  }
})

// PDF export: /api/admin/reports/applications/pdf
router.get('/reports/applications/pdf', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getApplicationsRows()
    await pdfReport(res, 'applications.pdf', 'Applications Report', (doc) => {
      drawTable(doc,
        ['ID', 'Student', 'Email', 'Course', 'Skills', 'Internship', 'Company', 'Status', 'Date'],
        rows.map(r => [r.id, r.student_name, r.student_email, r.course, r.skills, r.internship_title, r.company_name, r.status, r.date]),
        [0.08, 0.15, 0.15, 0.10, 0.10, 0.16, 0.14, 0.07, 0.05]
      )
    }, { layout: 'landscape' })
  } catch (err) {
    next(err)
  }
})

// PDF export: /api/admin/reports/users/pdf
router.get('/reports/users/pdf', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getUsersRows()
    await pdfReport(res, 'users.pdf', 'Users Report', (doc) => {
      drawTable(doc,
        ['ID', 'Name', 'Email', 'Role', 'Active', 'Course/Company', 'Industry', 'Company Status', 'Date'],
        rows.map(r => [r.id, r.name, r.email, r.role, r.is_active ? 'Yes' : 'No', r.course || r.company_name || '', r.industry || '', r.company_status || '', r.date]),
        [0.08, 0.15, 0.16, 0.08, 0.07, 0.16, 0.14, 0.10, 0.06]
      )
    }, { layout: 'landscape' })
  } catch (err) {
    next(err)
  }
})

// PDF export: /api/admin/reports/placements/pdf
router.get('/reports/placements/pdf', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getPlacementsRows()
    await pdfReport(res, 'placements.pdf', 'Placements Report', (doc) => {
      drawTable(doc,
        ['ID', 'Student', 'Email', 'Course', 'Internship', 'Company', 'Industry', 'Date'],
        rows.map(r => [r.id, r.student_name, r.student_email, r.course, r.internship_title, r.company_name, r.industry, r.date]),
        [0.08, 0.15, 0.16, 0.12, 0.18, 0.14, 0.13, 0.04]
      )
    }, { layout: 'landscape' })
  } catch (err) {
    next(err)
  }
})

// PDF export: /api/admin/reports/industry-trends/pdf
router.get('/reports/industry-trends/pdf', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const rows = await getIndustryTrendsRows()
    await pdfReport(res, 'industry-trends.pdf', 'Industry Trends Report', (doc) => {
      drawTable(doc,
        ['Industry', 'Internships', 'Applications', 'Placements', 'Placement Rate'],
        rows.map(r => [r.industry, r.internships, r.applications, r.placements, ratePct(r.placements, r.applications) + '%']),
        [0.28, 0.18, 0.18, 0.18, 0.18]
      )
    })
  } catch (err) {
    next(err)
  }
})

function csvEscape(v) {
  if (!v) return ''
  return String(v).replace(/"/g, '""')
}

// GET /api/admin/unplaced — students with no accepted application
router.get('/unplaced', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const [students] = await pool.query(
      `SELECT sp.id AS profile_id, u.id AS user_id, u.name, u.email, sp.course, sp.skills, sp.cv_file_name
       FROM student_profiles sp
       JOIN users u ON u.id = sp.user_id
       WHERE u.is_active = 1
       AND sp.id NOT IN (
         SELECT a.student_id FROM applications a WHERE a.status = 'accepted'
       )
       ORDER BY u.name`
    )

    const [internships] = await pool.query(
      `SELECT i.id, i.title, cp.company_name FROM internships i
       JOIN company_profiles cp ON cp.id = i.company_id
       WHERE i.is_approved = 1 AND i.status = 'open'
       ORDER BY i.title`
    )

    res.json({ students, internships })
  } catch (err) {
    next(err)
  }
})

// POST /api/admin/placements — manually assign student to internship
router.post('/placements', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    const { student_profile_id, internship_id } = req.body
    if (!student_profile_id || !internship_id) {
      return res.status(400).json({ message: 'student_profile_id and internship_id are required' })
    }

    const [internship] = await pool.query('SELECT id, title FROM internships WHERE id = ?', [internship_id])
    if (!internship.length) return res.status(404).json({ message: 'Internship not found' })

    const [profile] = await pool.query('SELECT id, user_id FROM student_profiles WHERE id = ?', [student_profile_id])
    if (!profile.length) return res.status(404).json({ message: 'Student profile not found' })

    // Check no duplicate
    const [existing] = await pool.query(
      'SELECT id FROM applications WHERE student_id = ? AND internship_id = ?',
      [student_profile_id, internship_id]
    )
    if (existing.length) return res.status(400).json({ message: 'Student already applied to this internship' })

    await pool.query(
      'INSERT INTO applications (student_id, internship_id, cover_letter, status) VALUES (?,?,?,?)',
      [student_profile_id, internship_id, 'Admin-placed placement', 'accepted']
    )

    // Notify student
    const [studentUser] = await pool.query('SELECT name, email FROM users WHERE id = ?', [profile[0].user_id])
    sendEmail({
      to: studentUser[0].email,
      ...emailTemplates().adminNotification(
        'You have been placed!',
        `<p>Hi ${studentUser[0].name},</p>
         <p>An administrator has placed you in <strong>"${internship[0].title}"</strong>. Log in to your dashboard to view the details.</p>
         <p><a href="http://localhost:${process.env.PORT || 5000}/pages/student-dashboard.html" style="color:#059669;">Go to your dashboard</a></p>`
      ),
    })

    res.json({ message: 'Student placed successfully' })
  } catch (err) {
    next(err)
  }
})

module.exports = router
