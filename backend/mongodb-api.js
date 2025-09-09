require('dotenv').config()
const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const cors = require('cors')
const cookieParser = require('cookie-parser')

const app = express()
const bcrypt = require('bcryptjs')
const PORT = process.env.PORT || 3001

// Middleware
// Liste d'origines autorisées (CSV) pour CORS. Toujours inclure localhost en dev.
// Exemples d'env: VITE_ALLOWED_ORIGINS="http://localhost:5173,https://fermeeutbouque.maisoncleo.fr"
const ENV_ALLOWED_ORIGINS = (process.env.VITE_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const DEFAULT_ALLOWED = ['http://localhost:5173']
const FRONTEND_ORIGIN = process.env.VITE_FRONTEND_ORIGIN || null
const ALLOWED_ORIGINS = Array.from(new Set([
  ...DEFAULT_ALLOWED,
  ...(FRONTEND_ORIGIN ? [FRONTEND_ORIGIN] : []),
  ...ENV_ALLOWED_ORIGINS
]))

const corsOptions = {
  origin: (origin, cb) => {
    // Autoriser requêtes locales et outils (origin peut être undefined pour curl)
    if (!origin) return cb(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// Forcer les en-têtes CORS explicitement sur toutes les réponses
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin
  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin)
  }
  res.header('Vary', 'Origin')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  // Désactiver l'indexation par les moteurs de recherche
  res.header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})
app.use(express.json())
app.use(cookieParser(process.env.APP_AUTH_SECRET || 'dev-secret'))

// Configuration MongoDB
const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017'
const dbName = 'maisoncleo'

// Configuration WooCommerce (utiliser les variables existantes)
const WOOCOMMERCE_URL = process.env.VITE_WORDPRESS_URL || 'https://maisoncleo.com'
const WOOCOMMERCE_CONSUMER_KEY = process.env.VITE_WORDPRESS_CONSUMER_KEY
const WOOCOMMERCE_CONSUMER_SECRET = process.env.VITE_WORDPRESS_CONSUMER_SECRET

console.log('🔍 URL MongoDB configurée:', mongoUrl)
console.log('🔍 Variables d\'environnement:', {
  MONGO_URI: process.env.MONGO_URI ? '✅ Définie' : '❌ Manquante',
  WOOCOMMERCE_URL: WOOCOMMERCE_URL ? '✅ Définie' : '❌ Manquante',
  WOOCOMMERCE_CONSUMER_KEY: WOOCOMMERCE_CONSUMER_KEY ? '✅ Définie' : '❌ Manquante',
  WOOCOMMERCE_CONSUMER_SECRET: WOOCOMMERCE_CONSUMER_SECRET ? '✅ Définie' : '❌ Manquante',
  PORT: process.env.PORT || '3001 (défaut)'
})

let db

// Connexion à MongoDB
async function connectToMongo() {
  try {
    const client = new MongoClient(mongoUrl)
    await client.connect()
    db = client.db(dbName)
    
    // Créer les collections et index nécessaires
    await createCollectionsAndIndexes()
    await ensureInitialPassword()
    
    console.log('✅ Connecté à MongoDB Atlas')
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error)
  }
}

// Créer les collections et index
async function createCollectionsAndIndexes() {
  try {
    // Collection des commandes synchronisées
    const ordersCollection = db.collection('orders_sync')
    await ordersCollection.createIndex({ order_id: 1 }, { unique: true })
    await ordersCollection.createIndex({ order_date: -1 })
    
    // Collection des articles de commande
    const itemsCollection = db.collection('order_items')
    await itemsCollection.createIndex({ order_id: 1 })
    await itemsCollection.createIndex({ order_id: 1, line_item_id: 1 }, { unique: true })
    
    // Collection des statuts de production
    const statusCollection = db.collection('production_status')
    await statusCollection.createIndex({ order_id: 1, line_item_id: 1 }, { unique: true })
    await statusCollection.createIndex({ production_type: 1 })
    await statusCollection.createIndex({ status: 1 })

    // Collection des images produits pour éviter les problèmes CORS
    const imagesCollection = db.collection('product_images')
    await imagesCollection.createIndex({ product_id: 1 }, { unique: true })
    
    // Collection des tricoteuses
    const tricoteusesCollection = db.collection('tricoteuses')
    await tricoteusesCollection.createIndex({ firstName: 1 })
    await tricoteusesCollection.createIndex({ createdAt: -1 })
    
    // Collection des assignations d'articles aux tricoteuses
    const assignmentsCollection = db.collection('article_assignments')
    await assignmentsCollection.createIndex({ article_id: 1 }, { unique: true })
    await assignmentsCollection.createIndex({ tricoteuse_id: 1 })
    await assignmentsCollection.createIndex({ status: 1 })
    await assignmentsCollection.createIndex({ assigned_at: -1 })
    
    // Collection des délais d'expédition
    const delaisCollection = db.collection('delais_expedition')
    await delaisCollection.createIndex({ dateCreation: -1 })
    await delaisCollection.createIndex({ derniereModification: -1 })

    // Collection des traductions personnalisées
    const customTranslations = db.collection('custom_translations')
    await customTranslations.createIndex({ key: 1 }, { unique: true })
    
    // Collection de configuration applicative (mot de passe, etc.)
    const settings = db.collection('app_settings')
    await settings.createIndex({ key: 1 }, { unique: true })
    
    console.log('✅ Collections et index créés')
  } catch (error) {
    console.error('❌ Erreur création collections:', error)
  }
}

// Crée un mot de passe initial si absent et si INIT_APP_PASSWORD est défini
async function ensureInitialPassword() {
  try {
    const settings = db.collection('app_settings')
    const existing = await settings.findOne({ key: 'access_password' })
    if (!existing) {
      const initial = process.env.INIT_APP_PASSWORD
      if (initial && typeof initial === 'string' && initial.length >= 3) {
        const hash = await bcrypt.hash(initial, 10)
        await settings.updateOne(
          { key: 'access_password' },
          { $set: { key: 'access_password', hash, updatedAt: new Date(), createdAt: new Date() } },
          { upsert: true }
        )
        console.log('🔐 Mot de passe initial créé via INIT_APP_PASSWORD')
      } else {
        console.log('ℹ️ Aucun mot de passe initial défini (INIT_APP_PASSWORD manquant)')
      }
    }
  } catch (e) {
    console.warn('Erreur ensureInitialPassword:', e.message)
  }
}

// Middleware de protection par cookie signé (httpOnly)
// Protection légère: GET/OPTIONS ouverts, écriture protégée par X-API-KEY si définie
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next()
  const expected = process.env.API_KEY || process.env.APP_API_KEY || process.env.BACKEND_API_KEY
  // Si aucune clé n'est définie en env, ne pas bloquer (dev)
  if (!expected) return next()
  const provided = req.header('x-api-key')
  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
})

// Routes API
// AUTH: stockage hashé du mot de passe d'accès
app.post('/api/auth/set-password', async (req, res) => {
  try {
    const { password } = req.body || {}
    if (!password || typeof password !== 'string' || password.length < 3) {
      return res.status(400).json({ success: false, error: 'Mot de passe invalide (min 3 caractères)' })
    }
    const hash = await bcrypt.hash(password, 10)
    await db.collection('app_settings').updateOne(
      { key: 'access_password' },
      { $set: { key: 'access_password', hash, updatedAt: new Date() } },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur POST /api/auth/set-password:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { password } = req.body || {}
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, error: 'Mot de passe requis' })
    }
    const doc = await db.collection('app_settings').findOne({ key: 'access_password' })
    if (!doc || !doc.hash) {
      return res.status(404).json({ success: false, error: 'Aucun mot de passe configuré' })
    }
    const ok = await bcrypt.compare(password, doc.hash)
    if (!ok) return res.status(401).json({ success: false, error: 'Mot de passe incorrect' })
    res.cookie('mc_auth', '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      signed: true
    })
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur POST /api/auth/verify:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  try {
    res.clearCookie('mc_auth')
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false })
  }
})
// GET /api/translations - Récupérer toutes les traductions personnalisées
app.get('/api/translations', async (req, res) => {
  try {
    const items = await db.collection('custom_translations').find({}).sort({ key: 1 }).toArray()
    res.json({ success: true, items: items.map(doc => ({ key: doc.key, value: doc.value })) })
  } catch (error) {
    console.error('Erreur GET /api/translations:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur interne' })
  }
})

// POST /api/translations - Créer/mettre à jour une traduction personnalisée
// Body: { key: string, value: string }
app.post('/api/translations', async (req, res) => {
  try {
    const { key, value } = req.body || {}
    if (!key || !value || typeof key !== 'string' || typeof value !== 'string') {
      return res.status(400).json({ success: false, error: 'Paramètres invalides' })
    }
    const normalizedKey = key.trim()
    const normalizedValue = value.trim()
    if (!normalizedKey || !normalizedValue) {
      return res.status(400).json({ success: false, error: 'Paramètres vides' })
    }
    await db.collection('custom_translations').updateOne(
      { key: normalizedKey },
      { $set: { key: normalizedKey, value: normalizedValue, updatedAt: new Date() } },
      { upsert: true }
    )
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur POST /api/translations:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur interne' })
  }
})

// DELETE /api/translations/:key - Supprimer une traduction personnalisée
app.delete('/api/translations/:key', async (req, res) => {
  try {
    const key = req.params.key
    if (!key) {
      return res.status(400).json({ success: false, error: 'Clé manquante' })
    }
    await db.collection('custom_translations').deleteOne({ key })
    res.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/translations/:key:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur interne' })
  }
})

// GET /api/health - Vérifier la santé du serveur
app.get('/api/health', async (req, res) => {
  try {
    let dbConnected = false
    if (db) {
      try {
        await db.admin().ping()
        dbConnected = true
      } catch (_) {
        dbConnected = false
      }
    }
    return res.json({
      status: 'ok',
      message: 'Serveur opérationnel',
      dbConnected,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return res.json({
      status: 'ok',
      message: 'Serveur opérationnel',
      dbConnected: false,
      timestamp: new Date().toISOString()
    })
  }
})

// GET /api/woocommerce/products/:productId/permalink - Récupérer le permalink d'un produit
app.get('/api/woocommerce/products/:productId/permalink', async (req, res) => {
  try {
    const { productId } = req.params
    
    if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return res.status(500).json({ 
        error: 'Configuration WooCommerce manquante',
        message: 'Veuillez configurer WOOCOMMERCE_CONSUMER_KEY et WOOCOMMERCE_CONSUMER_SECRET'
      })
    }
    
    const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
    const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${productId}?${authParams}&_fields=id,permalink`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Timeout de 5 secondes
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Produit non trouvé' })
      } else if (response.status >= 500) {
        return res.status(502).json({ error: 'Erreur serveur WooCommerce' })
      } else {
        return res.status(response.status).json({ error: `Erreur HTTP: ${response.status}` })
      }
    }
    
    const product = await response.json()
    const permalink = product?.permalink || null
    
    if (!permalink) {
      return res.status(404).json({ error: 'Permalink non trouvé pour ce produit' })
    }
    
    res.json({ 
      success: true,
      product_id: parseInt(productId),
      permalink: permalink
    })
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return res.status(408).json({ error: 'Timeout lors de la récupération du permalink' })
    }
    
    console.error('Erreur GET /woocommerce/products/:productId/permalink:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/woocommerce/products/permalink/batch - Récupérer les permalinks de plusieurs produits
app.post('/api/woocommerce/products/permalink/batch', async (req, res) => {
  try {
    const { productIds } = req.body
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Liste de productIds invalide' })
    }
    
    if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return res.status(500).json({ 
        error: 'Configuration WooCommerce manquante',
        message: 'Veuillez configurer WOOCOMMERCE_CONSUMER_KEY et WOOCOMMERCE_CONSUMER_SECRET'
      })
    }
    
    const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
    const results = []
    const errors = []
    
    // Traiter les produits en parallèle avec un délai pour éviter la surcharge
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i]
      
      try {
        // Délai entre les requêtes pour éviter la surcharge
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${productId}?${authParams}&_fields=id,permalink`
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(3000)
        })
        
        if (response.ok) {
          const product = await response.json()
          if (product?.permalink) {
            results.push({
              product_id: parseInt(productId),
              permalink: product.permalink
            })
          }
        } else {
          errors.push({
            product_id: parseInt(productId),
            error: `HTTP ${response.status}`,
            status: response.status
          })
        }
      } catch (error) {
        errors.push({
          product_id: parseInt(productId),
          error: error.message,
          type: error.name
        })
      }
    }
    
    res.json({ 
      success: true,
      results: results,
      errors: errors,
      total_processed: productIds.length,
      total_success: results.length,
      total_errors: errors.length
    })
    
  } catch (error) {
    console.error('Erreur POST /woocommerce/products/permalink/batch:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/sync/orders - Synchroniser les commandes WooCommerce
app.post('/api/sync/orders', async (req, res) => {
  try {
    addSyncLog('🔄 Début de la synchronisation des commandes', 'info')
    
    // Récupérer les commandes depuis WooCommerce
    let woocommerceOrders = []
    let noOrdersFetched = false
    const sinceRaw = (req.query && req.query.since) || (req.body && req.body.since) || null
    let afterIso = null
    if (sinceRaw) {
      const sinceDate = new Date(sinceRaw)
      if (!isNaN(sinceDate)) {
        // WooCommerce attend un ISO8601 complet
        sinceDate.setHours(0,0,0,0)
        afterIso = sinceDate.toISOString()
        addSyncLog(`📅 Filtre date activé: depuis ${afterIso}`, 'info')
      } else {
        addSyncLog(`⚠️ Paramètre since invalide: ${sinceRaw}`, 'warning')
      }
    } else {
      // Mode incrémental par défaut: récupérer uniquement après la dernière commande connue
      try {
        const latest = await db.collection('orders_sync').find({}).sort({ order_date: -1 }).limit(1).toArray()
        if (latest && latest.length > 0 && latest[0].order_date) {
          const lastDate = new Date(latest[0].order_date)
          if (!isNaN(lastDate)) {
            afterIso = lastDate.toISOString()
            addSyncLog(`📅 Incrémental: récupération après ${afterIso}`, 'info')
          }
        } else {
          // Si aucune commande en base, ne pas forcer d'historique: partir de maintenant
          const now = new Date()
          afterIso = now.toISOString()
          addSyncLog(`📅 Aucun historique: récupération à partir de maintenant (${afterIso})`, 'info')
        }
      } catch (e) {
        addSyncLog(`⚠️ Impossible de déterminer la dernière commande: ${e.message}`, 'warning')
      }
    }
    
    if (WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET) {
      try {
        const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
        // 1) Vérification rapide: y a-t-il des commandes nouvelles après la dernière date ?
        let noNewQuick = false
        if (afterIso) {
          const quickUrlBase = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?${authParams}&per_page=1&page=1&status=processing,completed&orderby=date&order=desc&_fields=id,date`
          const quickUrl = `${quickUrlBase}&after=${encodeURIComponent(afterIso)}`
          const quickRes = await fetch(quickUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) })
          if (quickRes.ok) {
            const quickData = await quickRes.json()
            if (Array.isArray(quickData) && quickData.length === 0) {
              addSyncLog('ℹ️ Aucune commande à synchroniser (vérification rapide)', 'info')
              noNewQuick = true
            }
          }
        }

        // 2) Récupération paginée seulement si nécessaire
        const perPage = 100
        let page = 1
        let fetched = []
        currentSyncAbortController = new AbortController()
        if (!noNewQuick) {
          while (true) {
            const base = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?${authParams}&per_page=${perPage}&page=${page}&status=processing,completed&orderby=date&order=desc`
            const url = afterIso ? `${base}&after=${encodeURIComponent(afterIso)}` : base
            const response = await fetch(url, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: currentSyncAbortController.signal
            })
            if (!response.ok) {
              addSyncLog(`⚠️ Erreur HTTP ${response.status} lors de la récupération des commandes (page ${page})`, 'warning')
              break
            }
            const data = await response.json()
            fetched = fetched.concat(data)
            addSyncLog(`📥 Page ${page} récupérée: ${data.length} commandes`, 'info')
            if (data.length < perPage) break
            page += 1
          }
          woocommerceOrders = fetched
        } else {
          noOrdersFetched = true
        }

        // 3) Nettoyage des commandes WooCommerce en échec: suppression en BDD
        try {
          let failedPage = 1
          let failedFetched = []
          while (true) {
            const fbase = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?${authParams}&per_page=${perPage}&page=${failedPage}&status=failed&orderby=date&order=desc&_fields=id,date`
            const furl = afterIso ? `${fbase}&after=${encodeURIComponent(afterIso)}` : fbase
            const fres = await fetch(furl, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) })
            if (!fres.ok) break
            const fdata = await fres.json()
            failedFetched = failedFetched.concat(fdata)
            if (fdata.length < perPage) break
            failedPage += 1
          }
          if (Array.isArray(failedFetched) && failedFetched.length > 0) {
            const failedIds = failedFetched.map(x => parseInt(x.id)).filter(x => !Number.isNaN(x))
            if (failedIds.length > 0) {
              const ordersCollection = db.collection('orders_sync')
              const itemsCollection = db.collection('order_items')
              const statusCollection = db.collection('production_status')
              const delOrders = await ordersCollection.deleteMany({ order_id: { $in: failedIds } })
              const delItems = await itemsCollection.deleteMany({ order_id: { $in: failedIds } })
              const delStatuses = await statusCollection.deleteMany({ order_id: { $in: failedIds } })
              addSyncLog(`🗑️ Commandes échouées supprimées: ${delOrders.deletedCount || 0} (items: ${delItems.deletedCount || 0}, statuts: ${delStatuses.deletedCount || 0})`, 'info')
            }
          }
        } catch (cleanupErr) {
          addSyncLog(`⚠️ Erreur lors du nettoyage des commandes échouées: ${cleanupErr.message}`, 'warning')
        }

        // 4) Vérification/log des articles retirés ou annulés côté Woo par rapport à la BDD
        try {
          if (Array.isArray(woocommerceOrders) && woocommerceOrders.length > 0) {
            const wooOrderIds = woocommerceOrders.map(o => parseInt(o.id)).filter(n => !Number.isNaN(n))
            const itemsCollection = db.collection('order_items')
            const dbItems = await itemsCollection.find(
              { order_id: { $in: wooOrderIds } },
              { projection: { order_id: 1, line_item_id: 1 } }
            ).toArray()

            const wooOrderToItemIds = new Map()
            const cancelledOrderIds = new Set()
            for (const ord of woocommerceOrders) {
              const oid = parseInt(ord.id)
              if (Number.isNaN(oid)) continue
              const ids = new Set((ord.line_items || []).map(li => parseInt(li.id)).filter(n => !Number.isNaN(n)))
              wooOrderToItemIds.set(oid, ids)
              const st = String(ord.status || '').toLowerCase()
              if (st === 'cancelled' || st === 'refunded') {
                cancelledOrderIds.add(oid)
              }
            }

            let missingCount = 0
            let missingOrders = new Set()
            for (const it of dbItems) {
              const setIds = wooOrderToItemIds.get(parseInt(it.order_id))
              if (!setIds) continue
              if (!setIds.has(parseInt(it.line_item_id))) {
                missingCount += 1
                missingOrders.add(parseInt(it.order_id))
              }
            }

            // Compter les articles dans des commandes annulées
            let cancelledItemsCount = 0
            if (cancelledOrderIds.size > 0) {
              const cancelledItems = await itemsCollection.countDocuments({ order_id: { $in: Array.from(cancelledOrderIds) } })
              cancelledItemsCount = cancelledItems || 0
            }

            if (missingCount > 0) {
              addSyncLog(`🧹 Articles retirés côté Woo détectés: ${missingCount} sur ${missingOrders.size} commande(s) (log uniquement)`, 'info')
            } else {
              addSyncLog('🧹 Aucun article retiré côté Woo détecté', 'info')
            }
            if (cancelledItemsCount > 0) {
              addSyncLog(`🚫 Articles appartenant à des commandes annulées: ${cancelledItemsCount} (log uniquement)`, 'info')
            }
          }
        } catch (diffErr) {
          addSyncLog(`⚠️ Erreur lors de la vérification des articles retirés/annulés: ${diffErr.message}`, 'warning')
        }
      } catch (error) {
        addSyncLog(`⚠️ Erreur lors de la récupération des commandes WooCommerce: ${error.message}`, 'error')
      } finally {
        currentSyncAbortController = null
      }
    } else {
      addSyncLog('⚠️ Clés WooCommerce non configurées, synchronisation impossible', 'error')
      return res.status(500).json({ 
        error: 'Configuration WooCommerce manquante',
        message: 'Veuillez configurer les clés API WooCommerce'
      })
    }
    
    let syncResults = { ordersCreated: 0, ordersUpdated: 0, itemsCreated: 0, itemsUpdated: 0 }
    if (woocommerceOrders.length === 0) {
      addSyncLog('ℹ️ Aucune commande à synchroniser', 'info')
      console.log('🔄 Backend - Aucune commande à synchroniser')
    } else {
      // Synchroniser les commandes
      addSyncLog('🔄 Début de la synchronisation avec la base de données...', 'info')
      syncResults = await syncOrdersToDatabase(woocommerceOrders)
      console.log('🔄 Backend - Résultats de la synchronisation:', syncResults)
    }
    
    // Afficher le message approprié selon le résultat
    if (syncResults.ordersCreated === 0 && syncResults.itemsCreated === 0) {
      addSyncLog('ℹ️ Aucune nouvelle commande à traiter', 'info')
      console.log('🔄 Backend - Aucune nouvelle commande à traiter')
    } else {
      addSyncLog('✅ Synchronisation terminée avec succès', 'success')
      console.log('🔄 Backend - Synchronisation terminée avec succès')
    }
    
    console.log('🔄 Backend - Envoi de la réponse finale avec les résultats:', syncResults)
    res.json({
      success: true,
      message: 'Synchronisation réussie',
      results: syncResults
    })
    
  } catch (error) {
    addSyncLog(`❌ Erreur lors de la synchronisation: ${error.message}`, 'error')
    res.status(500).json({ 
      error: 'Erreur lors de la synchronisation',
      message: error.message 
    })
  }
})

// GET /api/orders/search/:orderNumber - Rechercher une commande par numéro
app.get('/api/orders/search/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params
    
    // Rechercher la commande par numéro
    const order = await db.collection('orders_sync').findOne({ 
      order_number: orderNumber 
    })
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Commande non trouvée' 
      })
    }
    
    // Récupérer les articles de la commande
    const itemsCollection = db.collection('order_items')
    const items = await itemsCollection.find({ 
      order_id: order.order_id 
    }).toArray()
    
    if (items.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucun article trouvé pour cette commande' 
      })
    }
    
    // Récupérer les statuts de production pour chaque article
    const statusCollection = db.collection('production_status')
    const itemsWithStatus = await Promise.all(items.map(async (item) => {
      const status = await statusCollection.findOne({
        line_item_id: item.line_item_id
      })
      
      return {
        ...item,
        production_status: status || {
          status: 'a_faire',
          production_type: null,
          assigned_to: null
        }
      }
    }))
    
    // Déterminer le type de production principal (le plus fréquent ou le premier trouvé)
    let mainProductionType = null
    const productionStatuses = itemsWithStatus
      .map(item => item.production_status)
      .filter(status => status && status.production_type)
    
    if (productionStatuses.length > 0) {
      // Compter les types de production
      const typeCounts = {}
      productionStatuses.forEach(status => {
        if (status.production_type) {
          typeCounts[status.production_type] = (typeCounts[status.production_type] || 0) + 1
        }
      })
      
      // Prendre le type le plus fréquent, sinon le premier
      if (Object.keys(typeCounts).length > 0) {
        mainProductionType = Object.entries(typeCounts).reduce((a, b) => 
          typeCounts[a[0]] > typeCounts[b[0]] ? a : b
        )[0]
      } else {
        mainProductionType = productionStatuses[0]?.production_type || null
      }
    }
    
    // Construire la réponse avec les informations de production
    const orderWithProduction = {
      ...order,
      production_type: mainProductionType,
      line_item_id: items[0].line_item_id,
      items: itemsWithStatus,
      all_production_statuses: productionStatuses // Pour debug
    }
    
    // Log pour debug
    console.log(`🔍 Recherche commande ${orderNumber}:`, {
      order_id: order.order_id,
      total_items: itemsWithStatus.length,
      production_type: mainProductionType,
      items_with_status: itemsWithStatus.map(item => ({
        line_item_id: item.line_item_id,
        product_name: item.product_name,
        has_production_status: !!item.production_status,
        production_type: item.production_status?.production_type,
        status: item.production_status?.status
      }))
    })
    
    res.json({ 
      success: true, 
      order: orderWithProduction 
    })
  } catch (error) {
    console.error('Erreur GET /orders/search/:orderNumber:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/orders/:orderId/status - Mettre à jour le statut d'une commande
app.put('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params
    const { status: newStatus } = req.body
    
    if (!newStatus) {
      return res.status(400).json({ 
        success: false, 
        error: 'Statut requis' 
      })
    }
    
    // Mettre à jour le statut dans la collection production_status
    const statusCollection = db.collection('production_status')
    const result = await statusCollection.updateMany(
      { order_id: parseInt(orderId) },
      { 
        $set: { 
          status: newStatus,
          updated_at: new Date()
        } 
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Aucune commande trouvée avec cet ID' 
      })
    }
    
    console.log(`✅ Statut mis à jour pour la commande ${orderId}: ${newStatus}`)
    
    res.json({ 
      success: true, 
      message: `Statut mis à jour pour ${result.modifiedCount} article(s)`,
      orderId: parseInt(orderId),
      newStatus,
      modifiedCount: result.modifiedCount
    })
    
  } catch (error) {
    console.error('Erreur PUT /orders/:orderId/status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/orders/:orderId/note - Mettre à jour la note client d'une commande
app.put('/api/orders/:orderId/note', async (req, res) => {
  try {
    const { orderId } = req.params
    const { note } = req.body || {}
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId manquant' })
    const numericOrderId = parseInt(orderId, 10)
    if (Number.isNaN(numericOrderId)) return res.status(400).json({ success: false, error: 'orderId invalide' })
    const ordersCollection = db.collection('orders_sync')
    const result = await ordersCollection.updateOne(
      { order_id: numericOrderId },
      { $set: { customer_note: note || '', updated_at: new Date() } }
    )
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, error: 'Commande introuvable' })
    }
    return res.json({ success: true })
  } catch (error) {
    console.error('Erreur PUT /api/orders/:orderId/note:', error)
    return res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// GET /api/orders - Récupérer toutes les commandes avec articles et statuts
app.get('/api/orders', async (req, res) => {
  try {
    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    
    // Récupérer toutes les commandes avec un timeout plus long
    const orders = await ordersCollection.find({})
      .sort({ order_date: 1 })
      .maxTimeMS(30000) // 30 secondes max
      .toArray()
    
    // Logs diagnostic: volume et bornes de dates brutes
    try {
      const rawCount = orders.length
      const rawFirst = rawCount > 0 ? orders[0].order_date : null
      const rawLast = rawCount > 0 ? orders[rawCount - 1].order_date : null
      console.log(`[ORDERS] Brutes: ${rawCount} | min=${rawFirst} | max=${rawLast}`)
    } catch {}
    
    if (orders.length === 0) {
      return res.json({ orders: [] })
    }
    
    // Traiter les commandes par lots pour éviter les timeouts
    const BATCH_SIZE = 50
    const ordersWithDetails = []
    
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE)
      
      const batchResults = await Promise.all(batch.map(async (order) => {
        try {
          const items = await itemsCollection.find({ order_id: order.order_id })
            .maxTimeMS(10000) // 10 secondes max par commande
            .toArray()
          
          // Ajouter les statuts de production à chaque article
          const itemsWithStatus = await Promise.all(items.map(async (item) => {
            try {
              const status = await statusCollection.findOne({
                order_id: order.order_id,
                line_item_id: item.line_item_id
              }, { maxTimeMS: 5000 })
              
              return {
                ...item,
                production_status: status || {
                  status: 'a_faire',
                  production_type: null,
                  assigned_to: null
                }
              }
            } catch (itemError) {
              console.error(`❌ Erreur statut article ${item.line_item_id}:`, itemError.message)
              return {
                ...item,
                production_status: {
                  status: 'a_faire',
                  production_type: null,
                  assigned_to: null
                }
              }
            }
          }))
          
          return {
            ...order,
            items: itemsWithStatus
          }
        } catch (orderError) {
          console.error(`❌ Erreur commande ${order.order_number}:`, orderError.message)
          return {
            ...order,
            items: []
          }
        }
      }))
      
      ordersWithDetails.push(...batchResults)
      
      // Petite pause entre les lots pour éviter de surcharger MongoDB
      if (i + BATCH_SIZE < orders.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Garantir un tri croissant par date dans la réponse (ou ajuster selon besoin UI)
    ordersWithDetails.sort((a, b) => new Date(a.order_date || 0) - new Date(b.order_date || 0))
    try {
      const cnt = ordersWithDetails.length
      const first = cnt > 0 ? ordersWithDetails[0].order_date : null
      const last = cnt > 0 ? ordersWithDetails[cnt - 1].order_date : null
      const lastOrderNumber = cnt > 0 ? ordersWithDetails[cnt - 1].order_number : null
      console.log(`[ORDERS] Enrichies: ${cnt} | min=${first} | max=${last} | lastOrder=#${lastOrderNumber}`)
    } catch {}
    res.json({ orders: ordersWithDetails })
  } catch (error) {
    console.error('❌ Erreur GET /orders:', error)
    res.status(500).json({ 
      error: 'Erreur serveur', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// DELETE /api/orders/:orderId - Supprimer une commande et ses éléments associés
app.delete('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const numericOrderId = parseInt(orderId)
    if (Number.isNaN(numericOrderId)) {
      return res.status(400).json({ success: false, error: 'orderId invalide' })
    }

    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')

    const orderDelete = await ordersCollection.deleteOne({ order_id: numericOrderId })
    const itemsDelete = await itemsCollection.deleteMany({ order_id: numericOrderId })
    const statusDelete = await statusCollection.deleteMany({ order_id: numericOrderId })

    if (orderDelete.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' })
    }

    console.log(`🗑️ Commande ${numericOrderId} supprimée (${itemsDelete.deletedCount} articles, ${statusDelete.deletedCount} statuts)`)
    res.json({
      success: true,
      orderId: numericOrderId,
      deleted: {
        order: orderDelete.deletedCount,
        items: itemsDelete.deletedCount,
        statuses: statusDelete.deletedCount
      }
    })
  } catch (error) {
    console.error('Erreur DELETE /orders/:orderId:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// POST /api/orders/:orderId/archive - Archiver une commande complète avant suppression
app.post('/api/orders/:orderId/archive', async (req, res) => {
  try {
    const { orderId } = req.params
    const numericOrderId = parseInt(orderId)
    if (Number.isNaN(numericOrderId)) {
      return res.status(400).json({ success: false, error: 'orderId invalide' })
    }

    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    const archiveCollection = db.collection('archived_orders')

    const orderDoc = await ordersCollection.findOne({ order_id: numericOrderId })
    if (!orderDoc) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' })
    }
    const items = await itemsCollection.find({ order_id: numericOrderId }).toArray()
    const statuses = await statusCollection.find({ order_id: numericOrderId }).toArray()

    const archiveDoc = {
      order_id: numericOrderId,
      archived_at: new Date().toISOString(),
      order: orderDoc,
      items,
      statuses
    }
    await archiveCollection.insertOne(archiveDoc)

    res.json({ success: true, archived: true, orderId: numericOrderId })
  } catch (error) {
    console.error('Erreur POST /orders/:orderId/archive:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// GET /api/archived-orders - Lister les commandes archivées (résumé)
app.get('/api/archived-orders', async (req, res) => {
  try {
    const { limit = 200, page = 1 } = req.query
    const nLimit = Math.min(500, Math.max(1, parseInt(limit)))
    const nPage = Math.max(1, parseInt(page))
    const coll = db.collection('archived_orders')
    const cursor = coll.find({}, { projection: { order_id: 1, archived_at: 1, 'order.order_number': 1, 'order.customer_name': 1, 'items': { $slice: 1 } } })
      .sort({ archived_at: -1 })
      .skip((nPage - 1) * nLimit)
      .limit(nLimit)
    const rows = await cursor.toArray()
    const total = await coll.countDocuments()
    res.json({ success: true, data: rows, pagination: { page: nPage, limit: nLimit, total } })
  } catch (error) {
    console.error('Erreur GET /api/archived-orders:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// GET /api/archived-orders/stats - Statistiques basées sur les archives
app.get('/api/archived-orders/stats', async (req, res) => {
  try {
    const coll = db.collection('archived_orders')
    // Ne charger que le nécessaire
    const cursor = coll.find({}, { projection: { archived_at: 1, statuses: 1 } })
    const all = await cursor.toArray()

    const weekKey = (d) => {
      const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      const dayNum = date.getUTCDay() || 7
      date.setUTCDate(date.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
      return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
    }
    const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const yearKey = (d) => `${d.getFullYear()}`
    const seamName = (s) => {
      const at = s?.assigned_to
      if (!at) return 'Non assignée'
      if (typeof at === 'string') return at
      return at.firstName || at.name || at.displayName || 'Non assignée'
    }

    const sum = (map, key) => map.set(key, (map.get(key) || 0) + 1)
    const wk = new Map(), mo = new Map(), yr = new Map()

    for (const doc of all) {
      const d = doc.archived_at ? new Date(doc.archived_at) : null
      if (!d || isNaN(d.getTime())) continue
      const w = weekKey(d), m = monthKey(d), y = yearKey(d)
      const statuses = Array.isArray(doc.statuses) ? doc.statuses : []
      for (const st of statuses) {
        const type = (st.production_type || '-').toLowerCase()
        if (st.status !== 'termine') continue
        if (type !== 'couture' && type !== 'maille') continue
        const seam = seamName(st)
        sum(wk, `${w}|${type}|${seam}`)
        sum(mo, `${m}|${type}|${seam}`)
        sum(yr, `${y}|${type}|${seam}`)
      }
    }

    const mapToRows = (map) => Array.from(map.entries()).map(([key, count]) => {
      const [period, type, seamstress] = key.split('|')
      return { period, type, seamstress, count }
    })

    res.json({ success: true, stats: {
      weekly: mapToRows(wk),
      monthly: mapToRows(mo),
      yearly: mapToRows(yr)
    } })
  } catch (error) {
    console.error('Erreur GET /api/archived-orders/stats:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// DELETE /api/orders/:orderId/items/:lineItemId - Supprimer un article d'une commande
app.delete('/api/orders/:orderId/items/:lineItemId', async (req, res) => {
  try {
    const { orderId, lineItemId } = req.params
    const numericOrderId = parseInt(orderId)
    const numericLineItemId = parseInt(lineItemId)
    if (Number.isNaN(numericOrderId) || Number.isNaN(numericLineItemId)) {
      return res.status(400).json({ success: false, error: 'Paramètres invalides' })
    }

    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')

    const itemDelete = await itemsCollection.deleteOne({ order_id: numericOrderId, line_item_id: numericLineItemId })
    const statusDelete = await statusCollection.deleteOne({ order_id: numericOrderId, line_item_id: numericLineItemId })

    if (itemDelete.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Article introuvable' })
    }

    console.log(`🗑️ Article ${numericLineItemId} supprimé de la commande ${numericOrderId} (statut supprimé: ${statusDelete.deletedCount})`)
    res.json({
      success: true,
      orderId: numericOrderId,
      lineItemId: numericLineItemId,
      deleted: {
        item: itemDelete.deletedCount,
        status: statusDelete.deletedCount
      }
    })
  } catch (error) {
    console.error('Erreur DELETE /orders/:orderId/items/:lineItemId:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// GET /api/orders/production/:type - Récupérer les commandes par type de production
app.get('/api/orders/production/:type', async (req, res) => {
  try {
    const { type } = req.params // 'couture' ou 'maille'
    const statusCollection = db.collection('production_status')
    const itemsCollection = db.collection('order_items')
    
    // Récupérer les articles assignés à ce type de production
    const assignedItems = await statusCollection.find({
      production_type: type
    }).toArray()
    
    console.log(`📊 Articles trouvés pour ${type}:`, assignedItems.length)
    
    // Si aucun article n'est dispatché, essayer de dispatcher automatiquement
    if (assignedItems.length === 0) {
      console.log(`🔄 Aucun article dispatché pour ${type}, tentative de dispatch automatique...`)
      
      // Récupérer tous les articles
      const allItems = await itemsCollection.find({}).toArray()
      console.log(`📋 Total d'articles en base:`, allItems.length)
      
      // Dispatcher automatiquement les articles non dispatchés
      for (const item of allItems) {
        const existingStatus = await statusCollection.findOne({
          order_id: item.order_id,
          line_item_id: item.line_item_id
        })
        
        if (!existingStatus) {
          const productionType = determineProductionType(item.product_name)
          console.log(`📋 Dispatch automatique: ${item.product_name} -> ${productionType}`)
          
          if (productionType === type) {
            const productionStatus = {
              order_id: parseInt(item.order_id),
              line_item_id: parseInt(item.line_item_id),
              status: 'a_faire',
              production_type: productionType,
              assigned_to: null,
              created_at: new Date(),
              updated_at: new Date()
            }
            
            await statusCollection.insertOne(productionStatus)
            assignedItems.push(productionStatus)
          }
        }
      }
      
      console.log(`✅ Articles dispatchés pour ${type}:`, assignedItems.length)
    }
    
    // Récupérer les détails des commandes et articles
    const ordersWithDetails = await Promise.all(assignedItems.map(async (status) => {
      const order = await db.collection('orders_sync').findOne({ order_id: status.order_id })
      const item = await db.collection('order_items').findOne({
        order_id: status.order_id,
        line_item_id: status.line_item_id
      })
      
      // Retourner la structure attendue par le frontend
      return {
        ...order,
        items: [{
          ...item,
          production_status: status
        }]
      }
    }))
    
    // Trier les commandes par date (anciennes vers récentes)
    ordersWithDetails.sort((a, b) => new Date(a.order_date) - new Date(b.order_date))
    
    res.json({ orders: ordersWithDetails })
  } catch (error) {
    console.error('Erreur GET /orders/production/:type:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/production/dispatch - Dispatcher un article vers la production
app.post('/api/production/dispatch', async (req, res) => {
  try {
    const { order_id, line_item_id, production_type, assigned_to } = req.body
    
    if (!order_id || !line_item_id || !production_type) {
      return res.status(400).json({ error: 'Paramètres manquants' })
    }
    
    const statusCollection = db.collection('production_status')
    
    const result = await statusCollection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          order_id: parseInt(order_id),
          line_item_id: parseInt(line_item_id),
          status: 'en_cours',
          production_type,
          assigned_to: assigned_to || null,
          updated_at: new Date()
        }
      },
      { upsert: true }
    )
    
    res.json({ 
      success: true, 
      message: 'Article dispatché vers la production',
      result 
    })
  } catch (error) {
    console.error('Erreur POST /production/dispatch:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/production/redispatch - Redispatch un article vers un autre type de production
app.put('/api/production/redispatch', async (req, res) => {
  try {
    const { order_id, line_item_id, new_production_type } = req.body
    
    if (!order_id || !line_item_id || !new_production_type) {
      return res.status(400).json({ error: 'Paramètres manquants' })
    }
    
    const statusCollection = db.collection('production_status')
    
    // Vérifier que l'article existe
    const existingStatus = await statusCollection.findOne({
      order_id: parseInt(order_id),
      line_item_id: parseInt(line_item_id)
    })
    
    if (!existingStatus) {
      return res.status(404).json({ error: 'Article non trouvé' })
    }
    
    // Mettre à jour le type de production
    const result = await statusCollection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          production_type: new_production_type,
          updated_at: new Date()
        }
      }
    )
    
    res.json({ 
      success: true, 
      message: `Article redispatché vers ${new_production_type}`,
      result 
    })
  } catch (error) {
    console.error('Erreur PUT /production/redispatch:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/production/status - Mettre à jour le statut de production (temps réel)
app.put('/api/production/status', async (req, res) => {
  try {
    const { order_id, line_item_id, status, notes, urgent } = req.body
    
    if (!order_id || !line_item_id || !status) {
      return res.status(400).json({ error: 'Paramètres manquants' })
    }
    
    const statusCollection = db.collection('production_status')
    const assignmentsCollection = db.collection('article_assignments')
    
    const result = await statusCollection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          status,
          notes: notes || null,
          ...(typeof urgent === 'boolean' ? { urgent: urgent === true } : {}),
          updated_at: new Date()
        }
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Article non trouvé' })
    }
    
    // Synchroniser automatiquement les assignations
    if (status === 'a_faire') {
      // Si remis en "à faire", supprimer l'assignation
      await assignmentsCollection.deleteOne({ 
        order_id: parseInt(order_id), 
        line_item_id: parseInt(line_item_id)
      })
    } else {
      // Sinon, mettre à jour le statut de l'assignation si elle existe
      await assignmentsCollection.updateOne(
        { 
          order_id: parseInt(order_id), 
          line_item_id: parseInt(line_item_id)
        },
        { $set: { status, updated_at: new Date() } }
      )
    }
    

    
    res.json({ 
      success: true, 
      message: 'Statut mis à jour en temps réel',
      result 
    })
  } catch (error) {
    console.error('Erreur PUT /production/status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// PUT /api/production/urgent - Marquer/démarquer l'urgence d'un article
app.put('/api/production/urgent', async (req, res) => {
  try {
    const { order_id, line_item_id, urgent } = req.body
    if (typeof urgent !== 'boolean' || !order_id || !line_item_id) {
      return res.status(400).json({ success: false, error: 'Paramètres invalides' })
    }
    const statusCollection = db.collection('production_status')
    const result = await statusCollection.updateOne(
      { order_id: parseInt(order_id), line_item_id: parseInt(line_item_id) },
      { $set: { urgent: urgent === true, updated_at: new Date() } },
      { upsert: true }
    )
    res.json({ success: true, result })
  } catch (error) {
    console.error('Erreur PUT /production/urgent:', error)
    res.status(500).json({ success: false, error: 'Erreur serveur' })
  }
})

// Fonctions utilitaires

// Fonction pour récupérer les commandes depuis WooCommerce
async function fetchOrdersFromWooCommerce(sinceDate = null) {
  let woocommerceOrders = []
  let afterIso = null
  
  if (sinceDate) {
    const since = new Date(sinceDate)
    if (!isNaN(since)) {
      since.setHours(0,0,0,0)
      afterIso = since.toISOString()
    }
  } else {
    // Mode incrémental par défaut: récupérer uniquement après la dernière commande connue
    try {
      const latest = await db.collection('orders_sync').find({}).sort({ order_date: -1 }).limit(1).toArray()
      if (latest && latest.length > 0 && latest[0].order_date) {
        const lastDate = new Date(latest[0].order_date)
        if (!isNaN(lastDate)) {
          afterIso = lastDate.toISOString()
        }
      } else {
        // Si aucune commande en base, récupérer les 30 derniers jours
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        afterIso = thirtyDaysAgo.toISOString()
      }
    } catch (e) {
      console.warn(`Impossible de déterminer la dernière commande: ${e.message}`)
    }
  }
  
  if (WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET) {
    try {
      const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
      
      // Récupération paginée
      const perPage = 100
      let page = 1
      let fetched = []
      
      while (true) {
        const base = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders?${authParams}&per_page=${perPage}&page=${page}&status=processing,completed&orderby=date&order=desc`
        const url = afterIso ? `${base}&after=${encodeURIComponent(afterIso)}` : base
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(30000) // 30 secondes timeout
        })
        
        if (!response.ok) {
          console.warn(`Erreur HTTP ${response.status} lors de la récupération des commandes (page ${page})`)
          break
        }
        
        const data = await response.json()
        fetched = fetched.concat(data)
        
        if (data.length < perPage) break
        page += 1
      }
      
      woocommerceOrders = fetched
      console.log(`📦 ${woocommerceOrders.length} commandes récupérées depuis WooCommerce`)
      
    } catch (error) {
      console.error(`Erreur lors de la récupération des commandes WooCommerce: ${error.message}`)
      throw error
    }
  } else {
    throw new Error('Configuration WooCommerce manquante')
  }
  
  return woocommerceOrders
}

// Fonction pour synchroniser toutes les commandes vers la base de données
async function syncOrdersToDatabase(woocommerceOrders) {
  const syncResults = {
    ordersCreated: 0,
    ordersUpdated: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    errors: []
  }
  
  addSyncLog(`🔄 Traitement de ${woocommerceOrders.length} commandes (création/mise à jour)...`, 'info')
  
  // Traiter toutes les commandes en upsert
  for (const order of woocommerceOrders) {
    try {
      const orderResult = await syncOrderToDatabase(order)
      if (orderResult.created) {
        syncResults.ordersCreated++
      } else if (orderResult.updated) {
        syncResults.ordersUpdated++
      }

      for (const item of order.line_items || []) {
        const itemResult = await syncOrderItem(order.id, item)
        if (itemResult.created) {
          syncResults.itemsCreated++
          // Dispatcher automatiquement uniquement les nouveaux articles
          await dispatchItemToProduction(order.id, item.id, item.name)
        } else if (itemResult.updated) {
          syncResults.itemsUpdated++
        }
      }
    } catch (error) {
      addSyncLog(`❌ Erreur sur la commande #${order.number}: ${error.message}`, 'error')
      syncResults.errors.push({
        orderId: order.id,
        error: error.message
      })
    }
  }
  
  addSyncLog(`📊 Résultats: ${syncResults.ordersCreated} commandes créées, ${syncResults.ordersUpdated} mises à jour, ${syncResults.itemsCreated} articles créés, ${syncResults.itemsUpdated} mis à jour`, 'info')
  
  // Dispatcher automatiquement les articles existants qui n'ont pas de statut de production
  if (syncResults.itemsCreated > 0) {
    addSyncLog('🔄 Dispatch automatique des articles vers la production...', 'info')
    await dispatchExistingItemsToProduction()
  }
  
  return syncResults
}

// Fonction pour dispatcher automatiquement un article vers la production
async function dispatchItemToProduction(orderId, lineItemId, productName) {
  try {
    const statusCollection = db.collection('production_status')
    
    // Déterminer le type de production basé sur le nom du produit
    const productionType = determineProductionType(productName)
    
    // Créer le statut de production avec "a_faire"
    const productionStatus = {
      order_id: parseInt(orderId),
      line_item_id: parseInt(lineItemId),
      status: 'a_faire',
      production_type: productionType,
      assigned_to: null,
      created_at: new Date(),
      updated_at: new Date()
    }
    
    await statusCollection.insertOne(productionStatus)
    
    addSyncLog(`📋 Article dispatché vers ${productionType}`, 'info')
  } catch (error) {
    console.warn(`Erreur lors du dispatch automatique vers la production: ${error.message}`)
  }
}

// Fonction pour déterminer le type de production d'un produit
function determineProductionType(productName) {
  const name = productName.toLowerCase()
  
  // Seulement les mots spécifiquement liés au tricot/maille
  const mailleKeywords = [
    'tricotée', 'tricoté', 'knitted'
  ]
  
  // Si le produit contient un de ces mots → maille, sinon → couture
  if (mailleKeywords.some(keyword => name.includes(keyword))) {
    return 'maille'
  }
  
  return 'couture'
}

// Fonction pour dispatcher automatiquement les articles existants vers la production
async function dispatchExistingItemsToProduction() {
  try {
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    
    // Récupérer tous les articles qui n'ont pas encore de statut de production
    const itemsWithoutStatus = await itemsCollection.aggregate([
      {
        $lookup: {
          from: 'production_status',
          localField: 'line_item_id',
          foreignField: 'line_item_id',
          as: 'status'
        }
      },
      {
        $match: {
          status: { $size: 0 }
        }
      }
    ]).toArray()
    
    if (itemsWithoutStatus.length > 0) {
      addSyncLog(`📋 Dispatch de ${itemsWithoutStatus.length} articles existants...`, 'info')
      
      for (const item of itemsWithoutStatus) {
        const productionType = determineProductionType(item.product_name)
        
        const productionStatus = {
          order_id: parseInt(item.order_id),
          line_item_id: parseInt(item.line_item_id),
          status: 'a_faire',
          production_type: productionType,
          assigned_to: null,
          created_at: new Date(),
          updated_at: new Date()
        }
        
        await statusCollection.insertOne(productionStatus)
      }
      
      addSyncLog(`✅ ${itemsWithoutStatus.length} articles dispatchés avec succès`, 'success')
    }
  } catch (error) {
    console.warn(`Erreur lors du dispatch des articles existants: ${error.message}`)
  }
}

// Fonction pour synchroniser une commande vers la base de données
async function syncOrderToDatabase(order) {
  const ordersCollection = db.collection('orders_sync')
  
  // Insert-only: ne pas modifier une commande existante
  const now = new Date()
  // Extraire les infos transporteur depuis WooCommerce
  const firstShippingLine = Array.isArray(order.shipping_lines) && order.shipping_lines.length > 0 
    ? order.shipping_lines[0] 
    : null
  const shippingMethodId = firstShippingLine?.method_id || null
  const shippingMethodTitle = firstShippingLine?.method_title || null
  // Déterminer le transporteur (DHL/UPS/Colissimo, etc.) en inspectant id, title et meta
  let shippingCarrier = null
  const lowerTitle = (shippingMethodTitle || '').toLowerCase()
  const lowerId = (shippingMethodId || '').toLowerCase()
  const metaValues = (firstShippingLine?.meta_data || [])
    .map(m => `${m?.key || ''} ${m?.value || ''}`.toLowerCase())
    .join(' ')
  if (/(dhl)/.test(lowerTitle) || /(dhl)/.test(lowerId) || /(dhl)/.test(metaValues)) {
    shippingCarrier = 'DHL'
  } else if (/(ups)/.test(lowerTitle) || /(ups)/.test(lowerId) || /(ups)/.test(metaValues)) {
    shippingCarrier = 'UPS'
  } else if (/(colissimo|la poste)/.test(lowerTitle) || /(colissimo|laposte)/.test(lowerId) || /(colissimo|la poste)/.test(metaValues)) {
    shippingCarrier = 'Colissimo'
  }
  // Si livraison gratuite, déduire UPS en France sinon DHL
  const isFreeShipping = /(free|gratuit)/.test(lowerTitle) || /(free|gratuit)/.test(lowerId)
  if (!shippingCarrier && isFreeShipping) {
    const country = (order.shipping?.country || order.billing?.country || '').toUpperCase()
    shippingCarrier = country === 'FR' ? 'UPS' : 'DHL'
  }
  const resolvedShippingTitle = shippingMethodTitle || shippingMethodId || null
  // Vérifier si la commande existe déjà
  const existing = await ordersCollection.findOne({ order_id: order.id })
  if (existing) {
    // Si la commande existe mais n'a pas d'articles, la mettre à jour
    if (!existing.items || existing.items.length === 0) {
      const orderItems = await db.collection('order_items').find({ order_id: order.id }).toArray()
      if (orderItems.length > 0) {
        await ordersCollection.updateOne(
          { order_id: order.id },
          { 
            $set: { 
              items: orderItems,
              updated_at: now
            }
          }
        )
        return { created: false, updated: true }
      }
    }
    return { created: false, updated: false }
  }
  // Récupérer les articles de cette commande depuis order_items
  const orderItems = await db.collection('order_items').find({ order_id: order.id }).toArray()
  
  await ordersCollection.insertOne({
    order_id: order.id,
    order_number: order.number,
    order_date: new Date(order.date_created),
    customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim(),
    customer_email: order.billing?.email || null,
    customer_phone: order.billing?.phone || null,
    customer_address: `${order.billing?.address_1 || ''}, ${order.billing?.postcode || ''} ${order.billing?.city || ''}`.trim(),
    customer_country: (order.shipping?.country || order.billing?.country || null),
    customer_note: order.customer_note || '',
    status: order.status,
    total: parseFloat(order.total) || 0,
    // Champs transporteur pour l'affichage frontend
    shipping_method: shippingMethodId,
    shipping_title: resolvedShippingTitle,
    shipping_method_title: shippingMethodTitle,
    shipping_carrier: shippingCarrier,
    // Inclure les articles de la commande
    items: orderItems,
    created_at: now,
    updated_at: now
  })
  return { created: true, updated: false }
}

async function syncOrderItem(orderId, item) {
  const itemsCollection = db.collection('order_items')
  const imagesCollection = db.collection('product_images')
  
  // Insert-only: ne pas modifier un article existant
  const existing = await itemsCollection.findOne({ order_id: orderId, line_item_id: item.id })
  if (existing) {
    return { created: false, updated: false }
  }

  // Récupérer le permalink et l'image depuis WooCommerce via notre API
  let permalink = null
  let imageUrl = null
  try {
    if (WOOCOMMERCE_CONSUMER_KEY && WOOCOMMERCE_CONSUMER_SECRET) {
      const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
      const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${item.product_id}?${authParams}&_fields=id,permalink,images`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000)
      })
      
      if (response.ok) {
        const product = await response.json()
        permalink = product?.permalink || null
        // Récupérer l'URL de la première image si disponible
        if (product?.images && product.images.length > 0) {
          imageUrl = product.images[0].src || null
        }
      }
    }
  } catch (error) {
    console.warn(`Erreur lors de la récupération des données pour le produit ${item.product_id}:`, error.message)
  }

  // Télécharger et stocker l'image en base pour un accès sans CORS
  if (imageUrl && item.product_id) {
    try {
      const imgResp = await fetch(imageUrl)
      if (imgResp.ok) {
        const contentType = imgResp.headers.get('content-type') || 'image/jpeg'
        const arrayBuffer = await imgResp.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        await imagesCollection.updateOne(
          { product_id: parseInt(item.product_id) },
          {
            $set: {
              product_id: parseInt(item.product_id),
              content_type: contentType,
              data: buffer,
              updated_at: new Date()
            },
            $setOnInsert: { created_at: new Date() }
          },
          { upsert: true }
        )
      }
    } catch (e) {
      console.warn(`Impossible de stocker l'image du produit ${item.product_id}: ${e.message}`)
    }
  }
  
  // Upsert article
  const now = new Date()
  const update = {
    $set: {
      product_name: item.name,
      product_id: item.product_id,
      variation_id: item.variation_id,
      quantity: item.quantity,
      price: parseFloat(item.price) || 0,
      permalink: permalink,
      image_url: imageUrl,
      meta_data: item.meta_data || [],
      updated_at: now
    },
    $setOnInsert: {
      order_id: orderId,
      line_item_id: item.id,
      created_at: now
    }
  }
  const result = await itemsCollection.updateOne({ order_id: orderId, line_item_id: item.id }, update, { upsert: true })
  const created = result.upsertedCount === 1
  const updated = !created && result.matchedCount === 1 && result.modifiedCount > 0
  return { created, updated }
}

// Endpoint pour servir les images stockées (évite les CORS)
app.get('/api/images/:productId', async (req, res) => {
  try {
    const { productId } = req.params
    const imagesCollection = db.collection('product_images')
    const doc = await imagesCollection.findOne({ product_id: parseInt(productId) })

    if (!doc || !doc.data) {
      return res.status(404).json({ error: 'Image non trouvée' })
    }

    res.setHeader('Content-Type', doc.content_type || 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable')
    return res.end(doc.data.buffer)
  } catch (error) {
    console.error('Erreur GET /api/images/:productId:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Routes existantes pour la compatibilité
app.get('/api/production-status', async (req, res) => {
  try {
    const collection = db.collection('production_status')
    const statuses = await collection.find({}).toArray()
    res.json({ statuses })
  } catch (error) {
    console.error('Erreur GET /production-status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/production-status/stats - Statistiques de production
// Ancien endpoint legacy remplacé par /api/archived-orders/stats
app.get('/api/production-status/stats', async (req, res) => {
  return res.json({ success: true, stats: { weekly: [], monthly: [], yearly: [] } })
})

app.post('/api/production-status', async (req, res) => {
  try {
    const { order_id, line_item_id, status, assigned_to, urgent } = req.body
    const collection = db.collection('production_status')
    
    const result = await collection.updateOne(
      {
        order_id: parseInt(order_id),
        line_item_id: parseInt(line_item_id)
      },
      {
        $set: {
          order_id: parseInt(order_id),
          line_item_id: parseInt(line_item_id),
          status,
          assigned_to,
          ...(typeof urgent === 'boolean' ? { urgent: urgent === true } : {}),
          updated_at: new Date()
        }
      },
      { upsert: true }
    )
    
    res.json({ 
      success: true, 
      message: 'Statut mis à jour',
      result 
    })
  } catch (error) {
    console.error('Erreur POST /production-status:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/reset-production-status - Remettre tous les articles en "à faire"
app.post('/api/reset-production-status', async (req, res) => {
  try {
    const productionCollection = db.collection('production_status')
    const assignmentsCollection = db.collection('article_assignments')
    
    // Remettre tous les articles en 'a_faire'
    const productionResult = await productionCollection.updateMany(
      {},
      { 
        $set: { 
          status: 'a_faire', 
          assigned_to: null, 
          notes: null, 
          updated_at: new Date() 
        }
      }
    )
    
    // Supprimer toutes les assignations
    const assignmentsResult = await assignmentsCollection.deleteMany({})
    
    // Vérifier le résultat
    const statusCounts = await productionCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray()
    
    const assignmentCount = await assignmentsCollection.countDocuments()
    

    
    res.json({ 
      success: true, 
      productionModifiedCount: productionResult.modifiedCount,
      assignmentsDeletedCount: assignmentsResult.deletedCount,
      statusCounts: statusCounts,
      remainingAssignments: assignmentCount
    })
  } catch (error) {
    console.error('Erreur reset-production-status:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/sync-assignments-status - Synchroniser les assignations avec les statuts de production
app.post('/api/sync-assignments-status', async (req, res) => {
  try {
    const productionCollection = db.collection('production_status')
    const assignmentsCollection = db.collection('article_assignments')
    
    // Récupérer tous les statuts de production
    const productionStatuses = await productionCollection.find({}).toArray()
    
    // Récupérer toutes les assignations
    const assignments = await assignmentsCollection.find({}).toArray()
    
    let syncedCount = 0
    let removedCount = 0
    
    // Pour chaque assignation, vérifier si le statut correspond
    for (const assignment of assignments) {
      const productionStatus = productionStatuses.find(ps => 
        ps.order_id === assignment.order_id && ps.line_item_id === assignment.line_item_id
      )
      
      if (productionStatus) {
        // Si le statut de production est "a_faire", supprimer l'assignation
        if (productionStatus.status === 'a_faire') {
          await assignmentsCollection.deleteOne({ _id: assignment._id })
          removedCount++
        } else {
          // Sinon, synchroniser le statut
          if (assignment.status !== productionStatus.status) {
            await assignmentsCollection.updateOne(
              { _id: assignment._id },
              { $set: { status: productionStatus.status, updated_at: new Date() } }
            )
            syncedCount++
          }
        }
      } else {
        // Si pas de statut de production, supprimer l'assignation
        await assignmentsCollection.deleteOne({ _id: assignment._id })
        removedCount++
      }
    }
    

    
    res.json({ 
      success: true, 
      syncedCount,
      removedCount
    })
  } catch (error) {
    console.error('Erreur sync-assignments-status:', error)
    res.status(500).json({ error: error.message })
  }
})



// PUT /api/production-status/:lineItemId/type - Mettre à jour le type de production d'un article
app.put('/api/production-status/:lineItemId/type', async (req, res) => {
  try {
    const { lineItemId } = req.params
    const { production_type } = req.body
    
    if (!production_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Type de production requis' 
      })
    }
    
    if (!['couture', 'maille'].includes(production_type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Type de production invalide. Doit être "couture" ou "maille"' 
      })
    }
    
    // Mettre à jour le type de production pour cet article spécifique
    const statusCollection = db.collection('production_status')
    const result = await statusCollection.updateOne(
      { line_item_id: parseInt(lineItemId) },
      { 
        $set: { 
          production_type: production_type,
          updated_at: new Date()
        } 
      }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Aucun article trouvé avec cet ID' 
      })
    }
    
    console.log(`✅ Type de production mis à jour pour l'article ${lineItemId}: ${production_type}`)
    
    res.json({ 
      success: true, 
      message: `Type de production mis à jour pour l'article ${lineItemId}`,
      lineItemId: parseInt(lineItemId),
      production_type,
      modifiedCount: result.modifiedCount
    })
    
  } catch (error) {
    console.error('Erreur PUT /production-status/:lineItemId/type:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/sync-orders - Synchroniser les commandes depuis WordPress
app.post('/api/sync-orders', async (req, res) => {
  try {
    console.log('🔄 Début de la synchronisation des commandes...')
    
    // Récupérer les commandes depuis WordPress
    const woocommerceOrders = await fetchOrdersFromWooCommerce()
    console.log(`📦 ${woocommerceOrders.length} commandes récupérées depuis WordPress`)
    
    // Synchroniser vers la base de données
    const syncResults = await syncOrdersToDatabase(woocommerceOrders)
    console.log(`✅ Synchronisation terminée:`, syncResults)
    
    res.json({
      success: true,
      message: 'Synchronisation terminée',
      results: syncResults
    })
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Route pour forcer la synchronisation d'une commande spécifique
app.post('/api/sync/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    
    // Récupérer la commande depuis WooCommerce
    if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return res.status(500).json({ error: 'Configuration WooCommerce manquante' })
    }
    
    const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
    const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/orders/${orderId}?${authParams}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30000)
    })
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Commande non trouvée dans WooCommerce' })
    }
    
    const order = await response.json()
    
    // Synchroniser la commande
    const orderResult = await syncOrderToDatabase(order)
    
    // Synchroniser les articles
    let itemsCreated = 0
    let itemsUpdated = 0
    for (const item of order.line_items || []) {
      const itemResult = await syncOrderItem(order.id, item)
      if (itemResult.created) {
        itemsCreated++
        await dispatchItemToProduction(order.id, item.id, item.name)
      } else if (itemResult.updated) {
        itemsUpdated++
      }
    }
    
    res.json({
      success: true,
      message: 'Commande synchronisée',
      results: {
        orderCreated: orderResult.created,
        orderUpdated: orderResult.updated,
        itemsCreated,
        itemsUpdated
      }
    })
  } catch (error) {
    console.error('Erreur sync order:', error)
    res.status(500).json({ error: error.message })
  }
})

// Route temporaire pour debug
app.get('/api/debug/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await db.collection('orders_sync').findOne({ order_id: parseInt(orderId) })
    const orderItems = await db.collection('order_items').find({ order_id: parseInt(orderId) }).toArray()
    const statuses = await db.collection('production_status').find({ order_id: parseInt(orderId) }).toArray()
    
    res.json({
      order: order ? {
        order_id: order.order_id,
        order_number: order.order_number,
        items_count: order.items ? order.items.length : 0,
        items: order.items ? order.items.map(item => ({
          line_item_id: item.line_item_id,
          product_name: item.product_name
        })) : []
      } : null,
      order_items: orderItems.map(item => ({
        line_item_id: item.line_item_id,
        product_name: item.product_name
      })),
      statuses: statuses.map(s => ({
        line_item_id: s.line_item_id,
        status: s.status,
        production_type: s.production_type
      }))
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Routes API pour les tricoteuses

// GET /api/tricoteuses - Récupérer toutes les tricoteuses
app.get('/api/tricoteuses', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const tricoteusesCollection = db.collection('tricoteuses')
    const tricoteuses = await tricoteusesCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()
    
    res.json({
      success: true,
      data: tricoteuses
    })
  } catch (error) {
    console.error('Erreur récupération tricoteuses:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/tricoteuses - Créer une nouvelle tricoteuse
app.post('/api/tricoteuses', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { firstName, color, photoUrl, gender } = req.body
    
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'Le prénom est requis' })
    }
    
    if (!color) {
      return res.status(400).json({ error: 'La couleur est requise' })
    }
    
    const tricoteusesCollection = db.collection('tricoteuses')
    
    const newTricoteuse = {
      firstName: firstName.trim(),
      color,
      photoUrl: photoUrl || '',
      gender: gender || 'feminin', // Par défaut féminin
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await tricoteusesCollection.insertOne(newTricoteuse)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newTricoteuse
      }
    })
  } catch (error) {
    console.error('Erreur création tricoteuse:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/tricoteuses/:id - Modifier une tricoteuse
app.put('/api/tricoteuses/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const { firstName, color, photoUrl, gender } = req.body
    
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: 'Le prénom est requis' })
    }
    
    if (!color) {
      return res.status(400).json({ error: 'La couleur est requise' })
    }
    
    const tricoteusesCollection = db.collection('tricoteuses')
    
    const updateData = {
      firstName: firstName.trim(),
      color,
      photoUrl: photoUrl || '',
      gender: gender || 'feminin', // Par défaut féminin
      updatedAt: new Date()
    }
    
    const result = await tricoteusesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Tricoteuse non trouvée' })
    }
    
    res.json({
      success: true,
      data: {
        id,
        ...updateData
      }
    })
  } catch (error) {
    console.error('Erreur modification tricoteuse:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/tricoteuses/:id - Supprimer une tricoteuse
app.delete('/api/tricoteuses/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const tricoteusesCollection = db.collection('tricoteuses')
    
    const result = await tricoteusesCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Tricoteuse non trouvée' })
    }
    
    res.json({
      success: true,
      message: 'Tricoteuse supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression tricoteuse:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Routes pour les assignations d'articles aux tricoteuses

// GET /api/assignments - Récupérer toutes les assignations
app.get('/api/assignments', async (req, res) => {
  try {
    if (!db) {
      // Fallback doux: éviter l'erreur 500 au chargement quand la DB n'est pas prête
      return res.json({ success: true, data: [] })
    }
    
    const assignmentsCollection = db.collection('article_assignments')
    const assignments = await assignmentsCollection.find({}).sort({ assigned_at: -1 }).toArray()
    
    res.json({
      success: true,
      data: assignments
    })
  } catch (error) {
    console.error('Erreur récupération assignations:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/assignments/:articleId - Récupérer l'assignation d'un article
app.get('/api/assignments/:articleId', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { articleId } = req.params
    const assignmentsCollection = db.collection('article_assignments')
    
    const assignment = await assignmentsCollection.findOne({ article_id: articleId })
    
    if (!assignment) {
      return res.status(404).json({ error: 'Aucune assignation trouvée pour cet article' })
    }
    
    res.json({
      success: true,
      data: assignment
    })
  } catch (error) {
    console.error('Erreur récupération assignation:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/assignments - Créer ou mettre à jour une assignation
app.post('/api/assignments', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { article_id, tricoteuse_id, tricoteuse_name, status, urgent } = req.body
    
    if (!article_id || !tricoteuse_id || !tricoteuse_name) {
      return res.status(400).json({ error: 'article_id, tricoteuse_id et tricoteuse_name sont requis' })
    }
    
    const assignmentsCollection = db.collection('article_assignments')
    const productionCollection = db.collection('production_status')
    
    // Utiliser upsert pour créer ou mettre à jour l'assignation
    const result = await assignmentsCollection.updateOne(
      { article_id: article_id },
      {
        $set: {
          tricoteuse_id: tricoteuse_id,
          tricoteuse_name: tricoteuse_name,
          status: status || 'en_cours', // Par défaut "en_cours" quand assigné
          urgent: urgent === true,
          assigned_at: new Date(),
          updated_at: new Date()
        }
      },
      { upsert: true }
    )
    
    // Mettre à jour automatiquement le statut de production
    // L'article_id peut être soit line_item_id directement, soit au format orderId_lineItemId
    let orderId, lineItemId
    
    if (article_id.toString().includes('_')) {
      // Format: orderId_lineItemId ou productId_orderNumber_customer
      const parts = article_id.toString().split('_')
      if (parts.length >= 2) {
        // Si c'est un line_item_id direct, l'utiliser
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          orderId = parts[0]
          lineItemId = parts[1]
        } else {
          // Format productId_orderNumber_customer, chercher par line_item_id
          lineItemId = article_id
        }
      }
    } else {
      // Format: line_item_id direct
      lineItemId = article_id
    }
    
    if (lineItemId) {
      const updateQuery = orderId ? 
        { order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) } :
        { line_item_id: parseInt(lineItemId) }
        
      await productionCollection.updateOne(
        updateQuery,
        { 
          $set: { 
            status: status || 'en_cours',
            assigned_to: tricoteuse_name,
            updated_at: new Date()
          }
        },
        { upsert: true }
      )
    }
    
    res.json({
      success: true,
      data: {
        article_id,
        tricoteuse_id,
        tricoteuse_name,
        status: status || 'non_assigné',
        urgent: urgent === true,
        assigned_at: new Date()
      }
    })
  } catch (error) {
    console.error('Erreur création/mise à jour assignation:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/assignments/:assignmentId - Supprimer une assignation
app.delete('/api/assignments/:assignmentId', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { assignmentId } = req.params
    const assignmentsCollection = db.collection('article_assignments')
    const productionCollection = db.collection('production_status')
    
    // Vérifier que l'ID est un ObjectId valide
    if (!ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ error: 'ID d\'assignation invalide' })
    }
    
    // Récupérer l'assignation avant de la supprimer pour avoir l'article_id
    const assignment = await assignmentsCollection.findOne({ _id: new ObjectId(assignmentId) })
    if (!assignment) {
      return res.status(404).json({ error: 'Aucune assignation trouvée avec cet ID' })
    }
    
    const result = await assignmentsCollection.deleteOne({ _id: new ObjectId(assignmentId) })
    
    // Mettre à jour le statut de production en "à faire"
    let orderId, lineItemId
    const articleId = assignment.article_id.toString()
    
    if (articleId.includes('_')) {
      const parts = articleId.split('_')
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        orderId = parts[0]
        lineItemId = parts[1]
      } else {
        lineItemId = articleId
      }
    } else {
      lineItemId = articleId
    }
    
    if (lineItemId) {
      const updateQuery = orderId ? 
        { order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) } :
        { line_item_id: parseInt(lineItemId) }
        
      await productionCollection.updateOne(
        updateQuery,
        { 
          $set: { 
            status: 'a_faire',
            assigned_to: null,
            updated_at: new Date()
          }
        }
      )
    }
    
    res.json({
      success: true,
      message: 'Assignation supprimée avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression assignation:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Nouveau: DELETE par article_id (clé fonctionnelle)
app.delete('/api/assignments/by-article/:articleId', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    const { articleId } = req.params
    if (!articleId) {
      return res.status(400).json({ error: 'article_id requis' })
    }
    const assignmentsCollection = db.collection('article_assignments')
    const productionCollection = db.collection('production_status')
    
    // Supporter article_id stocké en string OU en nombre
    const asNumber = Number(articleId)
    const query = Number.isNaN(asNumber)
      ? { article_id: articleId }
      : { $or: [ { article_id: asNumber }, { article_id: articleId } ] }
    
    const result = await assignmentsCollection.deleteOne(query)
    const assignmentFound = result.deletedCount > 0
    
    // Mettre à jour le statut de production en "à faire" même si l'assignation n'existe pas
    let orderId, lineItemId
    const articleIdStr = articleId.toString()
    
    if (articleIdStr.includes('_')) {
      const parts = articleIdStr.split('_')
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        orderId = parts[0]
        lineItemId = parts[1]
      } else {
        lineItemId = articleIdStr
      }
    } else {
      lineItemId = articleIdStr
    }
    
    if (lineItemId) {
      const updateQuery = orderId ? 
        { order_id: parseInt(orderId), line_item_id: parseInt(lineItemId) } :
        { line_item_id: parseInt(lineItemId) }
        
      await productionCollection.updateOne(
        updateQuery,
        { 
          $set: { 
            status: 'a_faire',
            assigned_to: null,
            updated_at: new Date()
          }
        }
      )
    }
    
    // Retourner le bon message selon si l'assignation existait ou non
    const message = assignmentFound 
      ? 'Assignation supprimée par article_id' 
      : 'Aucune assignation trouvée, mais statut de production mis à jour'
    res.json({ success: true, message })
  } catch (error) {
    console.error('Erreur DELETE /api/assignments/by-article/:articleId:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Routes pour les délais d'expédition

// GET /api/delais - Récupérer tous les délais d'expédition
app.get('/api/delais', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    const delais = await delaisCollection.find({}).sort({ dateCreation: -1 }).toArray()
    
    res.json({
      success: true,
      data: delais
    })
  } catch (error) {
    console.error('Erreur récupération délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/delais - Créer un nouveau délai d'expédition
app.post('/api/delais', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { dateCreation, derniereModification, description } = req.body
    
    if (!dateCreation) {
      return res.status(400).json({ error: 'La date de création est requise' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    
    const newDelai = {
      dateCreation: new Date(dateCreation),
      derniereModification: derniereModification ? new Date(derniereModification) : new Date(),
      description: description || null
    }
    
    const result = await delaisCollection.insertOne(newDelai)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...newDelai
      }
    })
  } catch (error) {
    console.error('Erreur création délai:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// PUT /api/delais/:id - Modifier un délai d'expédition
app.put('/api/delais/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const { dateCreation, derniereModification, description } = req.body
    
    if (!dateCreation) {
      return res.status(400).json({ error: 'La date de création est requise' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    
    const updateData = {
      dateCreation: new Date(dateCreation),
      derniereModification: derniereModification ? new Date(derniereModification) : new Date(),
      description: description || null
    }
    
    const result = await delaisCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Délai non trouvé' })
    }
    
    res.json({
      success: true,
      data: {
        id,
        ...updateData
      }
    })
  } catch (error) {
    console.error('Erreur modification délai:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// DELETE /api/delais/:id - Supprimer un délai d'expédition
app.delete('/api/delais/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { id } = req.params
    const delaisCollection = db.collection('delais_expedition')
    
    const result = await delaisCollection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Délai non trouvé' })
    }
    
    res.json({
      success: true,
      message: 'Délai supprimé avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression délai:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// Routes pour les délais d'expédition

// GET /api/delais/configuration - Récupérer la configuration actuelle des délais
app.get('/api/delais/configuration', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    const configuration = await delaisCollection.findOne({}, { sort: { derniereModification: -1 } })
    
    if (configuration) {
      res.json({
        success: true,
        data: configuration
      })
    } else {
      // Retourner une configuration par défaut si aucune n'existe
      res.json({
        success: true,
        data: {
          joursDelai: 21,
          joursOuvrables: {
            lundi: true,
            mardi: true,
            mercredi: true,
            jeudi: true,
            vendredi: true,
            samedi: false,
            dimanche: false
          },
          dateLimite: null,
          dateCreation: new Date(),
          derniereModification: new Date()
        }
      })
    }
  } catch (error) {
    console.error('Erreur récupération configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/delais/configuration - Sauvegarder la configuration des délais
app.post('/api/delais/configuration', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { joursDelai, joursOuvrables, dateLimite, dateCreation, derniereModification } = req.body
    
    if (!joursDelai || !joursOuvrables) {
      return res.status(400).json({ error: 'Les jours de délai et la configuration des jours ouvrables sont requis' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    
    // Créer la nouvelle configuration
    const nouvelleConfiguration = {
      joursDelai: parseInt(joursDelai),
      joursOuvrables: joursOuvrables,
      dateLimite: dateLimite ? new Date(dateLimite) : null,
      dateCreation: dateCreation ? new Date(dateCreation) : new Date(),
      derniereModification: new Date()
    }
    
    const result = await delaisCollection.insertOne(nouvelleConfiguration)
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertedId,
        ...nouvelleConfiguration
      }
    })
  } catch (error) {
    console.error('Erreur sauvegarde configuration délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// POST /api/delais/calculer - Calculer la date limite pour une commande
app.post('/api/delais/calculer', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const { dateCommande, joursOuvrables, configurationJours } = req.body
    
    if (!dateCommande || !joursOuvrables || !configurationJours) {
      return res.status(400).json({ error: 'Tous les paramètres sont requis' })
    }
    
    // Fonction pour calculer la date limite
    const calculerDateLimiteOuvrable = async (dateCommande, joursOuvrablesCount, joursOuvrablesConfig) => {
      const dateCommandeObj = new Date(dateCommande)
      let dateLimite = new Date(dateCommandeObj)
      let joursAjoutes = 0
      
      while (joursAjoutes < joursOuvrablesCount) {
        dateLimite.setDate(dateLimite.getDate() + 1)
        
        // Vérifier si c'est un jour ouvrable selon la configuration
        const jourSemaine = dateLimite.getDay()
        const nomJour = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'][jourSemaine]
        
        // Vérifier si c'est un jour ouvrable ET pas un jour férié
        if (joursOuvrablesConfig[nomJour]) {
          // Vérifier si c'est un jour férié français
          const annee = dateLimite.getFullYear()
          const jour = dateLimite.getDate().toString().padStart(2, '0')
          const mois = (dateLimite.getMonth() + 1).toString().padStart(2, '0')
          const dateStr = `${annee}-${mois}-${jour}`
          
          // Vérifier si c'est un jour férié français en utilisant la logique locale
          const estJourFerie = await estJourFerieLocal(dateLimite)
          // Si ce n'est pas un jour férié, compter le jour
          if (!estJourFerie) {
          joursAjoutes++
          }
        }
      }
      
      return dateLimite
    }
    
    const dateLimite = await calculerDateLimiteOuvrable(dateCommande, joursOuvrables, configurationJours)
    
    res.json({
      success: true,
      data: {
        dateCommande: new Date(dateCommande),
        joursOuvrables: parseInt(joursOuvrables),
        dateLimite: dateLimite,
        joursCalcules: Math.ceil((dateLimite - new Date(dateCommande)) / (1000 * 60 * 60 * 24))
      }
    })
  } catch (error) {
    console.error('Erreur calcul date limite:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/delais/historique - Récupérer l'historique des configurations
app.get('/api/delais/historique', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Base de données non connectée' })
    }
    
    const delaisCollection = db.collection('delais_expedition')
    const historique = await delaisCollection.find({}).sort({ derniereModification: -1 }).limit(50).toArray()
    
    res.json({
      success: true,
      data: historique
    })
  } catch (error) {
    console.error('Erreur récupération historique délais:', error)
    res.status(500).json({ error: 'Erreur serveur interne' })
  }
})

// GET /api/delais/jours-feries - Récupérer les jours fériés français
app.get('/api/delais/jours-feries/:annee', async (req, res) => {
  try {
    const { annee } = req.params
    
    if (!annee || isNaN(parseInt(annee))) {
      return res.status(400).json({ error: 'Année invalide' })
    }
    
    // Utiliser l'API officielle du gouvernement français via data.gouv.fr
    try {
      const response = await fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
      
      if (!response.ok) {
        throw new Error(`Erreur API gouvernementale: ${response.status}`)
      }
      
      const tousJoursFeries = await response.json()
      
      // Filtrer les jours fériés pour l'année demandée
      const joursFeries = {}
      Object.entries(tousJoursFeries).forEach(([date, nom]) => {
        if (date.startsWith(annee)) {
          joursFeries[date] = nom
        }
      })
      
      return joursFeries
    } catch (error) {
      console.error(`Erreur lors de la récupération des jours fériés pour ${annee}:`, error)
      // En cas d'erreur, retourner une liste vide
      return {}
    }
    
    const joursFeries = getJoursFeries(parseInt(annee))
    
    res.json({
      success: true,
      data: joursFeries
    })
  } catch (error) {
    console.error('Erreur récupération jours fériés:', error)
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des jours fériés',
      details: error.message 
    })
  }
})

// Cache pour les jours fériés
let joursFeriesCache = {}
let cacheExpiration = 0

// Fonction pour vérifier si une date est un jour férié français
async function estJourFerieLocal(date) {
  const annee = date.getFullYear()
  const dateStr = date.toISOString().split('T')[0]
  
  // Vérifier le cache d'abord
  if (joursFeriesCache[annee] && cacheExpiration > Date.now()) {
    return joursFeriesCache[annee][dateStr] !== undefined
  }
  
  try {
    // Charger les jours fériés depuis l'API gouvernementale
    const response = await fetch('https://etalab.github.io/jours-feries-france-data/json/metropole.json')
    
    if (response.ok) {
      const tousJoursFeries = await response.json()
      
      // Mettre en cache avec expiration (24h)
      joursFeriesCache = {}
      Object.entries(tousJoursFeries).forEach(([date, nom]) => {
        const anneeJour = date.split('-')[0]
        if (!joursFeriesCache[anneeJour]) {
          joursFeriesCache[anneeJour] = {}
        }
        joursFeriesCache[anneeJour][date] = nom
      })
      
      cacheExpiration = Date.now() + (24 * 60 * 60 * 1000)
      
      // Retourner le résultat pour la date demandée
      return joursFeriesCache[annee] && joursFeriesCache[annee][dateStr] !== undefined
    }
  } catch (error) {
    console.warn('Erreur lors de la vérification des jours fériés:', error)
  }
  
  // En cas d'erreur, retourner false
  return false
}

// Variable globale pour stocker le dernier log de synchronisation
let lastSyncLog = null
// Contrôleur d'annulation pour interrompre une synchro en cours
let currentSyncAbortController = null

// Fonction pour ajouter un log (remplace le précédent)
function addSyncLog(message, type = 'info') {
  const log = {
    timestamp: new Date().toISOString(),
    message: message,
    type: type
  }
  
  // Remplacer le log précédent au lieu d'accumuler
  lastSyncLog = log
  
  console.log(`[${type.toUpperCase()}] ${message}`)
}

// GET /api/sync/logs - Récupérer le dernier log de synchronisation
app.get('/api/sync/logs', (req, res) => {
  res.json({
    success: true,
    log: lastSyncLog,
    hasLog: lastSyncLog !== null
  })
})

// POST /api/sync/logs/clear - Vider le log
app.post('/api/sync/logs/clear', (req, res) => {
  lastSyncLog = null
  res.json({
    success: true,
    message: 'Log vidé avec succès'
  })
})

// POST /api/sync/cancel - Annuler la synchronisation en cours
app.post('/api/sync/cancel', (req, res) => {
  try {
    if (currentSyncAbortController) {
      currentSyncAbortController.abort()
      addSyncLog('⛔ Synchronisation annulée par l\'utilisateur', 'warning')
      currentSyncAbortController = null
      return res.json({ success: true, cancelled: true })
    }
    return res.json({ success: true, cancelled: false })
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/test/connection - Test de connexion WordPress
app.get('/api/test/connection', async (req, res) => {
  try {
    if (!WOOCOMMERCE_CONSUMER_KEY || !WOOCOMMERCE_CONSUMER_SECRET) {
      return res.status(500).json({ 
        success: false, 
        error: 'Configuration WooCommerce manquante' 
      })
    }
    
    const authParams = `consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`
    const url = `${WOOCOMMERCE_URL}/wp-json/wc/v3/products?${authParams}&per_page=1&_fields=id`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000) // Timeout 5 secondes
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    res.json({ 
      success: true, 
      data: { message: 'Connexion WordPress établie' } 
    })
  } catch (error) {
    console.error('Erreur test WordPress:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// GET /api/test/sync - Test de connexion base de données
app.get('/api/test/sync', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        error: 'Base de données non connectée' 
      })
    }
    
    // Test simple de connexion en comptant les documents
    const ordersCollection = db.collection('orders_sync')
    const count = await ordersCollection.countDocuments()
    
    res.json({ 
      success: true, 
      data: { 
        message: 'Connexion base de données établie',
        ordersCount: count 
      } 
    })
  } catch (error) {
    console.error('Erreur test base de données:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// GET /api/debug/status - Route de debug pour vérifier l'état de la base
app.get('/api/debug/status', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' })
    }
    const ordersCollection = db.collection('orders_sync')
    const itemsCollection = db.collection('order_items')
    const statusCollection = db.collection('production_status')
    
    const totalOrders = await ordersCollection.countDocuments()
    const totalItems = await itemsCollection.countDocuments()
    const totalStatuses = await statusCollection.countDocuments()
    
    const statusesByType = await statusCollection.aggregate([
      {
        $group: {
          _id: '$production_type',
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    
    const itemsWithoutStatus = await itemsCollection.aggregate([
      {
        $lookup: {
          from: 'production_status',
          localField: 'line_item_id',
          foreignField: 'line_item_id',
          as: 'status'
        }
      },
      {
        $match: {
          status: { $size: 0 }
        }
      }
    ]).toArray()
    
    res.json({
      success: true,
      debug: {
        totalOrders,
        totalItems,
        totalStatuses,
        statusesByType,
        itemsWithoutStatus: itemsWithoutStatus.length,
        sampleItems: itemsWithoutStatus.slice(0, 3).map(item => ({
          id: item.line_item_id,
          name: item.product_name,
          order_id: item.order_id
        }))
      }
    })
  } catch (error) {
    console.error('Erreur debug:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/debug/articles-couture - Debug spécifique pour les articles couture
app.get('/api/debug/articles-couture', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' })
    }
    const statusCollection = db.collection('production_status')
    const itemsCollection = db.collection('order_items')
    
    // 1. Compter tous les articles en base
    const totalArticlesInBase = await itemsCollection.countDocuments({})
    
    // 2. Compter les articles par type de production
    const allStatuses = await statusCollection.find({}).toArray()
    const articlesByType = {}
    allStatuses.forEach(status => {
      const type = status.production_type || 'non_dispatché'
      articlesByType[type] = (articlesByType[type] || 0) + 1
    })
    
    // 3. Compter les articles non dispatchés
    const nonDispatchedCount = totalArticlesInBase - allStatuses.length
    
    // 4. Analyser les articles non dispatchés
    const nonDispatchedItems = await itemsCollection.aggregate([
      {
        $lookup: {
          from: 'production_status',
          localField: 'line_item_id',
          foreignField: 'line_item_id',
          as: 'status'
        }
      },
      {
        $match: {
          status: { $size: 0 }
        }
      }
    ]).toArray()
    
    // 5. Analyser les articles de type couture
    const coutureStatuses = allStatuses.filter(s => s.production_type === 'couture')
    const coutureItems = await Promise.all(coutureStatuses.map(async (status) => {
      const item = await itemsCollection.findOne({
        order_id: status.order_id,
        line_item_id: status.line_item_id
      })
      return item
    }))
    
    res.json({
      success: true,
      debug: {
        totalArticlesInBase,
        articlesByType,
        nonDispatchedCount,
        nonDispatchedItems: nonDispatchedItems.length,
        coutureArticles: {
          count: coutureStatuses.length,
          items: coutureItems.map(item => ({
            line_item_id: item.line_item_id,
            product_name: item.product_name,
            order_id: item.order_id
          }))
        },
        sampleNonDispatched: nonDispatchedItems.slice(0, 5).map(item => ({
          line_item_id: item.line_item_id,
          product_name: item.product_name,
          order_id: item.order_id
        }))
      }
    })
  } catch (error) {
    console.error('Erreur debug articles couture:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Démarrage du serveur
async function startServer() {
  // Attendre la connexion Mongo pour garantir le démarrage correct
  await connectToMongo()

  const server = app.listen(PORT, () => {
    console.log(`🚀 Serveur MongoDB API démarré sur le port ${PORT}`)
    console.log(`📊 Endpoints disponibles:`)
    console.log(`   POST /api/sync/orders - Synchroniser les commandes`)
    console.log(`   GET  /api/orders - Récupérer toutes les commandes`)
    console.log(`   GET  /api/orders/search/:orderNumber - Rechercher une commande par numéro`)
    console.log(`   GET  /api/orders/production/:type - Commandes par type de production`)
    console.log(`   POST /api/production/dispatch - Dispatcher vers production`)
    console.log(`   PUT  /api/production/redispatch - Redispatch vers un autre type`)
    console.log(`   PUT  /api/production/status - Mettre à jour le statut`)
    console.log(`   GET  /api/production-status - Statuts de production`)
    console.log(`   GET  /api/production-status/stats - Statistiques de production`)
    console.log(`   POST /api/production-status - Mettre à jour statut`)
    console.log(`   GET  /api/debug/articles-couture - Debug articles couture`)
    console.log(`   GET  /api/woocommerce/products/:productId/permalink - Permalink d'un produit`)
    console.log(`   POST /api/woocommerce/products/permalink/batch - Permalinks en lot`)
    console.log(`   GET  /api/sync/logs - Logs de synchronisation`)
    console.log(`   POST /api/sync/logs/clear - Vider les logs`)
    console.log(`   GET  /api/test/connection - Test connexion WordPress`)
    console.log(`   GET  /api/test/sync - Test connexion base de données`)
    console.log(`   GET  /api/debug/status - Debug de l'état de la base`)
    console.log(`   GET  /api/tricoteuses - Récupérer toutes les tricoteuses`)
    console.log(`   POST /api/tricoteuses - Créer une nouvelle tricoteuse`)
    console.log(`   PUT  /api/tricoteuses/:id - Modifier une tricoteuse`)
    console.log(`   DELETE /api/tricoteuses/:id - Supprimer une tricoteuse`)
    console.log(`   GET  /api/assignments - Récupérer toutes les assignations`)
    console.log(`   GET  /api/assignments/:articleId - Récupérer une assignation`)
    console.log(`   POST /api/assignments - Créer/mettre à jour une assignation`)
    console.log(`   DELETE /api/assignments/:assignmentId - Supprimer une assignation`)
    console.log(`   DELETE /api/assignments/by-article/:articleId - Supprimer par article_id`)
  })
  server.on('error', (err) => {
    console.error('❌ Erreur serveur:', err)
  })
}

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Rejection non gérée:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('⚠️ Exception non gérée:', err)
})

// Démarrer le serveur
startServer().catch((e) => {
  console.error('❌ Échec du démarrage du serveur:', e)
})