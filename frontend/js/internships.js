// js/internships.js — browse internships + apply (student)
import { api } from './api.js'
import {
  guard, renderShell, toast, escapeHtml, formatDate, deadlineBadge, skillsList, ICONS, navUrl,
} from './auth.js'

const user = await guard('student')
if (!user) throw new Error('redirecting')

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

renderShell({
  role: 'student',
  activeId: 'browse',
  navItems: NAV,
  userName: user.name,
  userEmail: user.email,
  onNavigate: (id) => { window.location.href = NAV_TARGETS[id] },
})

const content = document.getElementById('content')
const CATEGORIES = ['General', 'Software Engineering', 'Data', 'Design', 'Marketing', 'Finance', 'Operations', 'Research']

let appliedIds = []
let profileComplete = false
let allInternships = []
let filters = { search: '', category: 'all', location: '' }

async function bootstrap() {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Browse Internships</h1>
        <p class="page-subtitle">Find and apply to open internship opportunities.</p>
      </div>
    </div>
    <div class="loading-wrap"><div class="spinner spinner-lg"></div></div>
  `
  try {
    const [profileRes, { internships }] = await Promise.all([
      api.getStudentProfile(),
      api.listInternships(),
    ])
    const { profile, applications = [] } = profileRes
    appliedIds = applications.map(a => a.internship_id)
    profileComplete = !!profile.profile_complete
    allInternships = internships
    renderView()
  } catch (err) {
    content.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
}

function renderView() {
  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Browse Internships</h1>
        <p class="page-subtitle">Find and apply to open internship opportunities.</p>
      </div>
    </div>
    <div class="card" style="margin-bottom:24px;">
      <div class="card-body">
        <div class="filters">
          <div class="filter-search">
            ${ICONS.search}
            <input type="text" class="form-input" id="f-search" placeholder="Search title, description, requirements..." value="${escapeHtml(filters.search)}" />
          </div>
          <select class="form-select" id="f-category">
            <option value="all">All categories</option>
            ${CATEGORIES.map(c => `<option value="${c}" ${filters.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <input type="text" class="form-input" id="f-location" placeholder="Filter by location" value="${escapeHtml(filters.location)}" />
        </div>
      </div>
    </div>
    <div id="internships-list"></div>
  `

  document.getElementById('f-search').addEventListener('input', (e) => { filters.search = e.target.value; renderList() })
  document.getElementById('f-category').addEventListener('change', (e) => { filters.category = e.target.value; renderList() })
  document.getElementById('f-location').addEventListener('input', (e) => { filters.location = e.target.value; renderList() })

  renderList()
}

function renderList() {
  const list = document.getElementById('internships-list')
  let items = allInternships
  if (filters.search) {
    const s = filters.search.toLowerCase()
    items = items.filter(i =>
      (i.title || '').toLowerCase().includes(s) ||
      (i.description || '').toLowerCase().includes(s) ||
      (i.requirements || '').toLowerCase().includes(s)
    )
  }
  if (filters.category !== 'all') items = items.filter(i => i.category === filters.category)
  if (filters.location) items = items.filter(i => (i.location || '').toLowerCase().includes(filters.location.toLowerCase()))

  if (items.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${ICONS.briefcase}</div>
        <div class="empty-state-title">No internships found</div>
        <div class="empty-state-text">Try adjusting your search or filters.</div>
      </div>`
    return
  }

  list.innerHTML = `<div class="grid grid-3 stagger">` + items.map(i => {
    const applied = appliedIds.includes(i.id)
    return `
      <div class="internship-card">
        <div class="internship-card-head">
          <div class="internship-card-company">
            <div class="internship-card-company-icon">${ICONS.briefcase}</div>
            <div>
              <div class="internship-card-company-name">${escapeHtml(i.company_name || i.company_user_name)}</div>
              <div class="internship-card-category">${escapeHtml(i.category)}</div>
            </div>
          </div>
          ${deadlineBadge(i.deadline)}
        </div>
        <div class="internship-card-title">${escapeHtml(i.title)}</div>
        <div class="internship-card-meta">
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ${escapeHtml(i.location) || '—'}</span>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${escapeHtml(i.duration) || '—'}</span>
        </div>
        <div class="internship-card-desc">${escapeHtml(i.description)}</div>
        <div class="internship-card-foot">
          <span class="internship-card-applicants">${i.application_count} applied</span>
          <button class="btn ${applied ? 'btn-outline' : 'btn-primary'} btn-sm apply-btn"
                  data-id="${i.id}" data-title="${escapeHtml(i.title)}" data-company="${escapeHtml(i.company_name)}"
                  data-requirements="${escapeHtml(i.requirements)}"
                  ${applied || !profileComplete ? 'disabled' : ''}>
            ${applied ? '✓ Applied' : 'Apply'}
          </button>
        </div>
      </div>`
  }).join('') + `</div>`

  document.querySelectorAll('.apply-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => openApplyModal(btn.dataset))
  })
}

function openApplyModal(data) {
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop'
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <div class="modal-title">Apply to ${escapeHtml(data.title)}</div>
        <div class="modal-subtitle">${escapeHtml(data.company)}</div>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" style="text-transform:uppercase;color:var(--text-subtle);">Requirements</label>
          <p class="text-sm muted">${escapeHtml(data.requirements) || 'No specific requirements listed.'}</p>
        </div>
        <div class="form-group">
          <label class="form-label">Cover letter (optional)</label>
          <textarea class="form-textarea" id="cover-letter" placeholder="Briefly introduce yourself and explain why you're a great fit."></textarea>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline cancel-btn">Cancel</button>
        <button class="btn btn-primary submit-btn">Submit application</button>
      </div>
    </div>
  `
  document.body.appendChild(backdrop)

  const close = () => backdrop.remove()
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close() })
  backdrop.querySelector('.cancel-btn').addEventListener('click', close)
  backdrop.querySelector('.submit-btn').addEventListener('click', async () => {
    const btn = backdrop.querySelector('.submit-btn')
    btn.disabled = true
    btn.textContent = 'Submitting...'
    try {
      await api.apply({ internship_id: data.id, cover_letter: backdrop.querySelector('#cover-letter').value })
      appliedIds.push(Number(data.id))
      toast('Application submitted', `You applied to ${data.title}.`)
      close()
      renderList()
    } catch (err) {
      toast('Failed to apply', err.message, 'error')
      btn.disabled = false
      btn.textContent = 'Submit application'
    }
  })
}

bootstrap()
