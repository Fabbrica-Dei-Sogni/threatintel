export enum ServiceStatus {
    IDLE = 'IDLE',
    STARTING = 'STARTING',
    RUNNING = 'RUNNING',
    FAILED = 'FAILED',
    DEGRADED = 'DEGRADED'
}

export interface ILongRunningService {
    serviceName: string;
    start(): Promise<void>;
    stop(): void;
    getStatus(): ServiceStatus;
}
