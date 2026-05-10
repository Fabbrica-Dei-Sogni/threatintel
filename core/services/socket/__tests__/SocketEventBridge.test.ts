import "reflect-metadata";
import { SocketEventBridge } from "../SocketEventBridge";
import { EventBus, AppEvents } from "../../EventBus";
import { SocketServerHub } from "../SocketServerHub";
import { Logger } from "winston";

describe("SocketEventBridge", () => {
    let bridge: SocketEventBridge;
    let eventBus: EventBus;
    let socketHub: jest.Mocked<SocketServerHub>;
    let logger: jest.Mocked<Logger>;

    beforeEach(() => {
        logger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        } as any;
        eventBus = new EventBus(logger);
        socketHub = {
            emit: jest.fn(),
        } as any;

        bridge = new SocketEventBridge(logger, eventBus, socketHub);
        bridge.initialize();
    });

    it("should emit intel:new_log when THREAT_LOG_CREATED is emitted", () => {
        const mockLog = { id: "log1", message: "attack" };
        eventBus.emit(AppEvents.THREAT_LOG_CREATED, mockLog);

        expect(socketHub.emit).toHaveBeenCalledWith("intel:new_log", mockLog);
    });

    it("should emit intel:attack_detected when ATTACK_RESOLVED is emitted", () => {
        const mockAttack = { id: "123", ip: "1.1.1.1" };
        eventBus.emit(AppEvents.ATTACK_RESOLVED, mockAttack);

        expect(socketHub.emit).toHaveBeenCalledWith("intel:attack_detected", mockAttack);
    });

    it("should emit system:job_progress when JOB_PROGRESS is emitted", () => {
        const mockProgress = { id: "job1", progress: 50 };
        eventBus.emit(AppEvents.JOB_PROGRESS, mockProgress);

        expect(socketHub.emit).toHaveBeenCalledWith("system:job_progress", mockProgress);
    });

    it("should emit system:status_update when SYSTEM_STATUS_UPDATED is emitted", () => {
        const mockStatus = "SYNCING";
        eventBus.emit(AppEvents.SYSTEM_STATUS_UPDATED, mockStatus);

        expect(socketHub.emit).toHaveBeenCalledWith("system:status_update", mockStatus);
    });
});
