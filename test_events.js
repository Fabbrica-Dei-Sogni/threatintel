const mongoose = require('mongoose');
require('dotenv').config();

const CowrieEventSchema = new mongoose.Schema({
    session: { type: String, index: true },
    time: Number
}, { collection: 'event', strict: false });

const CowrieEvent = mongoose.models.CowrieEvent || mongoose.model('CowrieEvent', CowrieEventSchema);

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const sessId = "0ed5fbecae57";
    console.log("Searching for events with session:", sessId);
    
    // Test 1: find({ session: sessId })
    const events = await CowrieEvent.find({ session: sessId }).exec();
    console.log("RESULT (String Match):", events.length);
    
    if (events.length === 0) {
        // Test 2: Any event?
        const any = await CowrieEvent.findOne({});
        console.log("ANY EVENT FOUND?", !!any);
        if (any) {
            console.log("SESS ID IN DB FOR ONE EVENT:", any.session, "TYPE:", typeof any.session);
            // Test 3: Match with that session ID
            const events2 = await CowrieEvent.find({ session: any.session }).exec();
            console.log("RESULT (Dynamic Match):", events2.length);
        }
    }
    
    process.exit();
}).catch(console.error);
