// Jest setup file
// Runs before all tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/threatintel_test';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test-password';
process.env.REDIS_DB = '0';
process.env.ABUSEIPDB_KEY = 'test-key-mock';
process.env.EXCLUDED_IPS = '127.0.0.1,::1';
process.env.PORT = '3999';
process.env.URI_DIGITAL_AUTH = 'http://localhost:3444/api/v1/';

// Rate limiting test config
process.env.DDOS_WINDOW_MS = '60000';
process.env.DDOS_MAX_REQUESTS = '100';
process.env.CRITICAL_WINDOW_MS = '900000';
process.env.CRITICAL_MAX_REQUESTS = '20';
process.env.TRAP_WINDOW_MS = '300000';
process.env.TRAP_MAX_REQUESTS = '50';
process.env.APP_WINDOW_MS = '60000';
process.env.APP_MAX_REQUESTS = '200';
process.env.MAX_VIOLATIONS = '5';
process.env.BLACKLIST_DURATION = '7200';
process.env.LOG_RATE_LIMIT_EVENTS = 'false';
process.env.HONEYPOT_INSTANCE_ID = 'test-honeypot';

// DangerScore weights
process.env.DANGER_WEIGHT_RPSNORM = '0.135';
process.env.DANGER_WEIGHT_DURNORM = '0.162';
process.env.DANGER_WEIGHT_SCORENORM = '0.486';
process.env.DANGER_WEIGHT_UNIQUETECHNORM = '0.216';

// Suppress console output during tests (opzionale - commentare per debug)
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Mantieni error visibile per debugging
    // error: jest.fn(),
};

// Set default timeout for async operations
jest.setTimeout(10000);
