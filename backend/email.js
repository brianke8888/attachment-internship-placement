// email.js — email service with Ethereal fallback for development
const nodemailer = require('nodemailer')

let transporter = null
let etherealUrl = null

async function getTransporter() {
  if (transporter) return transporter

  // Use real SMTP if configured in .env
  if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    })
    console.log('[email] Using SMTP:', process.env.MAIL_HOST)
    return transporter
  }

  // Fallback: create Ethereal test account
  const testAccount = await nodemailer.createTestAccount()
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
  etherealUrl = 'https://ethereal.email/login'
  console.log('[email] Using Ethereal test account:', testAccount.user)
  console.log('[email] View emails at https://ethereal.email/')
  return transporter
}

async function sendEmail({ to, subject, html }) {
  try {
    const t = await getTransporter()
    const from = process.env.MAIL_FROM || '"PlacementHub" <noreply@placementhub.local>'
    const info = await t.sendMail({ from, to, subject, html })

    if (etherealUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      if (previewUrl) {
        console.log('[email] Preview URL:', previewUrl)
      }
    } else {
      console.log('[email] Sent:', info.messageId)
    }

    return info
  } catch (err) {
    console.error('[email] Failed to send:', err.message)
    // Don't throw — email failures shouldn't break the request
  }
}

function layout(htmlContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:#f8fafc; }
  .wrap { max-width:560px; margin:0 auto; padding:24px; }
  .card { background:#fff; border-radius:12px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.08); }
  .logo { font-size:20px; font-weight:700; color:#059669; margin-bottom:8px; }
  h1 { font-size:22px; font-weight:700; color:#0f172a; margin:0 0 8px; }
  p { font-size:15px; color:#475569; line-height:1.5; margin:0 0 16px; }
  .footer { font-size:12px; color:#94a3b8; text-align:center; margin-top:24px; }
  hr { border:none; border-top:1px solid #e2e8f0; margin:24px 0; }
</style>
</head>
<body><div class="wrap"><div class="card">
<div class="logo">PlacementHub</div>
${htmlContent}
</div><div class="footer">Attachment &amp; Internship Placement System</div></div></body>
</html>`
}

function emailTemplates() {
  return {
    welcome: (name, role) => ({
      subject: `Welcome to PlacementHub, ${name}!`,
      html: layout(`
        <h1>Welcome aboard, ${name}!</h1>
        <p>Your ${role} account has been created successfully on PlacementHub.</p>
        <p>Get started by completing your profile and exploring available opportunities.</p>
      `),
    }),
    applicationReceived: (studentName, internshipTitle, companyName) => ({
      subject: `New application from ${studentName}`,
      html: layout(`
        <h1>New application received</h1>
        <p><strong>${studentName}</strong> has applied to your internship posting <strong>"${internshipTitle}"</strong>.</p>
        <p>Log in to your company dashboard to review the applicant and update their status.</p>
      `),
    }),
    statusUpdated: (studentName, internshipTitle, status) => ({
      subject: `Application status updated — ${status}`,
      html: layout(`
        <h1>Application status updated</h1>
        <p>Hi ${studentName},</p>
        <p>Your application for <strong>"${internshipTitle}"</strong> has been marked as <strong>${status}</strong>.</p>
        <p>Log in to your student dashboard to view the details.</p>
      `),
    }),
    adminNotification: (type, details) => ({
      subject: `[Admin] ${type}`,
      html: layout(`
        <h1>Admin Notification</h1>
        ${details}
        <p style="font-size:13px;color:#94a3b8;">This is an automated notification from PlacementHub.</p>
      `),
    }),
    passwordReset: (name, resetLink) => ({
      subject: 'Reset your PlacementHub password',
      html: layout(`
        <h1>Password reset request</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your PlacementHub password. Click the button below to choose a new one:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a>
        </p>
        <p>If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
        <hr>
        <p style="font-size:13px;color:#94a3b8;">If the button doesn't work, copy and paste this link into your browser:<br><span style="color:#059669;word-break:break-all;">${resetLink}</span></p>
      `),
    }),
  }
}

module.exports = { sendEmail, emailTemplates }
