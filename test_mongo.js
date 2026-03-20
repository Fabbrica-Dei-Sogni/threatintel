const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    
    console.log("=== ONE EVENT ===");
    const ev = await db.collection('event').findOne({});
    console.log(JSON.stringify(ev, null, 2));
    
    console.log("\n=== ONE SESSION ===");
    const sess = await db.collection('sessions').findOne({});
    console.log(JSON.stringify(sess, null, 2));
    
    process.exit();
}).catch(console.error);
