const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
    // Fix MongoDB version for Debian 12
    const mongod = await MongoMemoryServer.create({
        binary: {
            version: '7.0.14', // Version compatible with Debian 12
        },
    });

    const uri = mongod.getUri();
    global.__MONGOD__ = mongod;
    process.env.MONGO_URI_TEST = uri;
};
