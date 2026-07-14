// js/company.js — company dashboard, profile, internships, applicants
import { api } from './api.js'
import {
  guard, renderShell, toast, escapeHtml, formatDate, relativeTime, deadlineBadge,
  statusBadge, skillsList, ICONS, navUrl,
} from './auth.js'

const user = await guard('company')
if (!user) throw new Error('redirecting')

const page = location.pathname.split('/').pop()

const NAV = [
  { id: 'dashboard', label: 'Overview', icon: ICONS.dashboard },
  { id: 'profile', label: 'Company Profile', icon: ICONS.user },
  { id: 'internships', label: 'My Internships', icon: ICONS.briefcase },
  { id: 'applicants', label: 'Applications', icon: ICONS.file },
]
const NAV_TARGETS = {
  dashboard: navUrl('company-dashboard.html'),
  profile: navUrl('company-profile.html'),
  internships: navUrl('my-internships.html'),
  applicants: navUrl('company-applicants.html'),
}

function navId() {
  if (page === 'company-dashboard.html') return 'dashboard'
  if (page === 'company-profile.html') return 'profile'
  if (page === 'my-internships.html') return 'internships'
  if (page === 'company-applicants.html') return 'applicants'
  return 'dashboard'
}

renderShell({
  role: 'company',
  activeId: navId(),
  navItems: NAV,
  userName: user.name,
  userEmail: user.email,
  onNavigate: (id) => { window.location.href = NAV_TARGETS[id] },
})

const content = document.getElementById('content')
const CATEGORIES = ['General', 'Software Engineering', 'Data', 'Design', 'Marketing', 'Finance', 'Operations', 'Research']

if (page === 'company-dashboard.html') initDashboard()
else if (page === 'company-profile.html') initProfile()
else if (page === 'my-internships.html') initInternships()
else if (page === 'company-applicants.html') initApplicants()

// ---------------- Dashboard ----------------
async function initDashboard() {
  content.innerHTML = `<div class="loading-wrap"><div class="spinner spinner-lg"></div></div>`
  try {
    const [{ profile, internships }, { applications }] = await Promise.all([
      api.getCompanyProfile(),
      api.getCompanyApplications(),
    ])
    const stats = {
      internships: internships.length,
      open: internships.filter(i => i.status === 'open').length,
      applicants: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
    }
    let alert = ''
    if (profile.status === 'pending') {
      alert = `
        <div class="alert alert-warning">
          <div class="alert-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
          <div class="alert-content"><div class="alert-title">Account pending approval</div><div class="alert-text">Your company registration is being reviewed by the administrator. You'll be able to post internships once approved.</div></div>
        </div>`
    } else if (profile.status === 'rejected') {
      alert = `
        <div class="alert alert-error">
          <div class="alert-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
          <div class="alert-content"><div class="alert-title">Registration not approved</div><div class="alert-text">Your company registration was not approved. Please contact the administrator for more information.</div></div>
        </div>`
    }
    if (!profile.profile_complete) {
      alert += `
        <div class="alert alert-warning">
          <div class="alert-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg></div>
          <div class="alert-content"><div class="alert-title">Complete your company profile</div><div class="alert-text">You need a complete profile before posting internships.</div></div>
          <button class="btn btn-primary" onclick="location.href='${navUrl('company-profile.html')}'">Complete now</button>
        </div>`
    }
    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Welcome, ${escapeHtml(user.name.split(' ')[0])}</h1>
          <p class="page-subtitle">Manage your company profile, internship postings, and applicant pipeline.</p>
        </div>
      </div>
      ${alert}
      <div class="stats-grid stagger">
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Internships posted</span><div class="stat-card-icon sky">${ICONS.briefcase}</div></div><div class="stat-card-value">${stats.internships}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Open positions</span><div class="stat-card-icon emerald">${ICONS.briefcase}</div></div><div class="stat-card-value">${stats.open}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Total applicants</span><div class="stat-card-icon violet">${ICONS.users}</div></div><div class="stat-card-value">${stats.applicants}</div></div>
        <div class="stat-card"><div class="stat-card-top"><span class="stat-card-label">Pending review</span><div class="stat-card-icon amber">${ICONS.file}</div></div><div class="stat-card-value">${stats.pending}</div></div>
      </div>
      <div class="grid grid-2 stagger">
        <div class="card">
          <div class="card-header"><div class="card-title">Recent internships</div></div>
          <div class="card-body">
            ${internships.length === 0 ? `
              <div class="empty-state"><div class="empty-state-icon">${ICONS.briefcase}</div><div class="empty-state-title">No internships posted yet</div><div class="empty-state-action"><button class="btn btn-primary" onclick="location.href='${navUrl('my-internships.html')}'">Post internship</button></div></div>
            ` : internships.slice(0, 5).map(i => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">
                <div><div style="font-weight:500;">${escapeHtml(i.title)}</div><div class="text-xs muted">${i.application_count} applicant${i.application_count === 1 ? '' : 's'}</div></div>
                <span class="badge ${i.status === 'open' ? 'badge-emerald' : 'badge-slate'}">${i.status}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Latest applicants</div></div>
          <div class="card-body">
            ${applications.length === 0 ? `
              <div class="empty-state"><div class="empty-state-icon">${ICONS.users}</div><div class="empty-state-title">No applicants yet</div><div class="empty-state-text">Applicants will appear here once students apply.</div></div>
            ` : applications.slice(0, 5).map(a => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">
                <div><div style="font-weight:500;">${escapeHtml(a.student_name)}</div><div class="text-xs muted">${escapeHtml(a.internship_title)}</div></div>
                <div style="display:flex;align-items:center;gap:8px;">${statusBadge(a.status)}<span class="text-xs subtle">${relativeTime(a.created_at)}</span></div>
              </div>`).join('')}
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
    const { profile } = await api.getCompanyProfile()
    content.innerHTML = `
      <div style="max-width:720px;margin:0 auto;">
        <div class="page-header">
          <div><h1 class="page-title">Company Profile</h1><p class="page-subtitle">This information appears on every internship you post.</p></div>
        </div>
        <form id="profile-form">
          <div class="card">
            <div class="card-header"><div class="card-title">Company details</div><div class="card-subtitle">Students will see this when browsing your internships.</div></div>
            <div class="card-body">
              <div class="grid grid-2" style="grid-template-columns:1fr;">
                <div class="form-group"><label class="form-label">Company name <span class="req">*</span></label><input type="text" class="form-input" id="company_name" value="${escapeHtml(profile.company_name)}" required /></div>
                <div class="form-group"><label class="form-label">Industry <span class="req">*</span></label><input type="text" class="form-input" id="industry" value="${escapeHtml(profile.industry)}" required /></div>
              </div>
              <div class="grid grid-2" style="grid-template-columns:1fr;">
                <div class="form-group"><label class="form-label">Location</label><input type="text" class="form-input" id="location" value="${escapeHtml(profile.location)}" /></div>
                <div class="form-group"><label class="form-label">Website</label><input type="text" class="form-input" id="website" value="${escapeHtml(profile.website)}" /></div>
              </div>
              <div class="form-group"><label class="form-label">About the company</label><textarea class="form-textarea" id="description" placeholder="Briefly describe what your company does.">${escapeHtml(profile.description)}</textarea></div>
            </div>
            <div class="card-footer"><button type="submit" class="btn btn-primary" id="save-btn">Save profile</button></div>
          </div>
        </form>
      </div>
    `
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const btn = document.getElementById('save-btn')
      btn.disabled = true; btn.textContent = 'Saving...'
      try {
        await api.saveCompanyProfile({
          company_name: document.getElementById('company_name').value,
          industry: document.getElementById('industry').value,
          description: document.getElementById('description').value,
          website: document.getElementById('website').value,
          location: document.getElementById('location').value,
        })
        toast('Company profile saved')
        setTimeout(() => location.reload(), 600)
      } catch (err) {
        toast('Failed', err.message, 'error')
        btn.disabled = false; btn.textContent = 'Save profile'
      }
    })
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

// ---------------- Internships ----------------
async function initInternships() {
  content.innerHTML = `<div class="loading-wrap"><div class="spinner spinner-lg"></div></div>`
  try {
    const { profile, internships } = await api.getCompanyProfile()
    content.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">My Internships</h1><p class="page-subtitle">Create, edit, and manage your internship postings.</p></div>
        <div class="page-header-actions">
          <button class="btn btn-primary new-btn" ${!profile.profile_complete ? 'disabled' : ''}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Post internship</button>
        </div>
      </div>
      ${!profile.profile_complete ? `<div class="alert alert-warning"><div class="alert-content"><div class="alert-text">Complete your company profile before posting internships.</div></div></div>` : ''}
      <div id="internships-list"></div>
    `
    renderInternships(internships)
    document.querySelector('.new-btn').addEventListener('click', () => openEditor(null, () => initInternships()))
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

function renderInternships(internships) {
  const list = document.getElementById('internships-list')
  if (internships.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.briefcase}</div><div class="empty-state-title">No internships yet</div><div class="empty-state-text">Post your first internship to start receiving applications.</div></div>`
    return
  }
  list.innerHTML = `<div class="grid grid-2">` + internships.map(i => `
    <div class="internship-card">
      <div class="internship-card-head">
        <div class="internship-card-title">${escapeHtml(i.title)}</div>
        <span class="badge ${i.status === 'open' ? 'badge-emerald' : 'badge-slate'}">${i.status}</span>
      </div>
      <div class="internship-card-meta">
        <span>📍 ${escapeHtml(i.location) || '—'}</span>
        <span>⏱ ${escapeHtml(i.duration) || '—'}</span>
        ${deadlineBadge(i.deadline)}
      </div>
      <div class="internship-card-desc">${escapeHtml(i.description)}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <span class="badge badge-slate">${escapeHtml(i.category)}</span>
        <span class="text-xs muted">${i.application_count} applicant${i.application_count === 1 ? '' : 's'}</span>
      </div>
      <div class="internship-card-foot">
        <button class="btn btn-outline btn-sm edit-btn" data-id="${i.id}">Edit</button>
        <button class="btn btn-outline btn-sm toggle-btn" data-id="${i.id}" data-status="${i.status}">${i.status === 'open' ? 'Close' : 'Reopen'}</button>
        <button class="btn btn-ghost btn-sm delete-btn" data-id="${i.id}" style="color:var(--rose);margin-left:auto;">Delete</button>
      </div>
    </div>`).join('') + `</div>`

  list.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', async () => {
    const { internship } = await api.getInternship(b.dataset.id)
    openEditor(internship, () => initInternships())
  }))
  list.querySelectorAll('.toggle-btn').forEach(b => b.addEventListener('click', async () => {
    const next = b.dataset.status === 'open' ? 'closed' : 'open'
    try { await api.updateInternship(b.dataset.id, { status: next }); toast('Updated'); setTimeout(() => initInternships(), 500) }
    catch (e) { toast('Failed', e.message, 'error') }
  }))
  list.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', async () => {
    if (!confirm('Delete this internship? All applications for it will also be deleted.')) return
    try { await api.deleteInternship(b.dataset.id); toast('Internship deleted'); setTimeout(() => initInternships(), 500) }
    catch (e) { toast('Failed', e.message, 'error') }
  }))
}

function openEditor(existing, onDone) {
  const isNew = !existing
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  const dl = existing ? (existing.deadline ? existing.deadline.slice(0, 10) : '') : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  backdrop.innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-head">
        <div class="modal-title">${isNew ? 'Post a new internship' : 'Edit internship'}</div>
        <div class="modal-subtitle">${isNew ? 'Fill in the details to attract the right candidates.' : 'Update the details of your internship posting.'}</div>
      </div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Title <span class="req">*</span></label><input type="text" class="form-input" id="m-title" value="${existing ? escapeHtml(existing.title) : ''}" /></div>
        <div class="grid grid-2" style="grid-template-columns:1fr;">
          <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="m-category">${CATEGORIES.map(c => `<option ${existing && existing.category === c ? 'selected' : (isNew && c === 'General' ? 'selected' : '')}>${c}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Application deadline <span class="req">*</span></label><input type="date" class="form-input" id="m-deadline" value="${dl}" /></div>
        </div>
        <div class="grid grid-2" style="grid-template-columns:1fr;">
          <div class="form-group"><label class="form-label">Location <span class="req">*</span></label><input type="text" class="form-input" id="m-location" value="${existing ? escapeHtml(existing.location) : ''}" /></div>
          <div class="form-group"><label class="form-label">Duration <span class="req">*</span></label><input type="text" class="form-input" id="m-duration" value="${existing ? escapeHtml(existing.duration) : ''}" /></div>
        </div>
        <div class="form-group"><label class="form-label">Description <span class="req">*</span></label><textarea class="form-textarea" id="m-description">${existing ? escapeHtml(existing.description) : ''}</textarea></div>
        <div class="form-group"><label class="form-label">Requirements</label><textarea class="form-textarea" id="m-requirements">${existing ? escapeHtml(existing.requirements) : ''}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline cancel-btn">Cancel</button>
        <button class="btn btn-primary save-btn">${isNew ? 'Post internship' : 'Save changes'}</button>
      </div>
    </div>`
  document.body.appendChild(backdrop)
  const close = () => backdrop.remove()
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close() })
  backdrop.querySelector('.cancel-btn').addEventListener('click', close)
  backdrop.querySelector('.save-btn').addEventListener('click', async () => {
    const payload = {
      title: backdrop.querySelector('#m-title').value.trim(),
      description: backdrop.querySelector('#m-description').value.trim(),
      requirements: backdrop.querySelector('#m-requirements').value.trim(),
      location: backdrop.querySelector('#m-location').value.trim(),
      duration: backdrop.querySelector('#m-duration').value.trim(),
      category: backdrop.querySelector('#m-category').value,
      deadline: backdrop.querySelector('#m-deadline').value,
    }
    if (!payload.title || !payload.description || !payload.location || !payload.duration || !payload.deadline) {
      toast('Missing fields', 'Please fill all required fields', 'error'); return
    }
    const btn = backdrop.querySelector('.save-btn')
    btn.disabled = true; btn.textContent = 'Saving...'
    try {
      if (existing) await api.updateInternship(existing.id, payload)
      else await api.createInternship(payload)
      toast(isNew ? 'Internship posted' : 'Internship updated')
      close(); onDone()
    } catch (e) {
      toast('Failed', e.message, 'error'); btn.disabled = false; btn.textContent = isNew ? 'Post internship' : 'Save changes'
    }
  })
}

// ---------------- Applicants ----------------
async function initApplicants() {
  content.innerHTML = `<div class="loading-wrap"><div class="spinner spinner-lg"></div></div>`
  try {
    const [{ internships }, { applications }] = await Promise.all([
      api.getCompanyProfile(),
      api.getCompanyApplications(),
    ])
    content.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Applications</h1><p class="page-subtitle">Review applicants and update their status.</p></div>
      </div>
      <div class="card" style="margin-bottom:24px;">
        <div class="card-body">
          <div class="filters" style="grid-template-columns:1fr;">
            <select class="form-select" id="status-filter">
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <select class="form-select" id="internship-filter">
              <option value="all">All internships</option>
              ${internships.map(i => `<option value="${i.id}">${escapeHtml(i.title)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div id="apps-list"></div>
    `
    let fStatus = 'all', fInternship = 'all'
    function render() {
      let items = applications
      if (fStatus !== 'all') items = items.filter(a => a.status === fStatus)
      if (fInternship !== 'all') items = items.filter(a => String(a.internship_id) === fInternship)
      const list = document.getElementById('apps-list')
      if (items.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.file}</div><div class="empty-state-title">No applications match</div><div class="empty-state-text">Try adjusting your filters.</div></div>`
        return
      }
      list.innerHTML = items.map(a => `
        <div class="card" style="margin-bottom:12px;">
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;">
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <h3 style="font-size:16px;font-weight:600;">${escapeHtml(a.student_name)}</h3>
                  ${statusBadge(a.status)}
                </div>
                <div class="text-sm muted mt-1">Applied to <strong>${escapeHtml(a.internship_title)}</strong></div>
                <div class="text-xs subtle mt-2">Applied ${relativeTime(a.created_at)} · <a href="mailto:${escapeHtml(a.student_email)}">${escapeHtml(a.student_email)}</a></div>
                <div class="grid grid-2 mt-3" style="grid-template-columns:1fr;gap:12px;">
                  <div style="padding:12px;background:var(--surface-alt);border-radius:8px;">
                    <div class="text-xs subtle" style="text-transform:uppercase;font-weight:600;margin-bottom:4px;">Course</div>
                    <div class="text-sm">${escapeHtml(a.course) || '—'}</div>
                    ${a.skills ? `<div class="mt-2">${skillsList(a.skills)}</div>` : ''}
                  </div>
                  ${a.cover_letter ? `<div style="padding:12px;background:var(--surface-alt);border-radius:8px;"><div class="text-xs subtle" style="text-transform:uppercase;font-weight:600;margin-bottom:4px;">Cover letter</div><div class="text-sm">${escapeHtml(a.cover_letter)}</div></div>` : ''}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
                ${a.cv_file_name ? `<a class="btn btn-outline btn-sm" href="/uploads/${encodeURIComponent(a.cv_file_name)}" target="_blank">View CV</a>` : ''}
                <select class="form-select status-select" data-id="${a.id}" style="width:160px;">
                  ${['pending','reviewed','shortlisted','accepted','rejected'].map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
        </div>`).join('')

      list.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
          try { await api.updateApplicationStatus(sel.dataset.id, sel.value); toast('Status updated') }
          catch (e) { toast('Failed', e.message, 'error') }
        })
      })
    }
    document.getElementById('status-filter').addEventListener('change', (e) => { fStatus = e.target.value; render() })
    document.getElementById('internship-filter').addEventListener('change', (e) => { fInternship = e.target.value; render() })
    render()
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}
