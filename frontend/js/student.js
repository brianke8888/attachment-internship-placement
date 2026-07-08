// js/student.js — student dashboard, profile, and applications pages
import { api } from './api.js'
import {
  guard, renderShell, toast, escapeHtml, formatDate, relativeTime,
  deadlineBadge, statusBadge, skillsList, ICONS, navUrl,
} from './auth.js'

const user = await guard('student')
if (!user) throw new Error('redirecting')

const page = location.pathname.split('/').pop()

const NAV = [
  { id: 'dashboard', label: 'Overview', icon: ICONS.dashboard },
  { id: 'profile', label: 'My Profile', icon: ICONS.user },
  { id: 'browse', label: 'Browse Internships', icon: ICONS.search },
  { id: 'applications', label: 'My Applications', icon: ICONS.file },
]

const NAV_TARGETS = {
  dashboard: navUrl('student-dashboard.html'),
  profile: navUrl('student-profile.html'),
  browse: navUrl('browse-internships.html'),
  applications: navUrl('my-applications.html'),
}

function navId() {
  if (page === 'student-dashboard.html') return 'dashboard'
  if (page === 'student-profile.html') return 'profile'
  if (page === 'my-applications.html') return 'applications'
  return 'dashboard'
}

renderShell({
  role: 'student',
  activeId: navId(),
  navItems: NAV,
  userName: user.name,
  userEmail: user.email,
  onNavigate: (id) => { window.location.href = NAV_TARGETS[id] },
})

const content = document.getElementById('content')

if (page === 'student-dashboard.html') {
  initDashboard()
} else if (page === 'student-profile.html') {
  initProfile()
} else if (page === 'my-applications.html') {
  initApplications()
}

// ---------------- Dashboard ----------------
async function initDashboard() {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Welcome, ${escapeHtml(user.name.split(' ')[0])}</h1>
        <p class="page-subtitle">Track your profile, applications, and discover new opportunities.</p>
      </div>
    </div>
    <div class="loading-wrap"><div class="spinner spinner-lg"></div></div>
  `
  try {
    const { profile, applications } = await api.getStudentProfile()
    const stats = {
      total: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      reviewed: applications.filter(a => a.status === 'reviewed' || a.status === 'shortlisted').length,
      accepted: applications.filter(a => a.status === 'accepted').length,
    }

    let profileAlert = ''
    if (!profile.profile_complete) {
      profileAlert = `
        <div class="alert alert-warning">
          <div class="alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div class="alert-content">
            <div class="alert-title">Complete your profile</div>
            <div class="alert-text">You need a complete profile before you can apply to internships.</div>
          </div>
          <button class="btn btn-primary" onclick="location.href='${navUrl('student-profile.html')}'">Complete now</button>
        </div>`
    }

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Welcome, ${escapeHtml(user.name.split(' ')[0])}</h1>
          <p class="page-subtitle">Track your profile, applications, and discover new opportunities.</p>
        </div>
      </div>
      ${profileAlert}
      <div class="stats-grid stagger">
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Applications</span><div class="stat-card-icon emerald">${ICONS.file}</div></div><div class="stat-card-value">${stats.total}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Pending</span><div class="stat-card-icon amber">${ICONS.file}</div></div><div class="stat-card-value">${stats.pending}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">In Review</span><div class="stat-card-icon sky">${ICONS.search}</div></div><div class="stat-card-value">${stats.reviewed}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Accepted</span><div class="stat-card-icon violet">${ICONS.user}</div></div><div class="stat-card-value">${stats.accepted}</div></div>
      </div>
      <div class="grid grid-2 stagger">
        <div class="card">
          <div class="card-header"><div class="card-title">Recent applications</div><div class="card-subtitle">Your latest internship applications</div></div>
          <div class="card-body">
            ${applications.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">${ICONS.file}</div>
                <div class="empty-state-title">No applications yet</div>
                <div class="empty-state-text">Browse open internships and submit your first application.</div>
                <div class="empty-state-action"><button class="btn btn-primary" onclick="location.href='${navUrl('browse-internships.html')}'">Browse internships</button></div>
              </div>` : `
              ${applications.slice(0, 5).map(a => `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">
                  <div style="min-width:0;">
                    <div style="font-weight:500;truncate;">${escapeHtml(a.internship_title)}</div>
                    <div class="text-xs muted">${escapeHtml(a.company_name)}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    ${statusBadge(a.status)}
                    <span class="text-xs subtle">${relativeTime(a.created_at)}</span>
                  </div>
                </div>`).join('')}
            `}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Profile snapshot</div></div>
          <div class="card-body">
            <div style="margin-bottom:12px;"><div class="text-xs subtle" style="text-transform:uppercase;">Course</div><div style="font-weight:500;">${escapeHtml(profile.course) || '—'}</div></div>
            <div style="margin-bottom:12px;"><div class="text-xs subtle" style="text-transform:uppercase;">Skills</div>${profile.skills ? `<div style="margin-top:4px;">${skillsList(profile.skills)}</div>` : '<div class="muted">—</div>'}</div>
            <div style="margin-bottom:16px;"><div class="text-xs subtle" style="text-transform:uppercase;">CV</div>${profile.cv_file_name ? `<a href="http://localhost:5000/uploads/${encodeURIComponent(profile.cv_file_name)}" target="_blank" class="text-sm" style="display:inline-flex;align-items:center;gap:4px;">View CV</a>` : '<div class="muted">Not uploaded</div>'}</div>
            <button class="btn btn-outline btn-block" onclick="location.href='${navUrl('student-profile.html')}'">Edit profile</button>
          </div>
        </div>
      </div>
    `
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ---------------- Profile ----------------
async function initProfile() {
  content.innerHTML = `<div class="loading-wrap"><div class="spinner spinner-lg"></div></div>`
  try {
    const { profile } = await api.getStudentProfile()
    content.innerHTML = `
      <div style="max-width:720px;margin:0 auto;">
        <div class="page-header">
          <div>
            <h1 class="page-title">My Profile</h1>
            <p class="page-subtitle">Keep your profile up to date so companies can find and review you.</p>
          </div>
        </div>
        <form id="profile-form">
          <div class="card">
            <div class="card-header"><div class="card-title">Student details</div><div class="card-subtitle">This information is shared with companies when you apply.</div></div>
            <div class="card-body">
              <div class="grid grid-2" style="grid-template-columns:1fr;">
                <div class="form-group"><label class="form-label">Course <span class="req">*</span></label><input type="text" class="form-input" id="course" value="${escapeHtml(profile.course)}" required /></div>
                <div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" id="phone" value="${escapeHtml(profile.phone)}" /></div>
              </div>
              <div class="form-group">
                <label class="form-label">Skills <span class="req">*</span> (comma separated)</label>
                <input type="text" class="form-input" id="skills" value="${escapeHtml(profile.skills)}" required placeholder="JavaScript, React, Node.js, SQL" />
              </div>
              <div class="form-group">
                <label class="form-label">Short bio</label>
                <textarea class="form-textarea" id="bio" placeholder="A short paragraph about yourself.">${escapeHtml(profile.bio)}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">CV / Resume (PDF, DOC, DOCX — max 5MB)</label>
                <input type="file" class="form-input" id="cv" accept=".pdf,.doc,.docx" />
                ${profile.cv_file_name ? `<div class="form-hint">Current CV: <a href="http://localhost:5000/uploads/${encodeURIComponent(profile.cv_file_name)}" target="_blank">View</a> (uploading a new file replaces it)</div>` : ''}
              </div>
            </div>
            <div class="card-footer">
              <button type="submit" class="btn btn-primary" id="save-btn">Save profile</button>
            </div>
          </div>
        </form>
      </div>
    `
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = document.getElementById('save-btn')
      btn.disabled = true
      btn.textContent = 'Saving...'
      try {
        const fd = new FormData()
        fd.append('course', document.getElementById('course').value)
        fd.append('skills', document.getElementById('skills').value)
        fd.append('phone', document.getElementById('phone').value)
        fd.append('bio', document.getElementById('bio').value)
        const cv = document.getElementById('cv').files[0]
        if (cv) fd.append('cv', cv)
        await api.saveStudentProfile(fd)
        toast('Profile saved', 'Your student profile is now up to date.')
        setTimeout(() => location.reload(), 600)
      } catch (err) {
        toast('Failed to save', err.message, 'error')
        btn.disabled = false
        btn.textContent = 'Save profile'
      }
    })
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ---------------- Applications ----------------
async function initApplications() {
  content.innerHTML = `<div class="loading-wrap"><div class="spinner spinner-lg"></div></div>`
  try {
    const { applications } = await api.getStudentProfile()
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">My Applications</h1>
          <p class="page-subtitle">Track the status of every internship you've applied to.</p>
        </div>
      </div>
      ${applications.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${ICONS.file}</div>
          <div class="empty-state-title">No applications yet</div>
          <div class="empty-state-text">When you apply to internships, they will appear here.</div>
          <div class="empty-state-action"><button class="btn btn-primary" onclick="location.href='${navUrl('browse-internships.html')}'">Browse internships</button></div>
        </div>` : applications.map(a => `
        <div class="card" style="margin-bottom:12px;">
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <h3 style="font-size:16px;font-weight:600;">${escapeHtml(a.internship_title)}</h3>
                  ${statusBadge(a.status)}
                </div>
                <div class="text-sm muted mt-1">${escapeHtml(a.company_name)}</div>
                <div class="text-xs subtle mt-2">Applied ${relativeTime(a.created_at)}</div>
                ${a.cover_letter ? `<div class="mt-3" style="padding:12px;background:var(--surface-alt);border-radius:8px;"><div class="text-xs subtle" style="text-transform:uppercase;font-weight:600;margin-bottom:4px;">Cover letter</div><div class="text-sm">${escapeHtml(a.cover_letter)}</div></div>` : ''}
              </div>
              <div>
                ${(a.status === 'pending' || a.status === 'reviewed') ? `<button class="btn btn-outline btn-sm withdraw-btn" data-id="${a.id}" style="color:var(--rose);">Withdraw</button>` : ''}
              </div>
            </div>
          </div>
        </div>`).join('')}
    `

    document.querySelectorAll('.withdraw-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Withdraw this application?')) return
        btn.disabled = true
        try {
          await api.withdrawApplication(btn.dataset.id)
          toast('Application withdrawn')
          setTimeout(() => location.reload(), 600)
        } catch (err) {
          toast('Failed', err.message, 'error')
          btn.disabled = false
        }
      })
    })
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}
