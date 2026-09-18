import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSocket } from '../useSocket';
import { setActivePinia, createPinia } from 'pinia';
import { useDashboardStore } from '../../stores/dashboard';
import { useJobStore } from '../../stores/jobs';
import { useSocketStore } from '../../stores/socket';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

// Mock Socket.io
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('../../stores/socket', () => ({
  useSocketStore: vi.fn(() => ({
    socket: mockSocket,
    connect: vi.fn(),
    isConnected: true
  }))
}));

vi.mock('element-plus', () => ({
  ElNotification: vi.fn()
}));

// Mock i18n
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}));

describe('useSocket', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const TestComponent = defineComponent({
    setup() {
      return useSocket();
    },
    template: '<div></div>'
  });

  it('should register listeners on mount', () => {
    mount(TestComponent);
    
    // Listener attivi — intel:attack_detected è commentato di proposito (gestito dal polling)
    expect(mockSocket.on).toHaveBeenCalledWith('system:status_update', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('system:job_progress', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('intel:new_log', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('intel:ai_response', expect.any(Function));
  });

  it('should update engineStatus when system:status_update is received', () => {
    mount(TestComponent);
    const dashboardStore = useDashboardStore();
    
    const statusListener = mockSocket.on.mock.calls.find(call => call[0] === 'system:status_update')[1];
    
    statusListener('SYNCING');
    expect(dashboardStore.state.engineStatus).toBe('SYNCING');
  });

  it('should update job status when system:job_progress is received', () => {
    mount(TestComponent);
    const jobStore = useJobStore();
    const updateSpy = vi.spyOn(jobStore, 'updateJobStatus');
    
    const progressListener = mockSocket.on.mock.calls.find(call => call[0] === 'system:job_progress')[1];
    
    const jobData = { id: 'job1', status: 'running', progress: 50, jobName: 'Test' };
    progressListener(jobData);
    
    expect(updateSpy).toHaveBeenCalledWith('job1', expect.objectContaining({
      status: 'running',
      progress: 50
    }));
  });

  it('should add new log to dashboard when intel:new_log is received', () => {
    mount(TestComponent);
    const dashboardStore = useDashboardStore();
    dashboardStore.state.recentLogs = [];
    
    const logListener = mockSocket.on.mock.calls.find(call => call[0] === 'intel:new_log')[1];
    
    const mockLog = { _id: 'log1', ip: '2.2.2.2' };
    logListener(mockLog);
    
    expect(dashboardStore.state.recentLogs).toHaveLength(1);
    expect(dashboardStore.state.recentLogs[0]).toEqual(mockLog);
  });
});
