import { Router } from 'express';
import { Logger } from 'winston';
import { CowrieController } from '../controllers/CowrieController';

export default function cowrieroutes(logger: Logger, cowrieController: CowrieController) {
    const router = Router();

    // Endpoints dedicati a Cowrie Telnet
    router.get('/api/cowrie/sessions', (req, res) => cowrieController.getSessions(req, res));
    router.get('/api/cowrie/sessions/:id/events', (req, res) => cowrieController.getSessionEvents(req, res));
    router.get('/api/cowrie/sessions/:id', (req, res) => cowrieController.getSessionDetails(req, res));

    return router;
}
