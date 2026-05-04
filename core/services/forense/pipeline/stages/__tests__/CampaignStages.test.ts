import { CampaignGroupingStage } from '../CampaignGroupingStage';
import { CampaignDetailGroupingStage } from '../CampaignDetailGroupingStage';
import { CampaignFacetStage } from '../CampaignFacetStage';

describe('Campaign Pipeline Stages', () => {
    describe('CampaignGroupingStage', () => {
        it('should generate two-level grouping stages', () => {
            const stage = new CampaignGroupingStage(5);
            const pipeline = stage.generate();
            
            expect(pipeline).toHaveLength(4);
            expect(pipeline[0].$group._id).toEqual({ hash: '$fingerprint.hash', ip: '$request.ip' });
            expect(pipeline[1].$match.logsPerIp.$gte).toBe(5);
            expect(pipeline[2].$group._id).toBe('$_id.hash');
            expect(pipeline[3].$project.hash).toBe('$_id');
        });
    });

    describe('CampaignDetailGroupingStage', () => {
        it('should generate detailed grouping with geo lookup and facets', () => {
            const stage = new CampaignDetailGroupingStage(2, 10, 1, 10);
            const pipeline = stage.generate();
            
            expect(pipeline.length).toBeGreaterThan(5);
            expect(pipeline[0].$group._id).toBe('$request.ip');
            expect(pipeline[1].$match.totaleLogs.$gte).toBe(2);
            expect(pipeline[4].$lookup.from).toBe('ipdetails');
            expect(pipeline[pipeline.length - 1].$facet).toBeDefined();
            expect(pipeline[pipeline.length - 1].$facet.meta).toBeDefined();
            expect(pipeline[pipeline.length - 1].$facet.nodes).toBeDefined();
        });
    });

    describe('CampaignFacetStage', () => {
        it('should generate discovery facets', () => {
            const stage = new CampaignFacetStage(3, 5);
            const pipeline = stage.generate();
            
            expect(pipeline).toHaveLength(1);
            expect(pipeline[0].$facet).toBeDefined();
            expect(pipeline[0].$facet.discoveryCandidates).toBeDefined();
            expect(pipeline[0].$facet.boundsIps).toBeDefined();
            
            const matchStage = pipeline[0].$facet.discoveryCandidates[0].$match;
            expect(matchStage.ipCount.$gte).toBe(3);
            expect(matchStage.averageScore.$gte).toBe(5);
        });
    });
});
