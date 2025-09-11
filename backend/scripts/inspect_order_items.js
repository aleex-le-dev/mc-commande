const db = require('../services/database');
(async () => {
  try {
    await db.connect();
    const c = db.getCollection('order_items');

    const total = await c.countDocuments({});
    const sampleDocs = await c.find({}).limit(3).toArray();

    const fieldsSet = new Set();
    sampleDocs.forEach(d => Object.keys(d || {}).forEach(k => fieldsSet.add(k)));
    const fields = Array.from(fieldsSet).sort();

    const distinctCandidates = {};
    const candidates = ['order_number','order_num','number','orderId','order_id','order_date','date_created','created_at','post_date','date'];
    for (const f of candidates) {
      try { distinctCandidates[f] = await c.distinct(f); } catch {}
    }

    console.log(JSON.stringify({ total, fields, samples: sampleDocs, distinctCandidates }, null, 2));
    await db.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
