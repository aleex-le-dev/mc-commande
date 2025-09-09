/**
 * Script de test pour vérifier la migration Railway
 * Usage: node test-railway.js
 */

const https = require('https')
const http = require('http')

// Configuration
const RAILWAY_URL = 'https://maisoncleo-backend-production.up.railway.app'
const RENDER_URL = 'https://maisoncleo-commande.onrender.com'

// Fonction pour tester une URL
function testUrl(url, name) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const startTime = Date.now()
    
    const req = client.get(url + '/api/health', (res) => {
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        resolve({
          name,
          url,
          status: res.statusCode,
          responseTime,
          success: res.statusCode === 200,
          data: data.substring(0, 100) // Premiers 100 caractères
        })
      })
    })
    
    req.on('error', (err) => {
      resolve({
        name,
        url,
        status: 'ERROR',
        responseTime: Date.now() - startTime,
        success: false,
        error: err.message
      })
    })
    
    req.setTimeout(10000, () => {
      req.destroy()
      resolve({
        name,
        url,
        status: 'TIMEOUT',
        responseTime: Date.now() - startTime,
        success: false,
        error: 'Timeout après 10s'
      })
    })
  })
}

// Test principal
async function runTests() {
  console.log('🧪 Test de migration Railway vs Render\n')
  
  // Tester les deux backends
  const [railwayResult, renderResult] = await Promise.all([
    testUrl(RAILWAY_URL, 'Railway'),
    testUrl(RENDER_URL, 'Render')
  ])
  
  // Afficher les résultats
  console.log('📊 Résultats des tests:')
  console.log('─'.repeat(60))
  
  [railwayResult, renderResult].forEach(result => {
    const status = result.success ? '✅' : '❌'
    const time = `${result.responseTime}ms`
    
    console.log(`${status} ${result.name.padEnd(10)} | ${time.padEnd(8)} | ${result.status}`)
    
    if (!result.success) {
      console.log(`   └─ Erreur: ${result.error || 'Status ' + result.status}`)
    }
  })
  
  console.log('─'.repeat(60))
  
  // Recommandation
  if (railwayResult.success && renderResult.success) {
    if (railwayResult.responseTime < renderResult.responseTime) {
      console.log(`🚀 Railway est ${Math.round(renderResult.responseTime / railwayResult.responseTime)}x plus rapide que Render !`)
    } else {
      console.log(`⚠️  Render est plus rapide que Railway dans ce test`)
    }
  } else if (railwayResult.success) {
    console.log('✅ Railway fonctionne, Render a des problèmes')
  } else if (renderResult.success) {
    console.log('⚠️  Render fonctionne, Railway a des problèmes')
  } else {
    console.log('❌ Aucun backend ne fonctionne')
  }
  
  console.log('\n📝 Prochaines étapes:')
  if (railwayResult.success) {
    console.log('1. ✅ Railway est prêt')
    console.log('2. 🔄 Mettre à jour VITE_API_URL dans le frontend')
    console.log('3. 🚀 Déployer le frontend')
  } else {
    console.log('1. ❌ Vérifier la configuration Railway')
    console.log('2. 🔍 Consulter les logs Railway Dashboard')
    console.log('3. 🔧 Vérifier les variables d\'environnement')
  }
}

// Lancer les tests
runTests().catch(console.error)
