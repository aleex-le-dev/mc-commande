/**
 * Script utilitaire: mettre à jour le type de production (maille/couture)
 * pour tous les articles d'une commande donnée.
 * Usage: node scripts/update_production_type.js <orderId> <newType>
 */
require('dotenv').config()
const db = require('../services/database')

async function main() {
  const orderId = parseInt(process.argv[2], 10)
  const newType = String(process.argv[3] || '').trim()
  if (!orderId || !['maille', 'couture'].includes(newType)) {
    console.error('Usage: node scripts/update_production_type.js <orderId> <maille|couture>')
    process.exit(1)
  }

  try {
    await db.connect()
    const items = db.getCollection('order_items')
    const production = db.getCollection('production_status')
    const now = new Date()

    // Mettre à jour l'embed dans order_items
    const resItems = await items.updateMany(
      { order_id: orderId },
      { $set: { 'production_status.production_type': newType, 'production_status.updated_at': now } }
    )

    // Upsert dans production_status pour chaque line_item_id de la commande
    const orderLineItems = await items.find({ order_id: orderId }).project({ line_item_id: 1 }).toArray()
    let updatedPs = 0
    for (const it of orderLineItems) {
      const r = await production.updateOne(
        { order_id: orderId, line_item_id: it.line_item_id },
        { $set: { order_id: orderId, line_item_id: it.line_item_id, production_type: newType, updated_at: now } },
        { upsert: true }
      )
      if (r.upsertedCount > 0 || r.modifiedCount > 0) updatedPs += 1
    }

    console.log(`✅ Type de production mis à jour: order_id=${orderId}, newType=${newType}`)
    console.log(`   order_items modifiés: ${resItems.modifiedCount}, production_status affectés: ${updatedPs}`)
  } catch (e) {
    console.error('❌ Erreur mise à jour type de production:', e)
    process.exit(1)
  } finally {
    try { await db.disconnect() } catch {}
  }
}

main()


