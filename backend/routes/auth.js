const express = require('express')
const router = express.Router()
const authService = require('../services/authService')

// POST /api/auth/verify - Vérifier un mot de passe
router.post('/verify', async (req, res) => {
  try {
    const { password } = req.body || {}
    if (typeof password !== 'string') return res.status(400).json({ success: false, error: 'Password requis' })
    const ok = await authService.verify(password)
    if (!ok) return res.status(401).json({ success: false, error: 'Mot de passe incorrect' })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// POST /api/auth/set-password - Définir un nouveau mot de passe (protégé par le mot de passe actuel)
router.post('/set-password', async (req, res) => {
  try {
    const { current, password } = req.body || {}
    if (typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'Mot de passe trop court' })
    }
    // Vérifier l'actuel si existe
    const hasStored = await authService.getPasswordHash()
    if (hasStored) {
      const ok = await authService.verify(current)
      if (!ok) return res.status(401).json({ success: false, error: 'Mot de passe actuel invalide' })
    }
    await authService.setPassword(password)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// POST /api/auth/forgot - Envoyer un lien de réinitialisation sans vérification
router.post('/forgot', async (req, res) => {
  try {
    const token = await authService.createResetToken(30)

    const to = 'contact@maisoncleo.com'
    const base = process.env.FRONTEND_ORIGIN || process.env.VITE_FRONTEND_ORIGIN || 'http://localhost:5173'
    const resetUrl = `${base}#/password?token=${encodeURIComponent(token)}`

    // 1) Essayer RESEND (gratuit, simple, compatible)
    if (process.env.RESEND_API_KEY) {
      let fetchFn = globalThis.fetch
      if (!fetchFn) {
        try {
          // node-fetch v3 est ESM: import dynamique compatible CommonJS
          fetchFn = (await import('node-fetch')).default
        } catch (e) {
          fetchFn = null
        }
      }
      if (!fetchFn) {
        throw new Error('fetch_non_disponible')
      }
      const r = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Maison Cléo <onboarding@resend.dev>',
          to,
          subject: 'Réinitialiser votre mot de passe - Maison Cléo',
          html: `<p>Cliquez pour définir un nouveau mot de passe :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
        })
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        console.error('Resend error:', data)
        return res.status(502).json({ success: false, error: 'Erreur envoi via Resend' })
      }
      return res.json({ success: true, id: data.id || 'resend' })
    }

    // 2) Fallback SMTP (nodemailer)
    const nodemailer = require('nodemailer')
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    })
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@maisoncleo.com',
      to,
      subject: 'Réinitialiser votre mot de passe - Maison Cléo',
      text: `Définir un nouveau mot de passe: ${resetUrl}`,
      html: `<p>Cliquez pour définir un nouveau mot de passe :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    })
    return res.json({ success: true, messageId: info.messageId })
  } catch (e) {
    console.error('Erreur envoi mot de passe:', e)
    res.status(500).json({ success: false, error: 'Erreur envoi email' })
  }
})

// POST /api/auth/reset - Fixe un nouveau mot de passe en consommant le token
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body || {}
    if (typeof token !== 'string' || typeof password !== 'string' || password.length < 1) {
      return res.status(400).json({ success: false, error: 'Paramètres invalides' })
    }
    const ok = await authService.consumeResetToken(token)
    if (!ok) return res.status(400).json({ success: false, error: 'Lien invalide ou expiré' })
    await authService.setPassword(password)
    return res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// POST /api/auth/logout - Nettoyage côté client uniquement
router.post('/logout', (req, res) => {
  res.json({ success: true })
})

module.exports = router


