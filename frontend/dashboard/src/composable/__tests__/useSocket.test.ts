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
    
    expect(mockSocket.on).toHaveBeenCalledWith('system:status_update', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('system:job_progress', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('intel:attack_detected', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('intel:new_log', expect.any(Function));
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

  it('should add new attack to dashboard when intel:attack_detected is received', () => {
    mount(TestComponent);
    const dashboardStore = useDashboardStore();
    dashboardStore.state.recentAttacks = [];
    
    const attackListener = mockSocket.on.mock.calls.find(call => call[0] === 'intel:attack_detected')[1];
    
    const mockAttack = { _id: 'attack1', ip: '1.1.1.1' };
    attackListener(mockAttack);
    
    expect(dashboardStore.state.recentAttacks).toHaveLength(1);
    expect(dashboardStore.state.recentAttacks[0]).toEqual(mockAttack);
  });
});
