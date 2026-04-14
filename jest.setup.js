require('dotenv').config();

// Assicuriamoci che i test usino un database di test sicuro
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:17017/threatintel_test';

// Mock globale per il modulo 'whois' che causa problemi di sntassi in Jest
jest.mock('whois', () => ({
    lookup: jest.fn((ip, options, cb) => {
        if (typeof options === 'function') {
            options(null, 'Mock Whois Data');
        } else if (cb) {
            cb(null, 'Mock Whois Data');
        }
    })
}));

// Mock per puppeteer per evitare problemi di sandbox in ambiente di test
jest.mock('puppeteer', () => ({
    launch: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
            setContent: jest.fn().mockResolvedValue(true),
            pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf')),
        }),
        close: jest.fn().mockResolvedValue(true),
    }),
}));
