'use strict';

const dsarService = require('../backend/services/dsar-service');
const emailNotificationService = require('../backend/services/email-notification-service');

describe('Customer Mail Request Automated Processing (End-to-End)', () => {

  test('should successfully orchestrate all 7 statutory stages and dispatch certificate email', async () => {
    const emailPayload = {
      email: 'priya.nair@example.in',
      fullName: 'Priya Nair',
      requestText: 'Please delete and erase all personal marketing and account data under GDPR Art 17 and DPDP Act.',
      requestType: 'Erasure / Deletion'
    };

    const result = await dsarService.processCustomerEmailRequest(emailPayload);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.requestId).toMatch(/^DSAR-\d{4}-\w+$/);
    expect(result.certificateId).toBeDefined();
    expect(result.customerEmail).toBe('priya.nair@example.in');
    expect(result.customerName).toBe('Priya Nair');

    // Verify all 7 statutory lifecycle stages
    expect(result.stages).toBeDefined();
    expect(result.stages.intake).toBeDefined();
    expect(result.stages.discovery).toBeDefined();
    expect(result.stages.impact).toBeDefined();
    expect(result.stages.policy).toBeDefined();
    expect(result.stages.approval).toBeDefined();
    expect(result.stages.execution).toBeDefined();
    expect(result.stages.verification).toBeDefined();
    expect(result.stages.certificate).toBeDefined();
    expect(result.stages.emailDispatch).toBeDefined();

    // Verify certificate generation
    expect(result.stages.certificate.success).toBe(true);
    expect(result.stages.certificate.certificate).toBeDefined();
    expect(result.stages.certificate.certificate.digitalCertificateSeal).toMatch(/^[a-f0-9]{64}$/);

    // Verify email dispatch receipt
    expect(result.stages.emailDispatch.success).toBe(true);
    expect(result.stages.emailDispatch.receipt.recipient).toBe('priya.nair@example.in');
    expect(result.stages.emailDispatch.receipt.subject).toContain('Official Certificate of Data Erasure');
    expect(result.stages.emailDispatch.receipt.html).toContain('Priya Nair');
    expect(result.stages.emailDispatch.receipt.html).toContain(result.certificateId);
  });

  test('should return success: false if an invalid email address is supplied', async () => {
    const res = await dsarService.processCustomerEmailRequest({
      email: 'invalid-email-address',
      fullName: 'Test User'
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('valid customer email address is required');
  });

  test('should process custom user email entered manually and deliver to that specific address', async () => {
    const customUser = {
      email: 'manoj.sharma@customdomain.io',
      fullName: 'Manoj Sharma',
      requestText: 'I would like to export all my personal data held by Segmento.',
      requestType: 'Access & Export'
    };

    const result = await dsarService.processCustomerEmailRequest(customUser);
    expect(result.success).toBe(true);
    expect(result.customerEmail).toBe('manoj.sharma@customdomain.io');
    expect(result.customerName).toBe('Manoj Sharma');
    expect(result.stages.emailDispatch.receipt.recipient).toBe('manoj.sharma@customdomain.io');
    expect(result.stages.emailDispatch.receipt.html).toContain('Manoj Sharma');
  });
});
