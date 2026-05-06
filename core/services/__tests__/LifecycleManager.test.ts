import 'reflect-metadata';
import { getComponent, container } from '../../di/container';
import { setupContainer } from '../../di/registry';
import { LifecycleManager } from '../LifecycleManager';
import { LOGGER_TOKEN, LIFECYCLE_MANAGER_TOKEN } from '../../di/tokens';
import { ServiceStatus } from '../../types/lifecycle';

describe('LifecycleManager', () => {
    let lifecycleManager: LifecycleManager;
    let mockLogger: any;

    beforeEach(() => {
        setupContainer(container);
        container.clearInstances();

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn()
        };

        container.registerInstance(LOGGER_TOKEN, mockLogger);
        lifecycleManager = getComponent(LIFECYCLE_MANAGER_TOKEN);
    });

    const createMockService = (name: string, status: ServiceStatus = ServiceStatus.RUNNING) => ({
        serviceName: name,
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        getStatus: jest.fn().mockReturnValue(status)
    });

    describe('register', () => {
        it('should register services', () => {
            const service = createMockService('TestService');
            lifecycleManager.register(service as any);
            expect((lifecycleManager as any).services).toContain(service);
            expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('TestService'));
        });
    });

    describe('boot', () => {
        it('should start all registered services', async () => {
            const service1 = createMockService('Service1');
            const service2 = createMockService('Service2');
            lifecycleManager.register(service1 as any);
            lifecycleManager.register(service2 as any);

            await lifecycleManager.boot();

            expect(service1.start).toHaveBeenCalled();
            expect(service2.start).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('bootstrap completata'));
        });

        it('should handle service startup failures gracefully', async () => {
            const service1 = createMockService('FailingService');
            (service1.start as jest.Mock).mockRejectedValue(new Error('Startup failed'));
            const service2 = createMockService('WorkingService');
            
            lifecycleManager.register(service1 as any);
            lifecycleManager.register(service2 as any);

            await lifecycleManager.boot();

            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Fallimento avvio FailingService: Startup failed'));
            expect(service2.start).toHaveBeenCalled(); // Should still try to start others
        });

        it('should handle service startup timeouts', async () => {
            const service = createMockService('TimeoutService');
            // Mock a long running start that exceeds the 30s timeout
            service.start = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 60000)));
            
            lifecycleManager.register(service as any);

            // Temporarily reduce timeout for testing if possible, 
            // but LifecycleManager has hardcoded 30000. 
            // We can use jest.useFakeTimers()
            jest.useFakeTimers();
            const bootPromise = lifecycleManager.boot();
            
            // Allow the code to reach the withTimeout call
            await Promise.resolve();
            
            // Fast-forward 31 seconds
            jest.advanceTimersByTime(31000);
            
            // Allow the promises to settle after timer firing
            await Promise.resolve();
            await bootPromise;
            
            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Timeout durante l\'avvio di TimeoutService'));
            jest.useRealTimers();
        });
    });

    describe('shutdown', () => {
        it('should stop all registered services', async () => {
            const service1 = createMockService('Service1');
            const service2 = createMockService('Service2');
            lifecycleManager.register(service1 as any);
            lifecycleManager.register(service2 as any);

            await lifecycleManager.shutdown();

            expect(service1.stop).toHaveBeenCalled();
            expect(service2.stop).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Spegnimento di 2 servizi in corso...'));
        });

        it('should handle errors during shutdown gracefully', async () => {
            const service = createMockService('ErrorService');
            service.stop.mockImplementation(() => { throw new Error('Stop failed'); });
            
            lifecycleManager.register(service as any);
            await lifecycleManager.shutdown();

            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Errore fermando ErrorService: Stop failed'));
        });
    });

    describe('reportStatus', () => {
        it('should report status of all services', async () => {
            const service1 = createMockService('RunningService', ServiceStatus.RUNNING);
            const service2 = createMockService('FailedService', ServiceStatus.FAILED);
            lifecycleManager.register(service1 as any);
            lifecycleManager.register(service2 as any);

            // reportStatus is private, called by boot()
            await lifecycleManager.boot();

            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('✅ RunningService: RUNNING'));
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('❌ FailedService: FAILED'));
        });
    });
});
