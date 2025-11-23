/**
 * Test suite for ConfigService (TypeScript)
 */

import mongoose from 'mongoose';
import ConfigService from '../ConfigService';

// Import JS model
const ConfigSchema = require('../../models/ConfigSchema');

describe('ConfigService', () => {
    beforeAll(async () => {
        const uri = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/test';
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    beforeEach(async () => {
        // Clear configs before each test
        await ConfigSchema.deleteMany({});
    });

    describe('saveConfig', () => {
        test('should save new config', async () => {
            const saved = await ConfigService.saveConfig('test_key', 'test_value');

            expect(saved).toBeDefined();
            expect(saved.key).toBe('test_key');
            expect(saved.value).toBe('test_value');
        });

        test('should update existing config', async () => {
            await ConfigService.saveConfig('test_key', 'value1');

            // Update with new value
            const updated = await ConfigService.saveConfig('test_key', 'value2');

            expect(updated.value).toBe('value2');

            // Verify only one document exists
            const count = await ConfigSchema.countDocuments({ key: 'test_key' });
            expect(count).toBe(1);
        });

        test('should handle different value types', async () => {
            // String value
            const str = await ConfigService.saveConfig('str_key', 'string_value');
            expect(str.value).toBe('string_value');

            // Number value (converted to string)
            const num = await ConfigService.saveConfig('num_key', '123');
            expect(num.value).toBe('123');
        });

        test('should handle errors gracefully', async () => {
            // Mock Configuration.findOneAndUpdate to throw an error
            const originalFindOneAndUpdate = ConfigSchema.findOneAndUpdate;
            ConfigSchema.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(ConfigService.saveConfig('error_key', 'error_value')).rejects.toThrow('Database error');

            // Restore original method
            ConfigSchema.findOneAndUpdate = originalFindOneAndUpdate;
        });
    });

    describe('getConfigValue', () => {
        test('should get config value by key', async () => {
            await ConfigService.saveConfig('max_requests', '100');

            const value = await ConfigService.getConfigValue('max_requests');

            expect(value).toBe('100');
        });

        test('should return null for non-existent config', async () => {
            const value = await ConfigService.getConfigValue('nonexistent_key');

            expect(value).toBeNull();
        });

        test('should handle errors gracefully', async () => {
            // Mock Configuration.findOne to throw an error
            const originalFindOne = ConfigSchema.findOne;
            ConfigSchema.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(ConfigService.getConfigValue('error_key')).rejects.toThrow('Database error');

            // Restore original method
            ConfigSchema.findOne = originalFindOne;
        });
    });

    describe('getAllConfigs', () => {
        test('should get all configs', async () => {
            await ConfigService.saveConfig('key1', 'val1');
            await ConfigService.saveConfig('key2', 'val2');
            await ConfigService.saveConfig('key3', 'val3');

            const all = await ConfigService.getAllConfigs();

            expect(all).toHaveLength(3);
            expect(all.map((c: any) => c.key)).toContain('key1');
            expect(all.map((c: any) => c.key)).toContain('key2');
            expect(all.map((c: any) => c.key)).toContain('key3');
        });

        test('should return empty array when no configs exist', async () => {
            const all = await ConfigService.getAllConfigs();

            expect(all).toEqual([]);
        });

        test('should handle errors gracefully', async () => {
            // Mock Configuration.find to throw an error
            const originalFind = ConfigSchema.find;
            ConfigSchema.find = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(ConfigService.getAllConfigs()).rejects.toThrow('Database error');

            // Restore original method
            ConfigSchema.find = originalFind;
        });
    });
});
