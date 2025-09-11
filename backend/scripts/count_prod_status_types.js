const db = require('../services/database');
(async () => {
  try {
    await db.connect();
    const c = db.getCollection('production_status');

    const candidates = ['production_type','type','productionType','category','section','kind','currentType'];
    const rxCouture = new RegExp('^couture$', 'i');
    const rxMaille = new RegExp('^maille$', 'i');

    const total = await c.countDocuments({});

    // Compter sur tous les champs candidats
    const orCouture = candidates.map(f => ({ [f]: rxCouture }));
    const orMaille = candidates.map(f => ({ [f]: rxMaille }));

    const couture = await c.countDocuments({ $or: orCouture });
    const maille = await c.countDocuments({ $or: orMaille });

    // Lister les valeurs distinctes par champ candidat
    const distinctByField = {};
    for (const f of candidates) {
      try {
        const vals = await c.distinct(f);
        if (vals && vals.length) distinctByField[f] = vals;
      } catch {}
    }

    console.log(JSON.stringify({ total, couture, maille, autres: total - couture - maille, distinctByField }, null, 2));
    await db.disconnect();
  } catch (e) {
    console.error('Erreur:', e);
    process.exit(1);
  }
})();
