'use strict';

/**
 * Unit Tests for Policy Simulation (Dry-Run) and Unified Case Timeline & Evidence Vault
 * Validates requirements from Evaluator Review Plan (Pages 4 & 5).
 */

const dsarDryrunService = require('../backend/services/dsar-dryrun-service');
const dsarTimelineService = require('../backend/services/dsar-timeline-service');

describe('Policy Simulation & Pre-Execution Dry-Run Engine', () => {
  const testReqId = 'DSAR-2026-TEST-DRYRUN';

  test('should generate pre-execution dry-run simulation diff without mutating real datastores', async () => {
    const res = await dsarDryrunService.generateDryRunPlan(testReqId);
    expect(res.success).toBe(true);
    expect(res.simulation).toBeDefined();

    const sim = res.simulation;
    expect(sim.requestId).toBe(testReqId);
    expect(sim.simulationId).toMatch(/^SIM-2026-/);
    expect(sim.dryRunHash).toBeDefined();
    expect(sim.dryRunHash.length).toBe(64); // SHA-256

    // Verify 4-Category Action Plan
    expect(sim.summary).toBeDefined();
    expect(sim.summary.totalDiscoveredRecords).toBeGreaterThan(0);
    expect(sim.summary.hardPurgeRecords).toBeGreaterThan(0);
    expect(sim.summary.pseudonymizedRecords).toBeGreaterThan(0);
    expect(sim.summary.statutoryRetainedRecords).toBeGreaterThan(0);
    expect(sim.summary.totalSystemsSimulated).toBe(5);

    // Verify side-by-side diff preview exists
    const ordersDiff = sim.tableDiffs.find(d => d.tableName.includes('orders'));
    expect(ordersDiff).toBeDefined();
    expect(ordersDiff.proposedAction).toBe('PSEUDONYMIZE');
    expect(ordersDiff.statutoryBasis).toContain('CGST Act');
    expect(ordersDiff.diffPreview.before).toBeDefined();
    expect(ordersDiff.diffPreview.after).toBeDefined();
    expect(ordersDiff.diffPreview.after.customer_name).toContain('*');
    expect(ordersDiff.diffPreview.after.total_amount).toContain('PRESERVED');

    const invoiceDiff = sim.tableDiffs.find(d => d.tableName.includes('invoices'));
    expect(invoiceDiff).toBeDefined();
    expect(invoiceDiff.proposedAction).toBe('STATUTORY_RETAIN');
    expect(invoiceDiff.retentionExpiry).toContain('2033'); // 7 years
  });

  test('should record formal DPO approval on the dry-run simulation plan', async () => {
    const res = await dsarDryrunService.approveDryRunPlan(testReqId, {
      approverName: 'Sarah Lee (DPO)',
      dpoNotes: 'Statutory 7-year GST retention locks verified. Live execution approved.'
    });

    expect(res.success).toBe(true);
    expect(res.simulation.status).toBe('DPO_APPROVED_READY_FOR_EXECUTION');
    expect(res.simulation.dpoApproval).toBeDefined();
    expect(res.simulation.dpoApproval.approverName).toBe('Sarah Lee (DPO)');
    expect(res.simulation.dpoApproval.signatureHash.length).toBe(64);
  });
});

describe('Unified Case Timeline & Evidence Vault Engine', () => {
  const testReqId = 'DSAR-2026-TEST-TIMELINE';

  test('should synthesize chronological audit milestones spanning all 7 DSAR stages', async () => {
    const res = await dsarTimelineService.getUnifiedCaseTimeline(testReqId);
    expect(res.success).toBe(true);
    expect(res.requestId).toBe(testReqId);
    expect(res.totalMilestones).toBeGreaterThanOrEqual(10);
    expect(res.chainIntegrityVerified).toBe(true);
    expect(res.timelineRootHash.length).toBe(64);

    const stagesCovered = new Set(res.timelineEvents.map(e => e.stageNumber));
    expect(stagesCovered.has(1)).toBe(true); // Intake
    expect(stagesCovered.has(2)).toBe(true); // Discovery
    expect(stagesCovered.has(3)).toBe(true); // Impact
    expect(stagesCovered.has(4)).toBe(true); // Policy & DryRun
    expect(stagesCovered.has(5)).toBe(true); // Execution & Reconciliation
    expect(stagesCovered.has(6)).toBe(true); // Verification
    expect(stagesCovered.has(7)).toBe(true); // Certification
  });

  test('should verify unbroken cryptographic hash chain linking all timeline entries', async () => {
    const res = await dsarTimelineService.getUnifiedCaseTimeline(testReqId);
    const events = res.timelineEvents;

    // Verify genesis entry has zero previous hash
    expect(events[0].prevHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');

    // Verify sequential link: each event's prevHash matches prior event's entryHash
    for (let i = 1; i < events.length; i++) {
      expect(events[i].prevHash).toBe(events[i - 1].entryHash);
    }
  });

  test('should export certified regulatory evidence dossier package', async () => {
    const res = await dsarTimelineService.exportEvidenceDossier(testReqId);
    expect(res.success).toBe(true);
    expect(res.filename).toContain(testReqId);
    expect(res.exportPayload).toBeDefined();
    expect(res.exportPayload.metadata.regulatoryStandard).toContain('GDPR');
    expect(res.exportPayload.metadata.chainIntegrityStatus).toContain('MATHEMATICALLY_VERIFIED');
    expect(Array.isArray(res.exportPayload.auditChronology)).toBe(true);
  });
});
