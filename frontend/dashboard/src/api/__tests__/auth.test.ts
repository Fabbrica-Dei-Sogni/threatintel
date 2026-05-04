/**
 * ThreatIntel - Reference Implementation Dashboard
 * 
 * This file is part of the reference frontend implementation of the 
 * ThreatIntel Distributed Forensics Engine.
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Production or commercial use of this specific interface requires 
 * a valid commercial license from the author.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { loginUser, registerUser, getAuthMode, apiClient } from '../auth';

describe('API auth', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  it('should login user', async () => {
    mock.onPost('/auth/login').reply(200, { token: 'tk' });
    const res = await loginUser('user', 'pass');
    expect(res.data.token).toBe('tk');
  });

  it('should register user', async () => {
    mock.onPost('/auth/register').reply(200, { userId: '1' });
    const res = await registerUser('user', 'email', 'pass');
    expect(res.data.userId).toBe('1');
  });

  it('should get auth mode', async () => {
    mock.onGet('/auth/mode').reply(200, { allowAnonymous: true });
    const res = await getAuthMode();
    expect(res.data.allowAnonymous).toBe(true);
  });
});
