// js/auth.js — shared helpers for auth state, toasts, and route guarding
import { api, auth } from './api.js'

// ---------- Service Worker (PWA) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// ---------- Theme ----------
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme')
  setTheme(current === 'dark' ? 'light' : 'dark')
}

function initTheme() {
  const saved = localStorage.getItem('theme')
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved)
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
}

initTheme()

// ---------- Toast ----------
export function toast(title, msg = '', type = 'success') {
  let container = document.querySelector('.toast-container')
  if (!container) {
    container = document.createElement('div')
    container.className = 'toast-container'
    document.body.appendChild(container)
  }
  const el = document.createElement('div')
  el.className = 'toast ' + type
  el.innerHTML = `<div class="toast-title">${escapeHtml(title)}</div>${msg ? `<div class="toast-msg">${escapeHtml(msg)}</div>` : ''}`
  container.appendChild(el)
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transition = 'opacity 0.2s'
    setTimeout(() => el.remove(), 200)
  }, 4000)
}

// ---------- Utils ----------
export function escapeHtml(s) {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]))
}

export function formatDate(dateStr, fmt = 'short') {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return String(dateStr)
  if (fmt === 'short') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  return d.toLocaleString()
}

export function relativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const diff = Date.now() - d.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return min + 'm ago'
  const hr = Math.floor(min / 60)
  if (hr < 24) return hr + 'h ago'
  const day = Math.floor(hr / 24)
  if (day < 30) return day + 'd ago'
  return formatDate(dateStr)
}

export function deadlineBadge(deadline) {
  if (!deadline) return '<span class="badge badge-slate">—</span>'
  const d = new Date(deadline)
  const diff = d.getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (diff < 0) return '<span class="badge badge-rose">Closed</span>'
  if (days <= 3) return `<span class="badge badge-rose">${days}d left</span>`
  if (days <= 7) return `<span class="badge badge-amber">${days}d left</span>`
  return `<span class="badge badge-slate">${days}d left</span>`
}

export function statusBadge(status) {
  const map = {
    pending: 'badge-amber',
    reviewed: 'badge-sky',
    shortlisted: 'badge-violet',
    accepted: 'badge-emerald',
    rejected: 'badge-rose',
  }
  return `<span class="badge ${map[status] || 'badge-slate'}">${status}</span>`
}

export function skillsList(skills) {
  if (!skills) return ''
  const items = String(skills).split(',').map(s => s.trim()).filter(Boolean)
  if (!items.length) return ''
  return '<div class="skills-list">' + items.map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('') + '</div>'
}

export function initials(name) {
  if (!name) return 'U'
  return name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
}

// ---------- Auth state ----------
export function getCurrentUser() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function isAuthenticated() {
  return !!auth.getToken()
}

export async function fetchMe() {
  try {
    const data = await api.me()
    return data.user
  } catch {
    return null
  }
}

export async function logout() {
  auth.clearToken()
  const fromPage = window.location.pathname.includes('/pages/')
  window.location.href = fromPage ? '../auth.html' : 'auth.html'
}

// ---------- Route guard ----------
// Call on every protected page. role is optional ('student' | 'company' | 'admin').
export async function guard(role) {
  if (!isAuthenticated()) {
    const fromPage = window.location.pathname.includes('/pages/')
  window.location.href = fromPage ? '../auth.html' : 'auth.html'
    return null
  }
  const user = getCurrentUser()
  if (role && user && user.role !== role) {
    // Redirect to correct dashboard
    redirectByRole(user.role)
    return null
  }
  return user
}

export function redirectByRole(role) {
  const fromPage = window.location.pathname.includes('/pages/')
  if (role === 'student') window.location.href = fromPage ? 'student-dashboard.html' : 'pages/student-dashboard.html'
  else if (role === 'company') window.location.href = fromPage ? 'company-dashboard.html' : 'pages/company-dashboard.html'
  else if (role === 'admin') window.location.href = fromPage ? 'admin-dashboard.html' : 'pages/admin-dashboard.html'
  else window.location.href = fromPage ? '../auth.html' : 'auth.html'
}

// ---------- Sidebar + topbar (shared layout) ----------
export function renderShell({ role, activeId, navItems, userName, userEmail, onNavigate }) {
  const roleLabels = { student: 'STUDENT', company: 'COMPANY', admin: 'ADMINISTRATOR' }
  const roleColors = { student: 'var(--primary)', company: 'var(--sky)', admin: 'var(--violet)' }

  const sidebar = document.getElementById('sidebar')
  const topbar = document.getElementById('topbar')

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4z"/></svg>
      </div>
      <div>
        <div class="sidebar-brand-name">PlacementHub</div>
        <div class="sidebar-brand-role" style="color:${roleColors[role]}">${roleLabels[role]}</div>
      </div>
    </div>
    <nav class="sidebar-nav">
      ${navItems.map(item => `
        <button class="sidebar-nav-item ${item.id === activeId ? 'active' : ''}" data-nav="${item.id}">
          ${item.icon}
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>
    <div class="sidebar-user">
      <div class="avatar">${initials(userName)}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${escapeHtml(userName)}</div>
        <div class="sidebar-user-email">${escapeHtml(userEmail)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" title="Toggle theme" id="theme-btn">
        ${themeIcon()}
      </button>
      <button class="btn btn-ghost btn-sm" title="Sign out" id="logout-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  `

  topbar.innerHTML = `
    <button class="menu-toggle" id="menu-toggle">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
    <div class="topbar-title">Signed in as <strong>${escapeHtml(userEmail)}</strong></div>
    <div class="topbar-right">
      <div class="notif-wrap">
        <button class="btn btn-ghost btn-sm" id="notif-btn" title="Notifications">
          ${NOTIF_ICON}
          <span class="notif-badge" id="notif-badge" style="display:none;">0</span>
        </button>
        <div class="notif-dropdown" id="notif-dropdown">
          <div class="notif-dropdown-head">
            <span class="notif-dropdown-title">Notifications</span>
            <button class="btn btn-ghost btn-sm" id="notif-mark-all" style="font-size:12px;">Mark all read</button>
          </div>
          <div class="notif-dropdown-body" id="notif-list">
            <div class="notif-empty">No notifications yet</div>
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" id="topbar-theme-btn" title="Toggle theme">${themeIcon()}</button>
      <button class="btn btn-ghost btn-sm" id="topbar-logout">Sign out</button>
      <div class="avatar">${initials(userName)}</div>
    </div>
  `

  // Wire nav
  sidebar.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => onNavigate(btn.dataset.nav))
  })

  // Wire logout
  const logoutFn = () => logout()
  document.getElementById('logout-btn').addEventListener('click', logoutFn)
  document.getElementById('topbar-logout').addEventListener('click', logoutFn)

  // Wire theme toggle
  const themeToggle = () => {
    toggleTheme()
    document.querySelectorAll('#theme-btn, #topbar-theme-btn').forEach(el => el.innerHTML = themeIcon())
  }
  const themeBtn = document.getElementById('theme-btn')
  const topbarThemeBtn = document.getElementById('topbar-theme-btn')
  if (themeBtn) themeBtn.addEventListener('click', themeToggle)
  if (topbarThemeBtn) topbarThemeBtn.addEventListener('click', themeToggle)

  // Mobile sidebar toggle
  const menuToggle = document.getElementById('menu-toggle')
  const backdrop = document.getElementById('sidebar-backdrop')
  menuToggle.addEventListener('click', () => {
    sidebar.classList.add('open')
    backdrop.classList.add('show')
  })
  backdrop.addEventListener('click', () => {
    sidebar.classList.remove('open')
    backdrop.classList.remove('show')
  })

  // Notification dropdown
  initNotifications()
}

// ---------- Notifications (real-time via Socket.io) ----------
const NOTIF_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'

let socket = null

function initNotifications() {
  const btn = document.getElementById('notif-btn')
  const dropdown = document.getElementById('notif-dropdown')
  const markAll = document.getElementById('notif-mark-all')

  if (!btn) return

  // Toggle dropdown
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = dropdown.classList.toggle('open')
    if (open) fetchNotifications()
  })

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notif-wrap')) {
      dropdown.classList.remove('open')
    }
  })

  // Mark all read
  if (markAll) {
    markAll.addEventListener('click', async () => {
      try {
        await api.markAllNotificationsRead()
        updateNotifBadge(0)
        dropdown.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'))
      } catch {}
    })
  }

  // Initial badge fetch
  updateNotifBadge()

  // Connect Socket.io for real-time updates
  connectSocket()
}

function connectSocket() {
  const token = auth.getToken()
  if (!token) return

  if (typeof io !== 'undefined') {
    initSocketConnection(token)
    return
  }

  // Load socket.io client from CDN
  const script = document.createElement('script')
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js'
  script.onload = () => initSocketConnection(token)
  script.onerror = () => console.warn('[socket] Failed to load Socket.io client')
  document.head.appendChild(script)
}

function initSocketConnection(token) {
  if (socket && socket.connected) return

  const serverUrl = window.location.origin
  socket = io(serverUrl, { auth: { token } })

  socket.on('connect', () => {
    console.log('[socket] Connected')
  })

  socket.on('notification', (notif) => {
    console.log('[socket] New notification:', notif.title)
    updateNotifBadge()
    toast(notif.title, notif.message, 'success')
    // If dropdown is open, refresh the list
    const dropdown = document.getElementById('notif-dropdown')
    if (dropdown && dropdown.classList.contains('open')) {
      fetchNotifications()
    }
  })

  socket.on('disconnect', () => {
    console.log('[socket] Disconnected')
  })

  socket.on('connect_error', (err) => {
    console.warn('[socket] Connection error:', err.message)
  })
}

async function updateNotifBadge(count) {
  const badge = document.getElementById('notif-badge')
  if (!badge) return
  try {
    if (count === undefined) {
      const data = await api.getUnreadCount()
      count = data.count
    }
    if (count > 0) {
      badge.style.display = ''
      badge.textContent = count > 99 ? '99+' : count
    } else {
      badge.style.display = 'none'
    }
  } catch {}
}

async function fetchNotifications() {
  const list = document.getElementById('notif-list')
  if (!list) return
  try {
    const { notifications } = await api.getNotifications(10)
    if (notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications yet</div>'
      return
    }
    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-item-dot ${n.type === 'application' ? 'sky' : n.type === 'status' ? 'emerald' : 'amber'}"></div>
        <div class="notif-item-content">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-msg">${escapeHtml(n.message)}</div>
          <div class="notif-item-time">${relativeTime(n.created_at)}</div>
        </div>
      </div>
    `).join('')

    // Click to mark read
    list.querySelectorAll('.notif-item.unread').forEach(el => {
      el.addEventListener('click', async () => {
        try {
          await api.markNotificationRead(el.dataset.id)
          el.classList.remove('unread')
          updateNotifBadge()
        } catch {}
      })
    })
  } catch {
    list.innerHTML = '<div class="notif-empty">Failed to load notifications</div>'
  }
}

// ---------- Path helper (relative nav) ----------
export function navUrl(page) {
  const inPages = window.location.pathname.includes('/pages/')
  return inPages ? page : 'pages/' + page
}

// ---------- Icon helpers ----------
export function themeIcon() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  return dark
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
}

export const ICONS = {
  dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  briefcase: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  file: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  trending: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
}
