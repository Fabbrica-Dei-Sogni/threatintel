const axios = require('axios');

// Parametri di tuning centralizzati
const CONFIG = {
    baseURL: 'http://localhost:3999',
    general: { // Rate limiting generale
        requestCount: 500,      // Richieste totali (più aggressivo)
        endpoint: '/',
        timeout: 2500,          // Timeout ridotto
        method: 'get',
        payload: null,
    },
    critical: { // Endpoint critici (brute force)
        requestCount: 100,
        endpoint: '/login',
        timeout: 2500,
        method: 'post',
        payload: {},            // Payload vuoto
    },
    traps: { // Endpoints trappola
        endpoints: ['/admin', '/wp-admin', '/phpmyadmin', '/.env', '/config', '/test'],
        requestCount: 150,
        timeout: 2500,
        method: 'get',
        payload: null,
    }
};


async function testRateLimitingCustom(config) {
    const { baseURL, general, critical, traps } = config;

    console.log('🧪 Testing Rate Limiting (Aggressive & Parametric)...\n');

    // Test 1: Rate limiting generale (GET /)
    console.log('1. Testing general rate limiting...');
    try {
        const promises = Array(general.requestCount).fill().map((_, i) =>
            axios[general.method](`${baseURL}${general.endpoint}`, general.payload, { timeout: general.timeout })
                .catch(err => ({ error: err.response?.status, attempt: i }))
        );
        const results = await Promise.all(promises);
        const blocked = results.filter(r => r.error === 429).length;
        console.log(`   ✅ ${blocked}/${general.requestCount} requests blocked by rate limiting\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 2: Endpoint critici (/login)
    console.log('2. Testing critical endpoint limiting...');
    try {
        const promises = Array(critical.requestCount).fill().map((_, i) =>
            axios[critical.method](`${baseURL}${critical.endpoint}`, critical.payload, { timeout: critical.timeout })
                .catch(err => ({ error: err.response?.status, attempt: i }))
        );
        const results = await Promise.all(promises);
        const blocked = results.filter(r => r.error === 429).length;
        console.log(`   ✅ ${blocked}/${critical.requestCount} login attempts blocked\n`);
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Endpoint trappola (multipli)
    console.log('3. Testing trap endpoint limiting...');
    for (const endpoint of traps.endpoints) {
        try {
            const promises = Array(traps.requestCount).fill().map((_, i) =>
                axios[traps.method](`${baseURL}${endpoint}`, traps.payload, { timeout: traps.timeout })
                    .catch(err => ({ error: err.response?.status, attempt: i }))
            );
            const results = await Promise.all(promises);
            const blocked = results.filter(r => r.error === 429).length;
            console.log(`   ✅ ${endpoint}: ${blocked}/${traps.requestCount} requests blocked`);
        } catch (error) {
            console.log(`   ❌ ${endpoint}: Error: ${error.message}`);
        }
    }
}

// Esegui test solo se chiamato direttamente
if (require.main === module) {
    testRateLimitingCustom(CONFIG).then(() => {
        console.log('\n🎉 Rate limiting tests completed!');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    });
}

module.exports = testRateLimitingCustom;
