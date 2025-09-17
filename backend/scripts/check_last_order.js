// Script utilitaire: affiche la dernière commande en BDD
// - Par date (order_date/created_at)
// - Par numéro/ID (order_id/order_number)

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const db = require('../services/database')

;(async () => {
  try {
    await db.connect()
    const items = db.getCollection('order_items')

    const [byDate] = await items
      .find({}, { projection: { _id: 0 } })
      .sort({ order_date: -1, created_at: -1 })
      .limit(1)
      .toArray()

    const [byId] = await items
      .find({}, { projection: { _id: 0 } })
      .sort({ order_id: -1 })
      .limit(1)
      .toArray()

    const fmt = (it) => it && {
      order_id: it.order_id,
      order_number: it.order_number,
      customer: it.customer,
      order_date: it.order_date,
      created_at: it.created_at,
      status: it.status
    }

    console.log('Dernière commande (par date):', fmt(byDate))
    console.log('Dernière commande (par ID):  ', fmt(byId))

    // Vérifier présence d'un numéro spécifique via ARG (ex: 391182)
    const search = process.argv[2]
    if (search) {
      const num = String(search).trim()
      const found = await items.findOne({ order_number: num })
      console.log(`Recherche order_number=${num}:`, found ? 'TROUVÉ' : 'NON TROUVÉ')
    }

    await db.disconnect()
    process.exit(0)
  } catch (e) {
    console.error('Erreur script check_last_order:', e)
    try { await db.disconnect() } catch {}
    process.exit(1)
  }
})()


