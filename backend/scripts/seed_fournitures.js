/*
  Seed fournitures into the database.
  Usage:
    MONGO_URI="mongodb+srv://..." node scripts/seed_fournitures.js
*/
const db = require('../services/database')

const labels = [
  'enveloppes kraft',
  'etiquettes laine',
  'tissu pour Louise blanche',
  'crochet sacs',
  'soie sauvage ivoire',
  'petite frmeture invisible noir 20cm non separable',
  'boutons B15-019',
  'eau demineralise',
  'doublure soie ecru extensible',
  'dentelle D-30-023',
  'boucle ceinture ac-582',
  'fermeture invisible z50-104'
]

;(async () => {
  try {
    await db.connect()
    const col = db.getCollection('fournitures')
    const docs = labels.map(label => ({ label, qty: 1, created_at: new Date() }))
    const result = await col.insertMany(docs)
    console.log(`✅ Inséré ${result.insertedCount} fournitures.`)
  } catch (e) {
    console.error('❌ Seed error:', e)
    process.exit(1)
  } finally {
    try { await db.disconnect() } catch {}
  }
})()


