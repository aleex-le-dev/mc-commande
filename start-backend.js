#!/usr/bin/env node

/**
 * Script pour démarrer le backend et vérifier son état
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🚀 Démarrage du backend MaisonCleo...')

// Vérifier si le backend existe
const backendPath = path.join(__dirname, 'backend')
if (!fs.existsSync(backendPath)) {
  console.error('❌ Dossier backend non trouvé')
  process.exit(1)
}

// Vérifier si package.json existe
const packageJsonPath = path.join(backendPath, 'package.json')
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json non trouvé dans le backend')
  process.exit(1)
}

// Vérifier si node_modules existe
const nodeModulesPath = path.join(backendPath, 'node_modules')
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installation des dépendances...')
  const install = spawn('npm', ['install'], { 
    cwd: backendPath, 
    stdio: 'inherit' 
  })
  
  install.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Dépendances installées')
      startBackend()
    } else {
      console.error('❌ Erreur lors de l\'installation des dépendances')
      process.exit(1)
    }
  })
} else {
  startBackend()
}

function startBackend() {
  console.log('🔥 Démarrage du serveur backend...')
  
  const backend = spawn('npm', ['start'], { 
    cwd: backendPath, 
    stdio: 'inherit' 
  })
  
  backend.on('error', (error) => {
    console.error('❌ Erreur lors du démarrage du backend:', error.message)
  })
  
  backend.on('close', (code) => {
    if (code !== 0) {
      console.log(`⚠️ Backend arrêté avec le code ${code}`)
    }
  })
  
  // Gestion de l'arrêt propre
  process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du backend...')
    backend.kill('SIGINT')
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt du backend...')
    backend.kill('SIGTERM')
    process.exit(0)
  })
  
  console.log('✅ Backend démarré sur http://localhost:3001')
  console.log('📱 Frontend accessible sur http://localhost:5173')
  console.log('🛑 Appuyez sur Ctrl+C pour arrêter')
}
