const cors = require('cors')

// Configuration CORS
const getCorsOptions = () => {
  // Liste d'origines autorisées (CSV) pour CORS. Toujours inclure localhost en dev.
  const ENV_ALLOWED_ORIGINS = (process.env.VITE_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  const DEFAULT_ALLOWED = ['http://localhost:5173']
  const FRONTEND_ORIGIN = process.env.VITE_FRONTEND_ORIGIN || null
  const ALLOWED_ORIGINS = Array.from(new Set([
    ...DEFAULT_ALLOWED,
    ...(FRONTEND_ORIGIN ? [FRONTEND_ORIGIN] : []),
    ...ENV_ALLOWED_ORIGINS
  ]))

  return {
    origin: (origin, cb) => {
      // Autoriser requêtes locales et outils (origin peut être undefined pour curl)
      if (!origin) return cb(null, true)
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'Connection']
  }
}

// Middleware CORS avec en-têtes forcés
const corsMiddleware = (req, res, next) => {
  const requestOrigin = req.headers.origin
  const corsOptions = getCorsOptions()
  
  if (requestOrigin && corsOptions.origin(requestOrigin, () => true)) {
    res.header('Access-Control-Allow-Origin', requestOrigin)
  }
  res.header('Vary', 'Origin')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control, Connection')
  // Désactiver l'indexation par les moteurs de recherche
  res.header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  // Forcer le rechargement des assets en production
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.header('Pragma', 'no-cache')
  res.header('Expires', '0')
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  
  next()
}

module.exports = {
  cors: cors(getCorsOptions()),
  corsMiddleware
}
