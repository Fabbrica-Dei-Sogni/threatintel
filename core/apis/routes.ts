import express from 'express';
import { RateLimitMiddleware } from '../rateLimitMiddleware';
import { FakeLoginController } from '../controllers/FakeLoginController';

export default (logger: any, fakeLoginController: FakeLoginController, rateLimitMiddleware: RateLimitMiddleware) => {
    const router = express.Router();

    router.use(rateLimitMiddleware.violationTracker());
    router.use(rateLimitMiddleware.ddosProtectionLimiter());
    router.use(rateLimitMiddleware.applicationLimiter());

    router.get('/', rateLimitMiddleware.criticalEndpointsLimiter(), (req, res) => fakeLoginController.showFakeLogin(req, res));
    router.post('/login', rateLimitMiddleware.criticalEndpointsLimiter(), (req, res) => fakeLoginController.handleFakeLogin(req, res));

    const commonEndpoints = (process.env.COMMON_ENDPOINTS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

    if (commonEndpoints.length) logger.info(`[routes] COMMON_ENDPOINTS caricati: ${commonEndpoints.join(', ')}`);

    commonEndpoints.forEach(endpoint => {
        router.all(endpoint, rateLimitMiddleware.trapEndpointsLimiter(), (req, res) => fakeLoginController.handleTrap(req, res));
    });

    router.use('*', (req, res) => fakeLoginController.handleNotFound(req, res));

    router.use((error: any, req: any, res: any, next: any) => fakeLoginController.handleError(error, req, res));

    return router;
};
