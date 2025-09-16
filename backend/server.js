require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const database = require('./services/database')
const { cors, corsMiddleware } = require('./middleware/cors')

// Import du routeur centralisé
const apiRoutes = require('./routes')

const app = express()
const PORT = process.env.PORT || 3001

// Planification (sans dépendance externe): exécuter la sync à 10:00 Europe/Paris
const { synchronizeOrdersOnce } = require('./services/syncService')
const tz = 'Europe/Paris'

function getMsUntilNextEightAM(timezone) {
  const now = new Date()
  // Calcul de 08:00 locale Europe/Paris
  const formatter = new Intl.DateTimeFormat('fr-FR', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const [day, month, year] = formatter.format(now).split('/')
  const base = new Date(`${year}-${month}-${day}T10:00:00`)
  // Ajuste l'heure affichée Europe/Paris vers l'heure système via offset réel
  const target = new Date(base.toLocaleString('en-US', { timeZone: timezone }))
  let ms = target.getTime() - now.getTime()
  if (ms <= 0) {
    // Demain 10:00
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const [d2, m2, y2] = formatter.format(tomorrow).split('/')
    const base2 = new Date(`${y2}-${m2}-${d2}T10:00:00`)
    const target2 = new Date(base2.toLocaleString('en-US', { timeZone: timezone }))
    ms = target2.getTime() - now.getTime()
  }
  return ms
}

async function scheduleDailySync() {
  const delay = getMsUntilNextEightAM(tz)
  setTimeout(async function run() {
    try {
      console.log('⏰ Lancement automatique synchronisation (10:00 Europe/Paris)')
      const result = await synchronizeOrdersOnce()
      console.log('✅ Sync auto terminée:', result)
    } catch (e) {
      console.error('❌ Erreur sync auto:', e)
    } finally {
      // Replanifie pour le prochain 08:00
      scheduleDailySync()
    }
  }, delay)
}

// Middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())

// Middleware de logging des requêtes HTTP pour diagnostic de routage/mime
// - Journalise méthode, chemin, host, accept, user-agent, statut et content-type de la réponse
// - Alerte si des requêtes d'assets `/assets/*` atteignent le backend (signe d'un mauvais routage)
app.use((req, res, next) => {
  const requestStartAtMs = Date.now()
  const originalUrl = req.originalUrl || req.url
  const hostHeader = req.headers && req.headers.host ? req.headers.host : 'unknown-host'
  const acceptHeader = req.headers && req.headers.accept ? req.headers.accept : 'unknown-accept'
  const userAgentHeader = req.headers && req.headers['user-agent'] ? req.headers['user-agent'] : 'unknown-ua'

  const isAssetLikeRequest = typeof originalUrl === 'string' && (
    originalUrl.startsWith('/assets/') ||
    originalUrl.endsWith('.js') ||
    originalUrl.endsWith('.css') ||
    originalUrl.endsWith('.map') ||
    originalUrl.endsWith('.png') ||
    originalUrl.endsWith('.jpg') ||
    originalUrl.endsWith('.jpeg') ||
    originalUrl.endsWith('.gif') ||
    originalUrl.endsWith('.webp') ||
    originalUrl.endsWith('.svg')
  )

  res.on('finish', () => {
    const responseTimeMs = Date.now() - requestStartAtMs
    const statusCode = res.statusCode
    const responseContentType = res.getHeader('content-type') || 'unknown-ctype'
    const referrerHeader = req.headers && (req.headers.referer || req.headers.referrer) ? (req.headers.referer || req.headers.referrer) : 'no-referrer'

    const baseLog = `HTTP ${req.method} ${originalUrl} → ${statusCode} (${responseTimeMs}ms) host=${hostHeader} accept=${acceptHeader} ua=${userAgentHeader}`
    const ctypeLog = `resp.content-type=${responseContentType} referrer=${referrerHeader}`

    if (isAssetLikeRequest) {
      console.warn(`🔎 ASSET-REQUEST backend: ${baseLog} ${ctypeLog}`)
    } else {
      console.log(`📨 Request: ${baseLog} ${ctypeLog}`)
    }
  })

  next()
})

// CORS
app.use(cors)
app.use(corsMiddleware)

// Routes centralisées
app.use('/api', apiRoutes)
// Route d'auth
const authRoutes = require('./routes/auth')
app.use('/api/auth', authRoutes)

// Routes de debug (temporaires)
const debugRoutes = require('./routes/debug')
app.use('/api/debug', debugRoutes)

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  })
})

// Gestion globale des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur globale:', error)
  res.status(500).json({ 
    error: 'Erreur serveur interne',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Une erreur est survenue'
  })
})

// Fonction de démarrage
async function startServer() {
  try {
    // Connexion à la base de données
    await database.connect()
    
    // Démarrage du serveur avec gestion des ports occupés
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`)
      console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🌐 URL: http://localhost:${PORT}`)
    })
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${PORT} occupé, tentative sur le port ${PORT + 1}`)
        const newServer = app.listen(PORT + 1, '0.0.0.0', () => {
          console.log(`🚀 Serveur démarré sur le port ${PORT + 1}`)
          console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`)
          console.log(`🌐 URL: http://localhost:${PORT + 1}`)
        })
        
        newServer.on('error', (err2) => {
          console.error('❌ Impossible de démarrer le serveur sur les ports', PORT, 'et', PORT + 1)
          console.error('Erreur:', err2.message)
          process.exit(1)
        })
      } else {
        console.error('❌ Erreur serveur:', err)
        process.exit(1)
      }
    })
    
    // Planifier la synchronisation quotidienne
    scheduleDailySync()
  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error)
    process.exit(1)
  }
}

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...')
  await database.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...')
  await database.disconnect()
  process.exit(0)
})

// Démarrer le serveur
startServer()

module.exports = app