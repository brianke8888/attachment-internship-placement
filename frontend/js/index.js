// js/index.js — auth page logic
import { api, auth } from './api.js'
import { toast, escapeHtml, redirectByRole, isAuthenticated, getCurrentUser, themeIcon } from './auth.js'

// If already logged in, redirect to dashboard
if (isAuthenticated()) {
  const user = getCurrentUser()
  if (user) redirectByRole(user.role)
}

// Theme toggle on auth page
const authThemeBtn = document.getElementById('auth-theme-btn')
if (authThemeBtn) {
  authThemeBtn.innerHTML = themeIcon()
  authThemeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    authThemeBtn.innerHTML = themeIcon()
  })
}

const loginForm = document.getElementById('login-form')
const registerForm = document.getElementById('register-form')
const tabs = document.querySelectorAll('.auth-tab')

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode
    tabs.forEach(t => t.classList.toggle('active', t === tab))
    loginForm.style.display = mode === 'login' ? '' : 'none'
    registerForm.style.display = mode === 'register' ? '' : 'none'
    document.getElementById('login-error').innerHTML = ''
    document.getElementById('reg-error').innerHTML = ''
  })
})

// Demo account fill
document.querySelectorAll('[data-demo]').forEach(btn => {
  btn.addEventListener('click', () => {
    const role = btn.dataset.demo
    const creds = {
      student: { email: 'student1@uni.edu', password: '12345678' },
      company: { email: 'hr@company1.com', password: '12345678' },
      admin: { email: 'kipkosgeib1@gmail.com', password: '12345678' },
    }[role]
    document.getElementById('login-email').value = creds.email
    document.getElementById('login-password').value = creds.password
    // Switch to login tab
    tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'login'))
    loginForm.style.display = ''
    registerForm.style.display = 'none'
  })
})

// Login submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('login-btn')
  const errEl = document.getElementById('login-error')
  errEl.innerHTML = ''
  btn.disabled = true
  btn.textContent = 'Signing in...'
  try {
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    const data = await api.login({ email, password })
    auth.setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    toast('Welcome back!', data.user.name)
    setTimeout(() => redirectByRole(data.user.role), 400)
  } catch (err) {
    errEl.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
    btn.disabled = false
    btn.textContent = 'Sign In'
  }
})

// Forgot password toggle
const forgotLink = document.getElementById('forgot-link')
const forgotForm = document.getElementById('forgot-form')
const forgotBack = document.getElementById('forgot-back')

forgotLink.addEventListener('click', () => {
  loginForm.style.display = 'none'
  registerForm.style.display = 'none'
  forgotForm.style.display = ''
  tabs.forEach(t => t.classList.toggle('active', false))
})

forgotBack.addEventListener('click', () => {
  forgotForm.style.display = 'none'
  loginForm.style.display = ''
  tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === 'login'))
})

// Forgot password submit
forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('forgot-btn')
  const errEl = document.getElementById('forgot-error')
  errEl.innerHTML = ''
  btn.disabled = true
  btn.textContent = 'Sending...'
  try {
    const email = document.getElementById('forgot-email').value
    await api.forgotPassword({ email })
    errEl.innerHTML = '<div class="form-success" style="color:var(--emerald);font-size:14px;">If that email exists, a reset link has been sent.</div>'
  } catch (err) {
    errEl.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
  }
  btn.disabled = false
  btn.textContent = 'Send Reset Link'
})

// Register submit
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('reg-btn')
  const errEl = document.getElementById('reg-error')
  errEl.innerHTML = ''
  btn.disabled = true
  btn.textContent = 'Creating account...'
  try {
    const name = document.getElementById('reg-name').value
    const email = document.getElementById('reg-email').value
    const password = document.getElementById('reg-password').value
    const role = document.querySelector('input[name="role"]:checked').value
    const data = await api.register({ name, email, password, role })
    auth.setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    toast('Account created!', data.user.name)
    setTimeout(() => redirectByRole(data.user.role), 400)
  } catch (err) {
    errEl.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`
    btn.disabled = false
    btn.textContent = 'Create Account'
  }
})
