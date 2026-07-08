// js/admin.js — admin dashboard with all oversight features
import { api } from './api.js'
import {
  guard, renderShell, toast, escapeHtml, formatDate, relativeTime, deadlineBadge,
  statusBadge, skillsList, ICONS,
} from './auth.js'

const user = await guard('admin')
if (!user) throw new Error('redirecting')

const NAV = [
  { id: 'overview', label: 'Overview', icon: ICONS.trending },
  { id: 'companies', label: 'Companies', icon: ICONS.briefcase },
  { id: 'internships', label: 'Internships', icon: ICONS.briefcase },
  { id: 'users', label: 'Users', icon: ICONS.users },
  { id: 'applications', label: 'Applications', icon: ICONS.file },
  { id: 'placement', label: 'Placement', icon: ICONS.user },
  { id: 'reports', label: 'Reports', icon: ICONS.file },
]

let currentView = 'overview'

renderShell({
  role: 'admin',
  activeId: currentView,
  navItems: NAV,
  userName: user.name,
  userEmail: user.email,
  onNavigate: (id) => { currentView = id; updateNav(); loadView() },
})

const content = document.getElementById('content')

function updateNav() {
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === currentView))
}

function loadView() {
  content.innerHTML = `<div class="loading-wrap"><div class="spinner spinner-lg"></div></div>`
  if (currentView === 'overview') loadOverview()
  else if (currentView === 'companies') loadCompanies()
  else if (currentView === 'internships') loadInternships()
  else if (currentView === 'users') loadUsers()
  else if (currentView === 'applications') loadApplications()
  else if (currentView === 'placement') loadPlacement()
  else if (currentView === 'reports') loadReports()
}

// ==================== OVERVIEW ====================
async function loadOverview() {
  try {
    const data = await api.getAdminStats()
    const s = data.stats
    const buckets = data.status_buckets
    const maxBucket = Math.max(1, ...buckets.map(b => b.count))
    const bucketMap = {}
    buckets.forEach(b => bucketMap[b.status] = b.count)

    content.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Admin Overview</h1><p class="page-subtitle">Platform-wide metrics and pending actions.</p></div>
      </div>
      ${s.pending_companies > 0 || s.pending_internships > 0 ? `
        <div class="alert alert-amber" style="margin-bottom:16px;">
          <strong>Pending actions:</strong>
          ${s.pending_companies > 0 ? `${s.pending_companies} company signup${s.pending_companies > 1 ? 's' : ''} awaiting approval. ` : ''}
          ${s.pending_internships > 0 ? `${s.pending_internships} internship${s.pending_internships > 1 ? 's' : ''} awaiting approval. ` : ''}
          <a href="#" onclick="document.querySelector('[data-nav=\\'companies\\']')?.click()" style="color:var(--primary);">Review now</a>
        </div>` : ''}
      <div class="stats-grid stagger">
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Total users</span><div class="stat-card-icon violet">${ICONS.users}</div></div><div class="stat-card-value">${s.total_users}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Students</span><div class="stat-card-icon emerald">${ICONS.user}</div></div><div class="stat-card-value">${s.total_students}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Companies</span><div class="stat-card-icon sky">${ICONS.briefcase}</div></div><div class="stat-card-value">${s.total_companies}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Suspended</span><div class="stat-card-icon amber">${ICONS.user}</div></div><div class="stat-card-value">${s.suspended_users}</div></div>
      </div>
      <div class="stats-grid stagger">
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Pending companies</span><div class="stat-card-icon amber">${ICONS.briefcase}</div></div><div class="stat-card-value">${s.pending_companies}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Pending internships</span><div class="stat-card-icon amber">${ICONS.briefcase}</div></div><div class="stat-card-value">${s.pending_internships}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Open internships</span><div class="stat-card-icon emerald">${ICONS.briefcase}</div></div><div class="stat-card-value">${s.open_internships}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Accepted placements</span><div class="stat-card-icon emerald">${ICONS.file}</div></div><div class="stat-card-value">${s.accepted_applications}</div></div>
      </div>
      <div class="grid grid-2 stagger">
        <div class="card">
          <div class="card-header"><div class="card-title">Applications by status</div></div>
          <div class="card-body">
            ${['pending','reviewed','shortlisted','accepted','rejected'].map(st => {
              const count = bucketMap[st] || 0
              const pct = Math.round((count / maxBucket) * 100)
              return `<div class="status-bar-row">
                <div class="status-bar-head"><span style="text-transform:capitalize;font-weight:500;">${st}</span><span class="muted">${count}</span></div>
                <div class="status-bar-track"><div class="status-bar-fill ${st}" style="width:${Math.max(2,pct)}%;"></div></div>
              </div>`
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Recent applications</div></div>
          <div class="card-body" style="max-height:360px;overflow-y:auto;">
            ${data.recent_applications.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">${ICONS.file}</div><div class="empty-state-title">No activity yet</div></div>` :
              data.recent_applications.map(a => `
                <div style="display:flex;justify-content:space-between;gap:8px;padding:8px;border-radius:6px;" class="hover-row">
                  <div style="min-width:0;">
                    <div class="text-sm" style="font-weight:500;">${escapeHtml(a.student_name)}</div>
                    <div class="text-xs muted">${escapeHtml(a.internship_title)}</div>
                    <div class="text-xs subtle">${relativeTime(a.created_at)}</div>
                  </div>
                  ${statusBadge(a.status)}
                </div>`).join('')}
          </div>
        </div>
      </div>
    `
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ==================== COMPANIES (with pending approval) ====================
async function loadCompanies() {
  try {
    const { users } = await api.getAdminUsers()
    const { companies: pending } = await api.getPendingCompanies()
    const companyUsers = users.filter(u => u.role === 'company')

    content.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Companies</h1><p class="page-subtitle">${pending.length} pending approval.</p></div>
      </div>
      ${pending.length > 0 ? `
        <div class="card" style="margin-bottom:16px;border-left:3px solid var(--amber);">
          <div class="card-header"><div class="card-title">Pending approval</div></div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Company</th><th>Contact</th><th>Industry</th><th>Location</th><th>Actions</th></tr></thead>
                <tbody>
                  ${pending.map(c => `
                    <tr>
                      <td><div style="font-weight:500;">${escapeHtml(c.company_name)}</div></td>
                      <td><div>${escapeHtml(c.user_name)}</div><div class="text-xs muted">${escapeHtml(c.user_email)}</div></td>
                      <td class="text-sm">${escapeHtml(c.industry || '—')}</td>
                      <td class="text-sm">${escapeHtml(c.location || '—')}</td>
                      <td>
                        <button class="btn btn-primary btn-sm" data-apr-comp="${c.id}">Approve</button>
                        <button class="btn btn-outline btn-sm" data-rej-comp="${c.id}" style="margin-left:4px;">Reject</button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>` : ''}
      <div class="card"><div class="card-body" style="padding:0;">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Company</th><th>Contact</th><th>Status</th><th>Internships</th><th>Joined</th></tr></thead>
            <tbody>
              ${companyUsers.map(u => {
                const status = u.company_status || 'approved'
                const badgeClass = status === 'approved' ? 'badge-emerald' : status === 'pending' ? 'badge-amber' : 'badge-rose'
                return `<tr>
                  <td><div style="font-weight:500;">${escapeHtml(u.company_name || u.name)}</div></td>
                  <td><div class="text-sm">${escapeHtml(u.email)}</div></td>
                  <td><span class="badge ${badgeClass}">${status}</span></td>
                  <td class="text-sm muted">${u.company_complete ? 'Complete' : 'Incomplete'}</td>
                  <td class="text-xs muted">${formatDate(u.created_at)}</td>
                </tr>`
              }).join('')}
            </tbody>
          </table>
        </div>
      </div></div>
    `

    // Wire approve/reject buttons
    document.querySelectorAll('[data-apr-comp]').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          await api.approveCompany(b.dataset.aprComp)
          toast('Company approved!')
          loadCompanies()
        } catch (e) { toast('Error', e.message, 'error') }
      })
    })
    document.querySelectorAll('[data-rej-comp]').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          await api.rejectCompany(b.dataset.rejComp)
          toast('Company rejected')
          loadCompanies()
        } catch (e) { toast('Error', e.message, 'error') }
      })
    })
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ==================== INTERNSHIPS (with pending moderation) ====================
async function loadInternships() {
  try {
    const { internships: all } = await api.getAdminInternships()
    const { internships: pending } = await api.getPendingInternships()
    const approved = all.filter(i => i.is_approved)

    content.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Internships</h1><p class="page-subtitle">${pending.length} pending moderation.</p></div>
      </div>
      ${pending.length > 0 ? `
        <div class="card" style="margin-bottom:16px;border-left:3px solid var(--amber);">
          <div class="card-header"><div class="card-title">Pending moderation (${pending.length})</div></div>
          <div class="card-body" style="padding:0;">
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>Title</th><th>Company</th><th>Category</th><th>Deadline</th><th>Actions</th></tr></thead>
                <tbody>
                  ${pending.map(i => `
                    <tr>
                      <td><div style="font-weight:500;">${escapeHtml(i.title)}</div>
                        <div class="text-xs muted" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(i.description)}</div>
                      </td>
                      <td class="text-sm">${escapeHtml(i.company_name)}</td>
                      <td><span class="badge badge-slate">${escapeHtml(i.category)}</span></td>
                      <td class="text-xs">${deadlineBadge(i.deadline)}</td>
                      <td>
                        <button class="btn btn-primary btn-sm" data-apr-int="${i.id}">Approve</button>
                        <button class="btn btn-outline btn-sm" data-rej-int="${i.id}" style="margin-left:4px;">Reject</button>
                      </td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>` : ''}
      <div class="grid grid-3">
        ${approved.map(i => `
          <div class="internship-card">
            <div class="internship-card-head">
              <div class="internship-card-title">${escapeHtml(i.title)}</div>
              <span class="badge ${i.status === 'open' ? 'badge-emerald' : 'badge-slate'}">${i.status}</span>
            </div>
            <div class="text-xs muted">${escapeHtml(i.company_name)}</div>
            <div class="internship-card-desc">${escapeHtml(i.description)}</div>
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <span class="badge badge-slate">${escapeHtml(i.category)}</span>
              ${deadlineBadge(i.deadline)}
              <span class="text-xs muted">${i.application_count} applicants</span>
            </div>
          </div>`).join('')}
        ${approved.length === 0 && pending.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">${ICONS.briefcase}</div><div class="empty-state-title">No internships posted</div></div>' : ''}
      </div>
    `

    document.querySelectorAll('[data-apr-int]').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          await api.approveInternship(b.dataset.aprInt)
          toast('Internship approved!')
          loadInternships()
        } catch (e) { toast('Error', e.message, 'error') }
      })
    })
    document.querySelectorAll('[data-rej-int]').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          await api.rejectInternship(b.dataset.rejInt)
          toast('Internship rejected')
          loadInternships()
        } catch (e) { toast('Error', e.message, 'error') }
      })
    })
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ==================== USERS ====================
async function loadUsers() {
  try {
    const { users } = await api.getAdminUsers()
    const roleBadge = (r) => {
      const map = { student: 'badge-emerald', company: 'badge-sky', admin: 'badge-violet' }
      return `<span class="badge ${map[r] || 'badge-slate'}">${r}</span>`
    }
    content.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">Users</h1><p class="page-subtitle">Manage all users — suspend or activate accounts.</p></div></div>
      <div class="card"><div class="card-body" style="padding:0;">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Profile</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><div style="font-weight:500;">${escapeHtml(u.name)}</div><div class="text-xs muted">${escapeHtml(u.email)}</div></td>
                  <td>${roleBadge(u.role)}</td>
                  <td><span class="badge ${u.is_active ? 'badge-emerald' : 'badge-rose'}">${u.is_active ? 'Active' : 'Suspended'}</span></td>
                  <td class="text-sm muted">${u.role === 'student' ? escapeHtml(u.course || '—') : u.role === 'company' ? escapeHtml(u.company_name || '—') : '—'}</td>
                  <td class="text-xs muted">${formatDate(u.created_at)}</td>
                  <td>
                    ${u.role !== 'admin' ? (u.is_active
                      ? `<button class="btn btn-outline btn-sm" data-sus="${u.id}">Suspend</button>`
                      : `<button class="btn btn-primary btn-sm" data-act="${u.id}">Activate</button>`
                    ) : '<span class="text-xs muted">—</span>'}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div></div>
    `

    document.querySelectorAll('[data-sus]').forEach(b => {
      b.addEventListener('click', async () => {
        if (!confirm('Suspend this user? They will not be able to log in.')) return
        try {
          await api.suspendUser(b.dataset.sus)
          toast('User suspended')
          loadUsers()
        } catch (e) { toast('Error', e.message, 'error') }
      })
    })
    document.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('click', async () => {
        try {
          await api.activateUser(b.dataset.act)
          toast('User activated')
          loadUsers()
        } catch (e) { toast('Error', e.message, 'error') }
      })
    })
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ==================== APPLICATIONS ====================
async function loadApplications() {
  try {
    const { applications } = await api.getAdminApplications()
    content.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">All Applications</h1><p class="page-subtitle">Every application submitted on the platform.</p></div></div>
      <div class="card"><div class="card-body" style="padding:0;">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Student</th><th>Internship</th><th>Company</th><th>Status</th><th>Applied</th><th>CV</th></tr></thead>
            <tbody>
              ${applications.map(a => `
                <tr>
                  <td><div style="font-weight:500;">${escapeHtml(a.student_name)}</div>${a.skills ? `<div style="margin-top:4px;">${skillsList(a.skills)}</div>` : ''}</td>
                  <td>${escapeHtml(a.internship_title)}</td>
                  <td class="muted">${escapeHtml(a.company_name)}</td>
                  <td>${statusBadge(a.status)}</td>
                  <td class="text-xs muted">${relativeTime(a.created_at)}</td>
                  <td>${a.cv_file_name ? `<a href="http://localhost:5000/uploads/${encodeURIComponent(a.cv_file_name)}" target="_blank" class="text-sm">View</a>` : '<span class="muted">—</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div></div>
    `
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ==================== PLACEMENT ====================
async function loadPlacement() {
  try {
    const { students, internships } = await api.getUnplacedStudents()
    content.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">Manual Placement</h1><p class="page-subtitle">Assign unplaced students to open internships.</p></div></div>
      <div class="grid grid-2 stagger">
        <div class="card">
          <div class="card-header"><div class="card-title">Unplaced students (${students.length})</div></div>
          <div class="card-body" style="max-height:400px;overflow-y:auto;">
            ${students.length === 0 ? '<div class="empty-state"><div class="empty-state-title">All students are placed!</div></div>' :
              students.map(s => `
                <label class="placement-row" data-sid="${s.profile_id}" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;cursor:pointer;" class="hover-row">
                  <input type="radio" name="placement-student" value="${s.profile_id}" style="accent-color:var(--primary);">
                  <div>
                    <div class="text-sm" style="font-weight:500;">${escapeHtml(s.name)}</div>
                    <div class="text-xs muted">${escapeHtml(s.course || '')} ${s.skills ? '— ' + escapeHtml(s.skills) : ''}</div>
                  </div>
                </label>
              `).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Open internships (${internships.length})</div></div>
          <div class="card-body" style="max-height:400px;overflow-y:auto;">
            ${internships.length === 0 ? '<div class="empty-state"><div class="empty-state-title">No open internships</div></div>' :
              internships.map(i => `
                <label class="placement-row" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;cursor:pointer;" class="hover-row">
                  <input type="radio" name="placement-internship" value="${i.id}" style="accent-color:var(--primary);">
                  <div>
                    <div class="text-sm" style="font-weight:500;">${escapeHtml(i.title)}</div>
                    <div class="text-xs muted">${escapeHtml(i.company_name)}</div>
                  </div>
                </label>
              `).join('')}
          </div>
        </div>
      </div>
      <div style="margin-top:16px;text-align:center;">
        <button class="btn btn-primary btn-lg" id="placement-submit">Place Student</button>
      </div>
    `

    document.getElementById('placement-submit').addEventListener('click', async () => {
      const studentInput = document.querySelector('input[name="placement-student"]:checked')
      const internshipInput = document.querySelector('input[name="placement-internship"]:checked')
      if (!studentInput || !internshipInput) {
        toast('Please select a student and an internship', '', 'error')
        return
      }
      if (!confirm('Place this student in this internship?')) return
      try {
        await api.createPlacement({
          student_profile_id: parseInt(studentInput.value),
          internship_id: parseInt(internshipInput.value),
        })
        toast('Student placed successfully!')
        loadPlacement()
      } catch (e) { toast('Error', e.message, 'error') }
    })
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ==================== REPORTS ====================
function loadReports() {
  content.innerHTML = `
    <div class="page-header"><div><h1 class="page-title">Reports</h1><p class="page-subtitle">Download CSV exports of platform data.</p></div></div>
    <div class="stats-grid stagger">
      <div class="card" style="cursor:pointer;" id="report-apps">
        <div class="card-body" style="text-align:center;padding:32px;">
          <div class="stat-card-value">${ICONS.file}</div>
          <div class="stat-card-label" style="margin-top:8px;font-size:16px;">Download Applications CSV</div>
          <p class="text-xs muted">All applications with student and company details</p>
        </div>
      </div>
      <div class="card" style="cursor:pointer;" id="report-users">
        <div class="card-body" style="text-align:center;padding:32px;">
          <div class="stat-card-value">${ICONS.users}</div>
          <div class="stat-card-label" style="margin-top:8px;font-size:16px;">Download Users CSV</div>
          <p class="text-xs muted">All registered users with profile info</p>
        </div>
      </div>
    </div>
  `

  document.getElementById('report-apps').addEventListener('click', () => {
    const token = localStorage.getItem('token')
    window.open(`http://localhost:5000/api/admin/reports/applications?${Date.now()}`, '_blank')
  })

  document.getElementById('report-users').addEventListener('click', () => {
    window.open(`http://localhost:5000/api/admin/reports/users?${Date.now()}`, '_blank')
  })
}

loadView()
