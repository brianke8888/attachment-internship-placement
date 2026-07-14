// js/api.js — fetch wrapper with JWT auth header
const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

function setToken(token) {
  localStorage.setItem('token', token)
}

function clearToken() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!isForm && body) headers['Content-Type'] = 'application/json'

  const opts = { method, headers }
  if (body) {
    opts.body = isForm ? body : JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(API_BASE + path, opts)
  } catch (e) {
    throw new Error('Cannot connect to server. Is the backend running on port 5000?')
  }

  let data = null
  const text = await res.text()
  if (text) {
    try { data = JSON.parse(text) } catch { data = { message: text } }
  }

  if (!res.ok) {
    const msg = (data && data.message) || `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),
  forgotPassword: (body) => request('/auth/forgot-password', { method: 'POST', body }),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),

  // Student
  getStudentProfile: () => request('/student/profile'),
  saveStudentProfile: (formData) => request('/student/profile', { method: 'POST', body: formData, isForm: true }),

  // Company
  getCompanyProfile: () => request('/company/profile'),
  saveCompanyProfile: (body) => request('/company/profile', { method: 'POST', body }),
  getCompanyApplications: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.status) sp.set('status', params.status)
    if (params.internship_id) sp.set('internship_id', params.internship_id)
    const qs = sp.toString()
    return request('/company/applications' + (qs ? '?' + qs : ''))
  },

  // Internships
  listInternships: (params = {}) => {
    const sp = new URLSearchParams()
    if (params.search) sp.set('search', params.search)
    if (params.category) sp.set('category', params.category)
    if (params.location) sp.set('location', params.location)
    if (params.mine) sp.set('mine', '1')
    const qs = sp.toString()
    return request('/internships' + (qs ? '?' + qs : ''))
  },
  getInternship: (id) => request('/internships/' + id),
  createInternship: (body) => request('/internships', { method: 'POST', body }),
  updateInternship: (id, body) => request('/internships/' + id, { method: 'PUT', body }),
  deleteInternship: (id) => request('/internships/' + id, { method: 'DELETE' }),

  // Applications
  apply: (body) => request('/applications', { method: 'POST', body }),
  updateApplicationStatus: (id, status) => request('/applications/' + id + '/status', { method: 'PATCH', body: { status } }),
  withdrawApplication: (id) => request('/applications/' + id, { method: 'DELETE' }),

  // Notifications
  getNotifications: (limit = 10) => request('/notifications?limit=' + limit),
  getUnreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request('/notifications/' + id + '/read', { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),

  // Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminUsers: () => request('/admin/users'),
  getAdminInternships: () => request('/admin/internships'),
  getAdminApplications: () => request('/admin/applications'),
  getPendingCompanies: () => request('/admin/pending-companies'),
  approveCompany: (id) => request('/admin/companies/' + id + '/approve', { method: 'POST' }),
  rejectCompany: (id) => request('/admin/companies/' + id + '/reject', { method: 'POST' }),
  getPendingInternships: () => request('/admin/pending-internships'),
  approveInternship: (id) => request('/admin/internships/' + id + '/approve', { method: 'POST' }),
  rejectInternship: (id) => request('/admin/internships/' + id + '/reject', { method: 'POST' }),
  suspendUser: (id) => request('/admin/users/' + id + '/suspend', { method: 'POST' }),
  activateUser: (id) => request('/admin/users/' + id + '/activate', { method: 'POST' }),
  getUnplacedStudents: () => request('/admin/unplaced'),
  createPlacement: (body) => request('/admin/placements', { method: 'POST', body }),
}

export const auth = { getToken, setToken, clearToken }
