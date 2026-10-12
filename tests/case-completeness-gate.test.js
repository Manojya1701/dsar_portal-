'use strict';

const connectorReconciliationService = require('../backend/services/connector-reconciliation-service');
const dsarCertificateService = require('../backend/services/dsar-certificate-service');

describe('Downstream Connector Reconciliation & Case Completeness Gate Engine', () => {
  const TEST_REQ_ID = 'DSAR-2026-GATE-TEST-001';

  beforeEach(() => {
    // Reset test request reconciliation state
    connectorReconciliationService.store.delete(TEST_REQ_ID);
  });

  test('1. Should return default manifest with 5 confirmed connectors and gate passed', () => {
    const manifest = connectorReconciliationService.getReconciliationManifest(TEST_REQ_ID);

    expect(manifest.success).toBe(true);
    expect(manifest.totalConnectors).toBe(5);
    expect(manifest.confirmedCount).toBe(5);
    expect(manifest.dlqCount).toBe(0);
    expect(manifest.gatePassed).toBe(true);
    expect(manifest.gateStatus).toBe('PASSED');
    expect(manifest.connectors.length).toBe(5);
  });

  test('2. Should successfully generate Certificate when Completeness Gate passes', async () => {
    const res = await dsarCertificateService.generateDsarCertificate(TEST_REQ_ID);

    expect(res.success).toBe(true);
    expect(res.certificateId).toBeDefined();
    expect(res.connectorReconciliation).toBeDefined();
    expect(res.connectorReconciliation.gatePassed).toBe(true);
    expect(res.connectorReconciliation.gateStatus).toBe('PASSED');
    expect(res.connectorReconciliation.confirmedCount).toBe(5);
  });

  test('3. Should simulate connector timeout, route to DLQ, and TRIP the Case Completeness Gate', async () => {
    // Simulate timeout on Marketing Cloud connector
    const simRes = connectorReconciliationService.simulateConnectorTimeout(TEST_REQ_ID, 'connector-marketing');

    expect(simRes.gatePassed).toBe(false);
    expect(simRes.gateStatus).toBe('BLOCKED_DLQ');
    expect(simRes.dlqCount).toBe(1);
    expect(simRes.blockedConnectors.length).toBe(1);
    expect(simRes.blockedConnectors[0].id).toBe('connector-marketing');
    expect(simRes.blockedConnectors[0].lastError).toContain('504 Gateway Timeout');

    // Attempting to generate Certificate MUST be blocked by Gate
    const certRes = await dsarCertificateService.generateDsarCertificate(TEST_REQ_ID);

    expect(certRes.success).toBe(false);
    expect(certRes.blockedByGate).toBe(true);
    expect(certRes.gateStatus).toBe('BLOCKED_DLQ');
    expect(certRes.message).toContain('Case Completeness Gate TRIPPED');
    expect(certRes.blockedConnectors[0].id).toBe('connector-marketing');
  });

  test('4. Should replay from DLQ, resolve connector, and re-allow Certificate generation', async () => {
    // Trip gate first
    connectorReconciliationService.simulateConnectorTimeout(TEST_REQ_ID, 'connector-marketing');
    let gateCheck = connectorReconciliationService.validateCompletenessGate(TEST_REQ_ID);
    expect(gateCheck.passed).toBe(false);

    // Replay event from DLQ
    const replayRes = connectorReconciliationService.replayDlq(TEST_REQ_ID, 'connector-marketing');

    expect(replayRes.gatePassed).toBe(true);
    expect(replayRes.gateStatus).toBe('PASSED');
    expect(replayRes.dlqCount).toBe(0);

    // Certificate generation now succeeds
    const certRes = await dsarCertificateService.generateDsarCertificate(TEST_REQ_ID);

    expect(certRes.success).toBe(true);
    expect(certRes.certificateId).toBeDefined();
    expect(certRes.connectorReconciliation.gatePassed).toBe(true);
  });

  test('5. Should allow Case Completeness Gate to pass under documented statutory DPO Exception', async () => {
    // Trip gate
    connectorReconciliationService.simulateConnectorTimeout(TEST_REQ_ID, 'connector-marketing');

    // Sign DPO Exception
    const excRes = connectorReconciliationService.grantDpoLegalException(TEST_REQ_ID, {
      connectorId: 'connector-marketing',
      dpoName: 'Sarah Lee (DPO)',
      exceptionReason: 'Vendor maintenance window; verified manual purge via SQL script #PURGE-901',
      legalStatutoryBasis: 'GDPR Art. 17(3)(b)'
    });

    expect(excRes.gatePassed).toBe(true);
    expect(excRes.exceptionCount).toBe(1);
    expect(excRes.grantedException.signedBy).toBe('Sarah Lee (DPO)');
    expect(excRes.grantedException.cryptographicSeal).toBeDefined();

    // Certificate is granted with exception noted
    const certRes = await dsarCertificateService.generateDsarCertificate(TEST_REQ_ID);

    expect(certRes.success).toBe(true);
    expect(certRes.connectorReconciliation.exceptionCount).toBe(1);
    expect(certRes.connectorReconciliation.dpoExceptions.length).toBe(1);
  });
});
