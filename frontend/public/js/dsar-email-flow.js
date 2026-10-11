'use strict';

/**
 * dsar-email-flow.js - DSAR Request Through Email Interactive Controller
 * Implements the 1:1 visual workflow for Inbound Email DSAR processing:
 * - 5-Step Process Indicator
 * - Inbound Email Client preview & simulated parser
 * - 6-Stage Segmento DSAR Processing vertical stepper
 * - Outbound Result Email Delivery & Compliance Certificate
 */

import { showToast } from './toast.js';

let isProcessing = false;

export function initDsarEmailFlow() {
  const triggerBtn = document.getElementById('btn-email-flow-process');
  const resetBtn = document.getElementById('btn-email-flow-reset');
  const quickAlexBtn = document.getElementById('btn-email-quick-alex');
  const quickPriyaBtn = document.getElementById('btn-email-quick-priya');

  if (triggerBtn) {
    triggerBtn.addEventListener('click', handleProcessEmailRequest);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetEmailFlowUI);
  }

  if (quickAlexBtn) {
    quickAlexBtn.addEventListener('click', () => {
      populateEmailPreset({
        name: 'Alex Carter',
        email: 'alex.carter@example.com',
        type: 'Access & Export',
        subject: 'Data Subject Access Request (GDPR Art. 15)',
        body: `Hi,\n\nI would like to make a data subject access request under the applicable privacy law. Please provide all personal data you hold about me, including information on:\n\n• My profile details\n• Purchase history\n• Communication records\n• Any third-party data you may have\n\nPlease let me know if you need any additional information from me.\n\nRegards,\nAlex Carter\nalex.carter@example.com`
      });
    });
  }

  if (quickPriyaBtn) {
    quickPriyaBtn.addEventListener('click', () => {
      populateEmailPreset({
        name: 'Priya Nair',
        email: 'priya.nair@example.in',
        type: 'Erasure & Deletion',
        subject: 'Right to Erasure Notice (DPDP Act 2023 Sec. 12)',
        body: `To the Data Protection Officer,\n\nI am exercising my statutory Right to Erasure under the Digital Personal Data Protection Act 2023. Kindly delete all my personal data, browsing telemetry, and communication records from your systems.\n\nThank you,\nPriya Nair\npriya.nair@example.in`
      });
    });
  }
}

function populateEmailPreset({ name, email, type, subject, body }) {
  const fromEl = document.getElementById('email-inbound-from');
  const subjEl = document.getElementById('email-inbound-subject');
  const bodyEl = document.getElementById('email-inbound-body');
  const typeEl = document.getElementById('email-inbound-type');

  if (fromEl) fromEl.value = `${name} <${email}>`;
  if (subjEl) subjEl.value = subject;
  if (bodyEl) bodyEl.value = body;
  if (typeEl) typeEl.value = type;

  showToast(`Loaded email template for ${name}`, 'info');
}

async function handleProcessEmailRequest() {
  if (isProcessing) return;

  const fromVal = document.getElementById('email-inbound-from')?.value || 'Alex Carter <alex.carter@example.com>';
  const bodyVal = document.getElementById('email-inbound-body')?.value || '';
  const typeVal = document.getElementById('email-inbound-type')?.value || 'Access & Deletion';

  // Parse sender name and email
  let senderEmail = 'alex.carter@example.com';
  let senderName = 'Alex Carter';

  const match = fromVal.match(/([^<]+)<([^>]+)>/);
  if (match) {
    senderName = match[1].trim();
    senderEmail = match[2].trim();
  } else if (fromVal.includes('@')) {
    senderEmail = fromVal.trim();
    senderName = senderEmail.split('@')[0];
  }

  isProcessing = true;
  setProcessingState(true);

  // Animate the 6 stages in Column 2 sequentially
  const stageBadges = [
    document.getElementById('email-proc-step-1'),
    document.getElementById('email-proc-step-2'),
    document.getElementById('email-proc-step-3'),
    document.getElementById('email-proc-step-4'),
    document.getElementById('email-proc-step-5'),
    document.getElementById('email-proc-step-6')
  ];

  try {
    // Stage 1: Ingest Email Request
    activateStageBadge(stageBadges[0], 'Parsing email & attachments...');
    await sleep(600);
    completeStageBadge(stageBadges[0], '✓ Email Ingested & Ticket Created');

    // Stage 2: Classify Request
    activateStageBadge(stageBadges[1], 'AI Classifying Intent & Jurisdiction...');
    await sleep(700);
    completeStageBadge(stageBadges[1], `✓ Classified (${typeVal})`);

    // Stage 3: Identity Verification
    activateStageBadge(stageBadges[2], 'Verifying ID document & fraud checks...');
    await sleep(650);
    completeStageBadge(stageBadges[2], '✓ Identity Verified (Score: 99.4%)');

    // Stage 4: Find Personal Data
    activateStageBadge(stageBadges[3], 'Scanning CRM, Orders, DBs, Analytics...');
    await sleep(750);
    completeStageBadge(stageBadges[3], '✓ 48 PII Records Discovered');

    // Stage 5: Task & Workflow Management
    activateStageBadge(stageBadges[4], 'Assigning teams & applying retention locks...');
    await sleep(700);
    completeStageBadge(stageBadges[4], '✓ 5 Connectors Synchronized (Kafka)');

    // Stage 6: Call backend API to finalize and dispatch email
    activateStageBadge(stageBadges[5], 'Executing actions & generating package...');

    const res = await fetch('/api/dsar/process-email-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: senderEmail,
        fullName: senderName,
        requestText: bodyVal,
        requestType: typeVal
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Processing failed');
    }

    completeStageBadge(stageBadges[5], '✓ Response Delivered & Closed');

    // Populate Column 3 (Result)
    populateResultCard({
      customerName: senderName,
      customerEmail: senderEmail,
      requestId: data.requestId,
      certificateId: data.certificateId,
      previewUrl: data.stages?.emailDispatch?.previewUrl || `/api/dsar/preview-email/${data.requestId}`
    });

    // Refresh global dashboard queue
    if (typeof window.refreshDsarDashboard === 'function') {
      window.refreshDsarDashboard();
    }

    showToast(`DSAR Email Request for ${senderName} completed & certificate dispatched!`, 'success');

  } catch (err) {
    console.error('[Email Flow Error]', err);
    showToast(`Error processing email: ${err.message}`, 'error');
  } finally {
    isProcessing = false;
    setProcessingState(false);
  }
}

function activateStageBadge(el, text) {
  if (!el) return;
  el.classList.remove('status-pending', 'status-completed');
  el.classList.add('status-active');
  const label = el.querySelector('.proc-status-text');
  if (label) label.textContent = text;
}

function completeStageBadge(el, text) {
  if (!el) return;
  el.classList.remove('status-pending', 'status-active');
  el.classList.add('status-completed');
  const label = el.querySelector('.proc-status-text');
  if (label) label.textContent = text;
}

function resetEmailFlowUI() {
  const stageBadges = [
    document.getElementById('email-proc-step-1'),
    document.getElementById('email-proc-step-2'),
    document.getElementById('email-proc-step-3'),
    document.getElementById('email-proc-step-4'),
    document.getElementById('email-proc-step-5'),
    document.getElementById('email-proc-step-6')
  ];

  const defaultTexts = [
    'Pending Intake',
    'Pending Classification',
    'Pending Verification',
    'Pending Discovery',
    'Pending Workflow',
    'Pending Response'
  ];

  stageBadges.forEach((badge, idx) => {
    if (!badge) return;
    badge.classList.remove('status-active', 'status-completed');
    badge.classList.add('status-pending');
    const label = badge.querySelector('.proc-status-text');
    if (label) label.textContent = defaultTexts[idx];
  });

  const resultContainer = document.getElementById('email-flow-result-content');
  const resultPlaceholder = document.getElementById('email-flow-result-placeholder');
  if (resultContainer) resultContainer.classList.add('hidden');
  if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');

  showToast('Email processing flow reset to initial ready state.', 'info');
}

function populateResultCard({ customerName, customerEmail, requestId, certificateId, previewUrl }) {
  const resultContainer = document.getElementById('email-flow-result-content');
  const resultPlaceholder = document.getElementById('email-flow-result-placeholder');
  
  if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
  if (resultContainer) resultContainer.classList.remove('hidden');

  const toEl = document.getElementById('email-outbound-to');
  const nameEl = document.getElementById('email-outbound-name');
  const reqIdEl = document.getElementById('email-result-req-id');
  const certIdEl = document.getElementById('email-result-cert-id');
  const webmailLink = document.getElementById('btn-email-result-webmail');
  const certLink = document.getElementById('btn-email-result-certificate');

  if (toEl) toEl.textContent = customerEmail;
  if (nameEl) nameEl.textContent = customerName;
  if (reqIdEl) reqIdEl.textContent = requestId;
  if (certIdEl) certIdEl.textContent = certificateId;

  if (webmailLink && previewUrl) {
    webmailLink.href = previewUrl;
    webmailLink.classList.remove('hidden');
  }

  if (certLink && requestId) {
    certLink.onclick = () => {
      if (typeof window.openDsarDetailView === 'function') {
        window.openDsarDetailView(requestId);
      } else if (typeof window.switchDsarSubview === 'function') {
        window.switchDsarSubview('queue');
      }
    };
  }
}

function setProcessingState(active) {
  const btn = document.getElementById('btn-email-flow-process');
  if (!btn) return;
  if (active) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="display:inline-block; width:14px; height:14px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin 0.8s linear infinite; margin-right:8px;"></span> <span>AI Processing Inbound Email...</span>`;
    btn.style.opacity = '0.85';
  } else {
    btn.disabled = false;
    btn.innerHTML = `<span>⚡ Ingest &amp; Process Email Request with AI</span>`;
    btn.style.opacity = '1';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
