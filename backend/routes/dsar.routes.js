'use strict';

const express = require('express');
const router = express.Router();

const db = require('../database/db');
const auditService = require('../services/audit-service');
const privacyDeletionService = require('../services/privacy-deletion-service');
const emailSearchService = require('../services/email-search-service');
const dsarService = require('../services/dsar-service');
const dsarDiscoveryService = require('../services/dsar-discovery-service');
const dsarImpactService = require('../services/dsar-impact-service');
const dsarPolicyService = require('../services/dsar-policy-service');
const dsarExecutionService = require('../services/dsar-execution-service');
const dsarVerificationService = require('../services/dsar-verification-service');
const dsarCertificateService = require('../services/dsar-certificate-service');
const emailNotificationService = require('../services/email-notification-service');
const dsarSettingsService = require('../services/dsar-settings-service');

function jsonError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

// ── DSAR ERASURE WORKFLOW ROUTES (Segmento Protect Step 1) ─────────────────

// POST /api/dsar/analyze-intent — AI Natural Language Intent & Multi-Type Classification
router.post('/dsar/analyze-intent', async (req, res) => {
  try {
    const result = await dsarService.analyzeDsarIntent(req.body || {});
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/process-email-request — End-to-End Automated Processing of Customer Email Request
router.post('/dsar/process-email-request', async (req, res) => {
  try {
    const result = await dsarService.processCustomerEmailRequest(req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.status(200).json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

router.post('/api/dsar/process-email-request', async (req, res) => {
  try {
    const result = await dsarService.processCustomerEmailRequest(req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.status(200).json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests — Submit new DSAR intake request
router.post('/dsar/requests', async (req, res) => {
  try {
    const result = await dsarService.createDsarRequest(req.body);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.status(201).json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/requests — Fetch all active DSAR intake requests
router.get('/dsar/requests', async (req, res) => {
  try {
    const result = await dsarService.getDsarRequests();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/reset — Reset DSAR queue to clean minimal demo records
router.post('/dsar/requests/reset', async (req, res) => {
  try {
    const result = await dsarService.resetDsarRequests();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/requests/:id — Fetch details for a specific DSAR tracking ID
router.get('/dsar/requests/:id', async (req, res) => {
  try {
    const result = await dsarService.getDsarRequestById(req.params.id);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/requests/:id/task — Update task assignment, priority, status, or notes
router.patch('/dsar/requests/:id/task', async (req, res) => {
  try {
    const result = await dsarService.updateDsarTask(req.params.id, req.body || {});
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/analytics/reports — Get aggregated compliance reports metrics
router.get('/dsar/analytics/reports', async (req, res) => {
  try {
    const result = await dsarService.getDsarComplianceReports();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/analytics/export — Download compliance audit report in CSV or JSON
router.get('/dsar/analytics/export', async (req, res) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    if (format === 'json') {
      const reports = await dsarService.getDsarComplianceReports();
      const { records } = await dsarService.getDsarRequests();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="dsar_compliance_audit_package.json"');
      return res.json({ reports, records, exportedAt: new Date().toISOString() });
    }

    const csvContent = await dsarService.exportDsarComplianceCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dsar_compliance_audit_report.csv"');
    return res.send(csvContent);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/requests/:id/details — Fetch full 7-tab ticket details & cross-team tasks
router.get('/dsar/requests/:id/details', async (req, res) => {
  try {
    const result = await dsarService.getDsarTicketDetails(req.params.id);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/requests/:id/subtasks/:taskId — Update individual departmental subtask
router.patch('/dsar/requests/:id/subtasks/:taskId', async (req, res) => {
  try {
    const result = await dsarService.updateDsarSubtask(req.params.id, req.params.taskId, req.body || {});
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/:id/approvals — Submit DPO or Legal sign-off
router.post('/dsar/requests/:id/approvals', async (req, res) => {
  try {
    const result = await dsarService.submitDsarApproval(req.params.id, req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/requests/:id/tasks/export — Export 6 departmental tasks in CSV
router.get('/dsar/requests/:id/tasks/export', async (req, res) => {
  try {
    const csvContent = await dsarService.exportDsarTasksCsv(req.params.id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}_departmental_tasks.csv"`);
    return res.send(csvContent);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── SCREEN 4: TEAM ASSIGNMENT & TASK DISTRIBUTION ROUTES ───────────────────

// GET /api/dsar/requests/:id/assignments — Get Screen 4 Team Assignment Overview
router.get('/dsar/requests/:id/assignments', async (req, res) => {
  try {
    const result = await dsarService.getTaskAssignmentOverview(req.params.id);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── SCREEN 5: INDIVIDUAL SUBTASK WORKSPACE ROUTES ──────────────────────────

// GET /api/dsar/requests/:id/subtasks/:taskId/detail — Get Screen 5 Subtask Details
router.get('/dsar/requests/:id/subtasks/:taskId/detail', async (req, res) => {
  try {
    const result = await dsarService.getIndividualSubtaskDetail(req.params.id, req.params.taskId);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/:id/subtasks/:taskId/instructions/:index — Toggle checklist
router.post('/dsar/requests/:id/subtasks/:taskId/instructions/:index', async (req, res) => {
  try {
    const { completed } = req.body || {};
    const result = await dsarService.toggleSubtaskInstruction(req.params.id, req.params.taskId, req.params.index, completed);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/:id/subtasks/:taskId/evidence — Attach evidence
router.post('/dsar/requests/:id/subtasks/:taskId/evidence', async (req, res) => {
  try {
    const result = await dsarService.addSubtaskEvidence(req.params.id, req.params.taskId, req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/:id/subtasks/:taskId/comments — Add task comment
router.post('/dsar/requests/:id/subtasks/:taskId/comments', async (req, res) => {
  try {
    const result = await dsarService.addSubtaskComment(req.params.id, req.params.taskId, req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR SCREEN 6 TEAM CONFIGURATION & SLA MANAGEMENT ROUTES ───────────────

// GET /api/dsar/teams/config — Fetch 8 master department teams & SLA config
router.get('/dsar/teams/config', async (req, res) => {
  try {
    const result = await dsarService.getTeamsConfig();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/teams/config (alternate route for direct /api prefix if router used without mount)
router.get('/api/dsar/teams/config', async (req, res) => {
  try {
    const result = await dsarService.getTeamsConfig();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/teams/config/:teamId — Update team properties or statutory SLA turnaround
router.patch('/dsar/teams/config/:teamId', async (req, res) => {
  try {
    const result = await dsarService.updateTeamConfig(req.params.teamId, req.body || {});
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/teams/config/:teamId (alternate route)
router.patch('/api/dsar/teams/config/:teamId', async (req, res) => {
  try {
    const result = await dsarService.updateTeamConfig(req.params.teamId, req.body || {});
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/teams/config — Add new custom department team
router.post('/dsar/teams/config', async (req, res) => {
  try {
    const result = await dsarService.createTeamConfig(req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.status(201).json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/teams/config (alternate route)
router.post('/api/dsar/teams/config', async (req, res) => {
  try {
    const result = await dsarService.createTeamConfig(req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.status(201).json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/teams/config/reset — Reset teams to default 8 master department configurations
router.post('/dsar/teams/config/reset', async (req, res) => {
  try {
    const result = await dsarService.resetTeamsConfig();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/teams/config/reset (alternate route)
router.post('/api/dsar/teams/config/reset', async (req, res) => {
  try {
    const result = await dsarService.resetTeamsConfig();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR TASK ASSIGNMENT EMAIL NOTIFICATIONS & DISPATCHER ROUTES ───────────

// POST /api/dsar/requests/:id/notify-teams — Bulk notify all 6 assigned department leads
router.post('/dsar/requests/:id/notify-teams', async (req, res) => {
  try {
    const { customNotes } = req.body || {};
    const result = await emailNotificationService.notifyAllAssignedTeams(req.params.id, customNotes);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/:id/notify-teams (alternate route)
router.post('/api/dsar/requests/:id/notify-teams', async (req, res) => {
  try {
    const { customNotes } = req.body || {};
    const result = await emailNotificationService.notifyAllAssignedTeams(req.params.id, customNotes);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/:id/subtasks/:taskId/notify — Notify individual task lead
router.post('/dsar/requests/:id/subtasks/:taskId/notify', async (req, res) => {
  try {
    const { recipientEmail, customNotes } = req.body || {};
    const result = await emailNotificationService.sendTaskAssignmentEmail(req.params.id, req.params.taskId, recipientEmail, customNotes);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/requests/:id/subtasks/:taskId/notify (alternate route)
router.post('/api/dsar/requests/:id/subtasks/:taskId/notify', async (req, res) => {
  try {
    const { recipientEmail, customNotes } = req.body || {};
    const result = await emailNotificationService.sendTaskAssignmentEmail(req.params.id, req.params.taskId, recipientEmail, customNotes);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR PLATFORM SETTINGS & PREFERENCES ROUTES ────────────────────────────

// GET /api/dsar/settings — Fetch system preferences & SMTP/Compliance settings
router.get('/dsar/settings', async (req, res) => {
  try {
    const result = await dsarSettingsService.getSettings();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/settings (alternate route)
router.get('/api/dsar/settings', async (req, res) => {
  try {
    const result = await dsarSettingsService.getSettings();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/settings/:category — Update settings category (email, statutory, security, organization)
router.patch('/dsar/settings/:category', async (req, res) => {
  try {
    const result = await dsarSettingsService.updateSettings(req.params.category, req.body || {});
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/settings/:category (alternate route)
router.patch('/api/dsar/settings/:category', async (req, res) => {
  try {
    const result = await dsarSettingsService.updateSettings(req.params.category, req.body || {});
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/settings/test-email — Send test email dispatch
router.post('/dsar/settings/test-email', async (req, res) => {
  try {
    const { targetEmail, testType, smtpConfig } = req.body || {};
    const result = await emailNotificationService.sendTestEmail(targetEmail, testType, smtpConfig);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/preview-email/:id — Render sent HTML email in browser
router.get('/dsar/preview-email/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await emailNotificationService.getEmailDispatchHistory();
    const item = Array.isArray(history) ? history.find(h => h.id === id || h.id.includes(id)) : null;
    if (!item || !item.html) {
      return res.status(404).send('<div style="font-family:Arial;padding:40px;text-align:center;color:#64748b;"><h2>📬 Email preview not found or expired</h2><p>Please send a new test email to generate a live preview.</p></div>');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(item.html);
  } catch (err) {
    return res.status(500).send(`<h2>Error rendering preview: ${err.message}</h2>`);
  }
});

router.get('/api/dsar/preview-email/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await emailNotificationService.getEmailDispatchHistory();
    const item = Array.isArray(history) ? history.find(h => h.id === id || h.id.includes(id) || h.requestId === id) : null;
    if (!item || !item.html) {
      return res.status(404).send('<div style="font-family:Arial;padding:40px;text-align:center;color:#64748b;"><h2>📬 Email preview not found or expired</h2><p>Please send a new test email to generate a live preview.</p></div>');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(item.html);
  } catch (err) {
    return res.status(500).send(`<h2>Error rendering preview: ${err.message}</h2>`);
  }
});

router.get('/dsar/preview-email/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const history = await emailNotificationService.getEmailDispatchHistory();
    const item = Array.isArray(history) ? history.find(h => h.id === id || h.id.includes(id) || h.requestId === id) : null;
    if (!item || !item.html) {
      return res.status(404).send('<div style="font-family:Arial;padding:40px;text-align:center;color:#64748b;"><h2>📬 Email preview not found or expired</h2><p>Please send a new test email to generate a live preview.</p></div>');
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(item.html);
  } catch (err) {
    return res.status(500).send(`<h2>Error rendering preview: ${err.message}</h2>`);
  }
});

// POST /api/dsar/settings/reset — Reset settings to defaults
router.post('/dsar/settings/reset', async (req, res) => {
  try {
    const result = await dsarSettingsService.resetSettings();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/settings/reset (alternate route)
router.post('/api/dsar/settings/reset', async (req, res) => {
  try {
    const result = await dsarSettingsService.resetSettings();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/profile — Fetch current operator workstation profile
router.get('/dsar/profile', async (req, res) => {
  try {
    const result = await dsarSettingsService.getOperatorProfile();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/profile (alternate route)
router.get('/api/dsar/profile', async (req, res) => {
  try {
    const result = await dsarSettingsService.getOperatorProfile();
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/profile — Update operator workstation profile
router.patch('/dsar/profile', async (req, res) => {
  try {
    const result = await dsarSettingsService.updateOperatorProfile(req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// PATCH /api/dsar/profile (alternate route)
router.patch('/api/dsar/profile', async (req, res) => {
  try {
    const result = await dsarSettingsService.updateOperatorProfile(req.body || {});
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR STEP 2 IDENTITY DISCOVERY ROUTES ──────────────────────────────────

// POST /api/dsar/discovery/scan — Perform identity resolution & PII discovery scan
router.post('/dsar/discovery/scan', async (req, res) => {
  try {
    const { requestId } = req.body || {};
    const result = await dsarDiscoveryService.performIdentityDiscovery(requestId);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/discovery/:id — Fetch discovered Data Map for a tracking ID
router.get('/dsar/discovery/:id', async (req, res) => {
  try {
    const result = await dsarDiscoveryService.getDsarDiscoveryDataMap(req.params.id);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR STEP 3 IMPACT ANALYSIS & DEPENDENCY MAPPING ROUTES ────────────────

// POST /api/dsar/impact/analyze — Perform impact analysis & dependency risk scoring
router.post('/dsar/impact/analyze', async (req, res) => {
  try {
    const { requestId } = req.body || {};
    const result = await dsarImpactService.performImpactAnalysis(requestId);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/impact/:id — Fetch saved Impact Analysis Report for a tracking ID
router.get('/dsar/impact/:id', async (req, res) => {
  try {
    const result = await dsarImpactService.getDsarImpactReport(req.params.id);
    if (!result.success) {
      return jsonError(res, result.notFound ? 404 : 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/impact/:id/export — Download Official Certified PIA Audit Report
router.get('/dsar/impact/:id/export', async (req, res) => {
  try {
    const result = await dsarImpactService.exportDsarImpactReport(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${result.reportId || 'PIA-Audit-Report'}.json"`);
    return res.json(result.exportPayload);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR STEP 4 LEGAL COMPLIANCE POLICY & APPROVAL ROUTES ─────────────────

// POST /api/dsar/policy/evaluate — Perform multi-statute legal policy check
router.post('/dsar/policy/evaluate', async (req, res) => {
  try {
    const { requestId } = req.body || {};
    const result = await dsarPolicyService.evaluateLegalPolicy(requestId);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/policy/:id — Fetch saved Legal Policy Evaluation Report
router.get('/api/dsar/policy/:id', async (req, res) => {
  try {
    const result = await dsarPolicyService.getDsarPolicyReport(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// POST /api/dsar/policy/approve — DPO / Compliance Officer Digital Approval
router.post('/dsar/policy/approve', async (req, res) => {
  try {
    const { requestId, dpoNotes, approverName } = req.body || {};
    const result = await dsarPolicyService.approvePolicyCompliance(requestId, dpoNotes, approverName);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR STEP 5 EXECUTION & ANONYMIZATION ENGINE ROUTES ─────────────────────

// POST /api/dsar/execution/execute — Execute approved deletion/anonymization plan
router.post('/dsar/execution/execute', async (req, res) => {
  try {
    const { requestId } = req.body || {};
    const result = await dsarExecutionService.executeDsarPlan(requestId);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/execution/:id — Fetch saved Execution Report
router.get('/api/dsar/execution/:id', async (req, res) => {
  try {
    const result = await dsarExecutionService.getDsarExecutionReport(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /dsar/execution/:id — Alternate route
router.get('/dsar/execution/:id', async (req, res) => {
  try {
    const result = await dsarExecutionService.getDsarExecutionReport(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR STEP 6 POST-DELETION VERIFICATION & RESIDUAL PII RE-SCAN ROUTES ───

// POST /api/dsar/verification/verify — Run automated post-deletion verification re-scan
router.post('/dsar/verification/verify', async (req, res) => {
  try {
    const { requestId } = req.body || {};
    const result = await dsarVerificationService.verifyDsarExecution(requestId);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/verification/:id — Fetch saved Verification Report
router.get('/api/dsar/verification/:id', async (req, res) => {
  try {
    const result = await dsarVerificationService.getDsarVerificationReport(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /dsar/verification/:id — Alternate route
router.get('/dsar/verification/:id', async (req, res) => {
  try {
    const result = await dsarVerificationService.getDsarVerificationReport(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// ── DSAR STEP 7 DELETION CERTIFICATE & IMMUTABLE AUDIT PACKAGE ROUTES ───────

// POST /api/dsar/certificate/generate — Generate Official Deletion Certificate & Audit Trail
router.post('/dsar/certificate/generate', async (req, res) => {
  try {
    const { requestId } = req.body || {};
    const result = await dsarCertificateService.generateDsarCertificate(requestId);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/certificate/:id — Fetch Official Deletion Certificate
router.get('/api/dsar/certificate/:id', async (req, res) => {
  try {
    const result = await dsarCertificateService.getDsarCertificate(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /dsar/certificate/:id — Alternate route
router.get('/dsar/certificate/:id', async (req, res) => {
  try {
    const result = await dsarCertificateService.getDsarCertificate(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    return res.json(result);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /api/dsar/certificate/:id/export — Download Immutable Audit Package (.json)
router.get('/api/dsar/certificate/:id/export', async (req, res) => {
  try {
    const result = await dsarCertificateService.exportDsarAuditPackage(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename || 'SegmentoProtect-AuditPackage.json'}"`);
    return res.json(result.exportPayload);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

// GET /dsar/certificate/:id/export — Alternate export route
router.get('/dsar/certificate/:id/export', async (req, res) => {
  try {
    const result = await dsarCertificateService.exportDsarAuditPackage(req.params.id);
    if (!result.success) {
      return jsonError(res, 400, result.message);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename || 'SegmentoProtect-AuditPackage.json'}"`);
    return res.json(result.exportPayload);
  } catch (err) {
    return jsonError(res, 500, err.message);
  }
});

module.exports = router;



