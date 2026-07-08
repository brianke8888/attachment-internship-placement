import { api } from './api.js'
import { toast } from './auth.js'

const form = document.getElementById('reset-form')
const successEl = document.getElementById('reset-success')
const errEl = document.getElementById('reset-error')
const btn = document.getElementById('reset-btn')

const params = new URLSearchParams(window.location.search)
const token = params.get('token')

if (!token) {
  errEl.innerHTML = '<div class="form-error">Invalid or missing reset token.</div>'
  form.style.display = 'none'
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  errEl.innerHTML = ''

  const password = document.getElementById('reset-password').value
  const confirm = document.getElementById('reset-confirm').value

  if (password !== confirm) {
    errEl.innerHTML = '<div class="form-error">Passwords do not match</div>'
    return
  }

  btn.disabled = true
  btn.textContent = 'Resetting...'

  try {
    await api.resetPassword({ token, password })
    form.style.display = 'none'
    successEl.style.display = ''
    toast('Password reset successfully!')
  } catch (err) {
    errEl.innerHTML = `<div class="form-error">${err.message}</div>`
    btn.disabled = false
    btn.textContent = 'Reset Password'
  }
})