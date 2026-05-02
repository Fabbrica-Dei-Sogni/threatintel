/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import { calculateCorrelationHubs, NodeTimeInfo } from '../utils/CampaignAnalytics';

describe('CampaignAnalytics - Sweep-line Algorithm', () => {

    it('should return empty array if nodes are less than 2', () => {
        const nodes: NodeTimeInfo[] = [
            { ip: '1.1.1.1', firstSeen: '2026-01-01T10:00:00Z', lastSeen: '2026-01-01T11:00:00Z' }
        ];
        expect(calculateCorrelationHubs(nodes)).toEqual([]);
        expect(calculateCorrelationHubs([])).toEqual([]);
    });

    it('should identify a correlation hub when two IPs overlap in time', () => {
        const nodes: NodeTimeInfo[] = [
            { ip: '1.1.1.1', firstSeen: 1000, lastSeen: 3000 },
            { ip: '2.2.2.2', firstSeen: 2000, lastSeen: 4000 }
        ];

        const windows = calculateCorrelationHubs(nodes);

        // Expected hub: from 2000 to 3000 with both IPs
        expect(windows).toHaveLength(1);
        expect(windows[0]).toEqual({
            start: 2000,
            end: 3000,
            ips: ['1.1.1.1', '2.2.2.2']
        });
    });

    it('should identify multiple hubs for complex overlapping scenarios', () => {
        const nodes: NodeTimeInfo[] = [
            { ip: 'A', firstSeen: 10, lastSeen: 50 },
            { ip: 'B', firstSeen: 20, lastSeen: 40 },
            { ip: 'C', firstSeen: 30, lastSeen: 60 }
        ];

        const windows = calculateCorrelationHubs(nodes);

        // Expected progression:
        // [10-20]: A (active: 1) -> No window
        // [20-30]: A, B (active: 2) -> Window 1
        // [30-40]: A, B, C (active: 3) -> Window 2
        // [40-50]: A, C (active: 2) -> Window 3
        // [50-60]: C (active: 1) -> No window

        expect(windows).toHaveLength(3);
        expect(windows[0].ips).toEqual(['A', 'B']);
        expect(windows[0].start).toBe(20);
        expect(windows[0].end).toBe(30);

        expect(windows[1].ips).toEqual(['A', 'B', 'C']);
        expect(windows[1].start).toBe(30);
        expect(windows[1].end).toBe(40);

        expect(windows[2].ips).toEqual(['A', 'C']);
        expect(windows[2].start).toBe(40);
        expect(windows[2].end).toBe(50);
    });

    it('should merge contiguous windows with same IP set', () => {
        // Scenario: A and B start together, C joins later but then B leaves and A continues with C
        // Wait, the merge logic: if lastWindow has same IPs, extend it.
        
        const nodes: NodeTimeInfo[] = [
            { ip: 'A', firstSeen: 10, lastSeen: 100 },
            { ip: 'B', firstSeen: 10, lastSeen: 50 },
            { ip: 'B', firstSeen: 50, lastSeen: 80 } // B "restarts" immediately
        ];

        const windows = calculateCorrelationHubs(nodes);

        // Expected: A and B are together from 10 to 80.
        // Even if B has two segments, the sweep-line sees them as one continuous block of "active IPs: {A, B}"
        expect(windows).toHaveLength(1);
        expect(windows[0].start).toBe(10);
        expect(windows[0].end).toBe(80);
        expect(windows[0].ips).toEqual(['A', 'B']);
    });

    it('should handle disjoint activity periods', () => {
        const nodes: NodeTimeInfo[] = [
            { ip: 'A', firstSeen: 10, lastSeen: 20 },
            { ip: 'B', firstSeen: 10, lastSeen: 20 },
            { ip: 'A', firstSeen: 40, lastSeen: 50 },
            { ip: 'B', firstSeen: 40, lastSeen: 50 }
        ];

        const windows = calculateCorrelationHubs(nodes);

        expect(windows).toHaveLength(2);
        expect(windows[0].start).toBe(10);
        expect(windows[0].end).toBe(20);
        expect(windows[1].start).toBe(40);
        expect(windows[1].end).toBe(50);
    });

    it('should ignore windows with only one IP', () => {
        const nodes: NodeTimeInfo[] = [
            { ip: 'A', firstSeen: 10, lastSeen: 100 },
            { ip: 'B', firstSeen: 120, lastSeen: 150 }
        ];

        const windows = calculateCorrelationHubs(nodes);
        expect(windows).toHaveLength(0);
    });

});
