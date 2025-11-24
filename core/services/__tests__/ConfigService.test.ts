/**
 * Test suite for ConfigService with DI (TypeScript)
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import mongoose from 'mongoose';
import { ConfigService } from '../ConfigService';
import ConfigSchema from '../../models/ConfigSchema';

describe('ConfigService (DI)', () => {
    let configService: ConfigService;

    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/test';
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        // Clear container instances and resolve fresh service
        container.clearInstances();
        configService = container.resolve(ConfigService);

        // Clear configs before each test
        await ConfigSchema.deleteMany({});
    });

    describe('saveConfig', () => {
        test('should save new config', async () => {
            const saved = await configService.saveConfig('test_key', 'test_value');

            expect(saved).toBeDefined();
            expect(saved.key).toBe('test_key');
            expect(saved.value).toBe('test_value');
        });

        test('should update existing config', async () => {
            await configService.saveConfig('test_key', 'value1');

            // Update with new value
            const updated = await configService.saveConfig('test_key', 'value2');

            expect(updated.value).toBe('value2');

            // Verify only one document exists
            const count = await ConfigSchema.countDocuments({ key: 'test_key' });
            expect(count).toBe(1);
        });

        test('should handle different value types', async () => {
            // String value
            const str = await configService.saveConfig('str_key', 'string_value');
            expect(str.value).toBe('string_value');

            // Number value (converted to string)
            const num = await configService.saveConfig('num_key', '123');
            expect(num.value).toBe('123');
        });

        test('should handle errors gracefully', async () => {
            // Mock Configuration.findOneAndUpdate to throw an error
            const originalFindOneAndUpdate = ConfigSchema.findOneAndUpdate;
            ConfigSchema.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(configService.saveConfig('error_key', 'error_value')).rejects.toThrow('Database error');

            // Restore original method
            ConfigSchema.findOneAndUpdate = originalFindOneAndUpdate;
        });
    });

    describe('getConfigValue', () => {
        test('should get config value by key', async () => {
            await configService.saveConfig('max_requests', '100');

            const value = await configService.getConfigValue('max_requests');

            expect(value).toBe('100');
        });

        test('should return null for non-existent config', async () => {
            const value = await configService.getConfigValue('nonexistent_key');

            expect(value).toBeNull();
        });

        test('should handle errors gracefully', async () => {
            // Mock Configuration.findOne to throw an error
            const originalFindOne = ConfigSchema.findOne;
            ConfigSchema.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(configService.getConfigValue('error_key')).rejects.toThrow('Database error');

            // Restore original method
            ConfigSchema.findOne = originalFindOne;
        });
    });

    describe('getAllConfigs', () => {
        test('should get all configs', async () => {
            await configService.saveConfig('key1', 'val1');
            await configService.saveConfig('key2', 'val2');
            await configService.saveConfig('key3', 'val3');

            const all = await configService.getAllConfigs();

            expect(all).toHaveLength(3);
            expect(all.map((c: any) => c.key)).toContain('key1');
            expect(all.map((c: any) => c.key)).toContain('key2');
            expect(all.map((c: any) => c.key)).toContain('key3');
        });

        test('should return empty array when no configs exist', async () => {
            const all = await configService.getAllConfigs();

            expect(all).toEqual([]);
        });

        test('should handle errors gracefully', async () => {
            // Mock Configuration.find to throw an error
            const originalFind = ConfigSchema.find;
            ConfigSchema.find = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(configService.getAllConfigs()).rejects.toThrow('Database error');

            // Restore original method
            ConfigSchema.find = originalFind;
        });
    });
});
