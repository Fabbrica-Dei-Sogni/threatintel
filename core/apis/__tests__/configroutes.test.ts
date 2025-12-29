import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import configroutes from '../configroutes';
import { ConfigService } from '../../services/ConfigService';
import Configuration from '../../models/ConfigSchema';
import { container } from 'tsyringe';

describe('ConfigRoutes API', () => {
    let app: express.Application;
    let configService: ConfigService;

    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/test-routes';
        await mongoose.connect(uri);

        app = express();
        app.use(express.json());

        configService = container.resolve(ConfigService);
        const loggerMock = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn()
        };

        app.use('/', configroutes(loggerMock, configService));
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        await Configuration.deleteMany({});
    });

    describe('GET /api/config', () => {
        it('should return all configs', async () => {
            await Configuration.create({ key: 'test1', value: 'val1' });
            await Configuration.create({ key: 'test2', value: 'val2' });

            const res = await request(app).get('/api/config');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].key).toBeDefined();
        });
    });

    describe('POST /api/config', () => {
        it('should create a new config', async () => {
            const res = await request(app)
                .post('/api/config')
                .send({ key: 'new_key', value: 'new_val' });

            expect(res.status).toBe(200);
            expect(res.body.key).toBe('new_key');
            expect(res.body.value).toBe('new_val');

            const saved = await Configuration.findOne({ key: 'new_key' });
            expect(saved).toBeDefined();
            expect(saved?.value).toBe('new_val');
        });

        it('should return 400 if key is missing', async () => {
            const res = await request(app)
                .post('/api/config')
                .send({ value: 'val' });

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/config/:key', () => {
        it('should delete a config', async () => {
            await Configuration.create({ key: 'to_delete', value: 'val' });

            const res = await request(app).delete('/api/config/to_delete');
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('eliminata');

            const saved = await Configuration.findOne({ key: 'to_delete' });
            expect(saved).toBeNull();
        });

        it('should return 404 if config doesn\'t exist', async () => {
            const res = await request(app).delete('/api/config/nonexistent');
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/config/search', () => {
        it('should search configs', async () => {
            await Configuration.create({ key: 'api_url', value: 'http://localhost' });
            await Configuration.create({ key: 'db_name', value: 'threats' });
            await Configuration.create({ key: 'other', value: 'something' });

            const res = await request(app)
                .post('/api/config/search')
                .send({ query: 'api' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].key).toBe('api_url');
        });

        it('should return all if query is empty', async () => {
            await Configuration.create({ key: 'k1', value: 'v1' });

            const res = await request(app)
                .post('/api/config/search')
                .send({ query: '' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });
});
