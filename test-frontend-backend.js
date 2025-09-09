/**
 * Test pour vérifier que le frontend utilise bien Railway
 */
const https = require('https')

// URLs à tester
const RAILWAY_URL = 'https://maisoncleo-commande-production.up.railway.app'
const RENDER_URL = 'https://maisoncleo-commande.onrender.com'

// Test d'une requête
function testEndpoint(url, name) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    
    const req = https.get(url + '/api/assignments', (res) => {
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
          dataLength: data.length
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
  console.log('🧪 Test des backends Railway vs Render\n')
  
  const [railwayResult, renderResult] = await Promise.all([
    testEndpoint(RAILWAY_URL, 'Railway'),
    testEndpoint(RENDER_URL, 'Render')
  ])
  
  console.log('📊 Résultats des tests:')
  console.log('─'.repeat(60))
  
  [railwayResult, renderResult].forEach(result => {
    const status = result.success ? '✅' : '❌'
    const time = `${result.responseTime}ms`
    const data = result.dataLength ? `${result.dataLength} bytes` : 'N/A'
    
    console.log(`${status} ${result.name.padEnd(10)} | ${time.padEnd(8)} | ${result.status} | ${data}`)
    
    if (!result.success) {
      console.log(`   └─ Erreur: ${result.error || 'Status ' + result.status}`)
    }
  })
  
  console.log('─'.repeat(60))
  
  // Recommandation
  if (railwayResult.success && renderResult.success) {
    if (railwayResult.responseTime < renderResult.responseTime) {
      const speedup = Math.round(renderResult.responseTime / railwayResult.responseTime * 10) / 10
      console.log(`🚀 Railway est ${speedup}x plus rapide que Render !`)
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
  
  console.log('\n📝 Configuration frontend:')
  console.log('Le frontend devrait utiliser Railway par défaut.')
  console.log('Si vous voyez encore des timeouts, le frontend utilise encore Render.')
  console.log('\n🔧 Pour forcer Railway:')
  console.log('1. Redéployer le frontend')
  console.log('2. Ou définir VITE_API_URL=https://maisoncleo-commande-production.up.railway.app')
}

// Lancer les tests
runTests().catch(console.error)
