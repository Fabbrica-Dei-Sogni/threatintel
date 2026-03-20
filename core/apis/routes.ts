import express from 'express';
import {
    ddosProtectionLimiter,
    applicationLimiter,
    violationTracker,
    criticalEndpointsLimiter,
    trapEndpointsLimiter
} from '../rateLimitMiddleware';
import { FakeLoginController } from '../controllers/FakeLoginController';

export default (logger: any, fakeLoginController: FakeLoginController) => {
    const router = express.Router();

    router.use(violationTracker(logger));
    router.use(ddosProtectionLimiter(logger));
    router.use(applicationLimiter(logger));

    router.get('/', criticalEndpointsLimiter(logger), (req, res) => fakeLoginController.showFakeLogin(req, res));
    router.post('/login', criticalEndpointsLimiter(logger), (req, res) => fakeLoginController.handleFakeLogin(req, res));

    const commonEndpoints = (process.env.COMMON_ENDPOINTS || '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

    if (commonEndpoints.length) logger.info(`[routes] COMMON_ENDPOINTS caricati: ${commonEndpoints.join(', ')}`);

    commonEndpoints.forEach(endpoint => {
        router.all(endpoint, trapEndpointsLimiter(logger), (req, res) => fakeLoginController.handleTrap(req, res));
    });

    router.use('*', (req, res) => fakeLoginController.handleNotFound(req, res));

    router.use((error: any, req: any, res: any, next: any) => fakeLoginController.handleError(error, req, res));

    return router;
};
