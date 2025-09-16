const db = require('./database')
const bcrypt = require('bcryptjs')

// Service d'authentification: stocke un hash de mot de passe dans la collection app_settings
class AuthService {
  async getPasswordHash() {
    const settings = db.getCollection('app_settings')
    const doc = await settings.findOne({ key: 'auth_password' })
    return doc?.value || null
  }

  async setPassword(newPassword) {
    const settings = db.getCollection('app_settings')
    const tokens = db.getCollection('password_reset_tokens')
    const saltRounds = 10
    const hash = await bcrypt.hash(String(newPassword), saltRounds)
    await settings.updateOne(
      { key: 'auth_password' },
      { $set: { key: 'auth_password', value: hash, updated_at: new Date() } },
      { upsert: true }
    )
    // Invalider tous les tokens existants après changement de mot de passe
    await tokens.deleteMany({})
    return true
  }

  async verify(password) {
    const stored = await this.getPasswordHash()
    if (!stored) {
      // Aucun mot de passe défini en base => refuser l'accès
      return false
    }
    return bcrypt.compare(String(password), stored)
  }

  generatePassword(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let out = ''
    for (let i = 0; i < length; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return out
  }

  async createResetToken(ttlMinutes = 30) {
    const tokens = db.getCollection('password_reset_tokens')
    // Un seul jeton actif: supprimer les anciens avant d'en créer un nouveau
    await tokens.deleteMany({})
    const token = this.generatePassword(24)
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
    await tokens.insertOne({ token, expires_at: expiresAt, created_at: new Date() })
    return token
  }

  async consumeResetToken(token) {
    const tokens = db.getCollection('password_reset_tokens')
    const doc = await tokens.findOne({ token })
    if (!doc) return false
    if (doc.expires_at && new Date(doc.expires_at).getTime() < Date.now()) {
      await tokens.deleteOne({ _id: doc._id })
      return false
    }
    await tokens.deleteOne({ _id: doc._id })
    return true
  }
}

module.exports = new AuthService()


