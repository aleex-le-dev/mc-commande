const db = require('../services/database');
(async () => {
  try {
    await db.connect();
    const c = db.getCollection('order_items');

    const candidates = ['production_type','type','productionType','category','section','kind'];
    const rxCouture = new RegExp('^couture$', 'i');
    const rxMaille = new RegExp('^maille$', 'i');

    const total = await c.countDocuments({});

    const orCouture = candidates.map(f => ({ [f]: rxCouture }));
    const orMaille = candidates.map(f => ({ [f]: rxMaille }));

    const couture = await c.countDocuments({ $or: orCouture });
    const maille = await c.countDocuments({ $or: orMaille });

    console.log(JSON.stringify({ total, couture, maille, autres: total - couture - maille }));
    await db.disconnect();
  } catch (e) {
    console.error('Erreur:', e);
    process.exit(1);
  }
})();
