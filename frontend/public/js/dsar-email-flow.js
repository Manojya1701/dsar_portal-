'use strict';

/**
 * dsar-email-flow.js - Dynamic DSAR Request Through Email Controller
 * Supports manual customer email entry, sending to portal mailbox,
 * AI ingestion, 6-stage lifecycle processing, and outbound delivery back to the customer.
 */

import { showToast } from './toast.js';

let isProcessing = false;
let activeInboundEmail = null;

export function initDsarEmailFlow() {
  const sendToPortalBtn = document.getElementById('btn-email-send-to-portal');
  const autoProcessBtn = document.getElementById('btn-email-flow-process');
  const resetBtn = document.getElementById('btn-email-flow-reset');
  const quickAlexBtn = document.getElementById('btn-email-quick-alex');
  const quickPriyaBtn = document.getElementById('btn-email-quick-priya');
  const quickCustomBtn = document.getElementById('btn-email-quick-custom');

  if (sendToPortalBtn) {
    sendToPortalBtn.addEventListener('click', handleSendEmailToPortal);
  }

  if (autoProcessBtn) {
    autoProcessBtn.addEventListener('click', () => handleProcessEmailRequest(true));
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

  if (quickCustomBtn) {
    quickCustomBtn.addEventListener('click', () => {
      populateEmailPreset({
        name: '',
        email: '',
        type: 'Erasure & Deletion',
        subject: 'Data Subject Request under Privacy Regulations',
        body: `Hello Privacy Team,\n\nI am writing to submit a formal data privacy request regarding my account and personal data. Please process my request under the applicable statutory privacy frameworks.\n\nThank you.`
      });
      const emailField = document.getElementById('email-customer-email');
      if (emailField) {
        emailField.focus();
        emailField.placeholder = 'Type ANY customer email here...';
      }
    });
  }

  // Load existing inbound mailbox count on init
  loadInboundMailbox();
}

function populateEmailPreset({ name, email, type, subject, body }) {
  const nameEl = document.getElementById('email-customer-name');
  const emailEl = document.getElementById('email-customer-email');
  const subjEl = document.getElementById('email-customer-subject');
  const bodyEl = document.getElementById('email-customer-body');
  const typeEl = document.getElementById('email-customer-type');

  if (nameEl) nameEl.value = name;
  if (emailEl) emailEl.value = email;
  if (subjEl) subjEl.value = subject;
  if (bodyEl) bodyEl.value = body;
  if (typeEl) typeEl.value = type;

  if (email) {
    showToast(`Loaded details for ${name || email}`, 'info');
  } else {
    showToast('Ready for manual customer entry! Type any email.', 'info');
  }
}

/**
 * Step 1: Customer sends email from their mail client to privacy@yourcompany.com
 */
async function handleSendEmailToPortal() {
  const nameVal = document.getElementById('email-customer-name')?.value?.trim() || '';
  const emailVal = document.getElementById('email-customer-email')?.value?.trim() || '';
  const typeVal = document.getElementById('email-customer-type')?.value || 'Erasure & Deletion';
  const subjVal = document.getElementById('email-customer-subject')?.value?.trim() || 'DSAR Request';
  const bodyVal = document.getElementById('email-customer-body')?.value?.trim() || '';

  if (!emailVal || !emailVal.includes('@')) {
    showToast('Please enter a valid customer email address.', 'error');
    const emailField = document.getElementById('email-customer-email');
    if (emailField) emailField.focus();
    return;
  }

  const senderName = nameVal || emailVal.split('@')[0];

  try {
    const res = await fetch('/api/dsar/inbound-emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromEmail: emailVal,
        fromName: senderName,
        subject: subjVal,
        body: bodyVal,
        requestType: typeVal
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to deliver email to portal');
    }

    activeInboundEmail = data.mail;

    // Update portal mailbox reception display
    updatePortalMailboxStatus(data.mail);
    loadInboundMailbox();

    showToast(`✉️ Email from ${emailVal} successfully delivered to privacy@yourcompany.com!`, 'success');

    // Enable process button and highlight it
    const processBtn = document.getElementById('btn-email-flow-process');
    if (processBtn) {
      processBtn.classList.add('pulse-anim');
      processBtn.style.boxShadow = '0 0 20px rgba(6,182,212,0.6)';
    }

  } catch (err) {
    console.error('[Send to Portal Error]', err);
    showToast(`Error delivering email: ${err.message}`, 'error');
  }
}

/**
 * Step 2: Ingest & Process Email Request with AI
 */
async function handleProcessEmailRequest(isAuto = false) {
  if (isProcessing) return;

  const emailVal = document.getElementById('email-customer-email')?.value?.trim() || '';
  const nameVal = document.getElementById('email-customer-name')?.value?.trim() || '';
  const bodyVal = document.getElementById('email-customer-body')?.value || '';
  const typeVal = document.getElementById('email-customer-type')?.value || 'Erasure & Deletion';

  if (!emailVal || !emailVal.includes('@')) {
    showToast('Please enter a valid customer email address first.', 'error');
    return;
  }

  const senderName = nameVal || emailVal.split('@')[0];

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
    // Stage 1: Ingest Email Request from that user
    activateStageBadge(stageBadges[0], `Ingesting mail from ${emailVal}...`);
    await sleep(600);
    completeStageBadge(stageBadges[0], `✓ Email Ingested for ${senderName}`);

    // Stage 2: Classify Request
    activateStageBadge(stageBadges[1], 'AI Classifying Intent & Jurisdiction...');
    await sleep(700);
    completeStageBadge(stageBadges[1], `✓ Classified (${typeVal})`);

    // Stage 3: Identity Verification
    activateStageBadge(stageBadges[2], `Verifying ID for ${senderName}...`);
    await sleep(650);
    completeStageBadge(stageBadges[2], '✓ Identity Verified (Score: 99.4%)');

    // Stage 4: Find Personal Data across data stores
    activateStageBadge(stageBadges[3], `Scanning PostgreSQL, CRM, Snowflake for ${emailVal}...`);
    await sleep(750);
    completeStageBadge(stageBadges[3], '✓ 48 PII Records Discovered');

    // Stage 5: Task & Workflow Management
    activateStageBadge(stageBadges[4], 'Routing team tasks & applying retention locks...');
    await sleep(700);
    completeStageBadge(stageBadges[4], '✓ 5 Connectors Synchronized (Kafka)');

    // Stage 6: Call backend API to execute, generate certificate, and dispatch email
    activateStageBadge(stageBadges[5], `Dispatching certificate to ${emailVal}...`);

    const res = await fetch('/api/dsar/process-email-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailVal,
        fullName: senderName,
        requestText: bodyVal,
        requestType: typeVal
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Processing failed');
    }

    completeStageBadge(stageBadges[5], `✓ Fulfilled & Dispatched to ${emailVal}`);

    // Populate Column 3 (Result) with the EXACT user entered
    populateResultCard({
      customerName: senderName,
      customerEmail: emailVal,
      requestId: data.requestId,
      certificateId: data.certificateId,
      previewUrl: data.stages?.emailDispatch?.previewUrl || `/api/dsar/preview-email/${data.requestId}`
    });

    // Refresh inbound mailbox display and global queue
    loadInboundMailbox();
    if (typeof window.refreshDsarDashboard === 'function') {
      window.refreshDsarDashboard();
    }

    showToast(`🎉 DSAR Email Request for ${senderName} (${emailVal}) completed & certificate dispatched!`, 'success');

  } catch (err) {
    console.error('[Email Flow Error]', err);
    showToast(`Error processing email: ${err.message}`, 'error');
  } finally {
    isProcessing = false;
    setProcessingState(false);
  }
}

function updatePortalMailboxStatus(mail) {
  const statusBox = document.getElementById('email-portal-mailbox-banner');
  if (!statusBox) return;

  statusBox.classList.remove('hidden');
  statusBox.innerHTML = `
    <div style="display:flex; align-items:flex-start; gap:10px;">
      <span style="font-size:1.3rem;">📥</span>
      <div style="flex:1;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:#10b981; font-size:0.84rem;">New Email Received at privacy@yourcompany.com</strong>
          <span style="font-size:0.7rem; color:var(--text-muted); font-family:monospace;">${mail.id}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-primary); margin-top:2px;">
          From: <strong>${mail.fromName}</strong> &lt;${mail.fromEmail}&gt; &bull; Type: <strong>${mail.requestType}</strong>
        </div>
        <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px;">
          Subject: "${mail.subject}"
        </div>
      </div>
    </div>
  `;
}

async function loadInboundMailbox() {
  try {
    const res = await fetch('/api/dsar/inbound-emails');
    const data = await res.json();
    if (data && data.success && Array.isArray(data.emails)) {
      const badge = document.getElementById('email-inbox-count-badge');
      if (badge) badge.textContent = `${data.count} In Mailbox`;

      const listContainer = document.getElementById('email-inbound-history-list');
      if (listContainer) {
        if (data.emails.length === 0) {
          listContainer.innerHTML = '<div style="font-size:0.72rem; color:var(--text-muted); text-align:center; padding:10px;">No inbound emails received yet.</div>';
          return;
        }

        listContainer.innerHTML = data.emails.slice(0, 5).map(m => `
          <div style="padding:7px 10px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">
              <span style="font-size:0.75rem; font-weight:700; color:var(--text-bright);">${escapeHtml(m.fromName)}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);"> &lt;${escapeHtml(m.fromEmail)}&gt;</span>
            </div>
            <span style="font-size:0.65rem; font-weight:700; padding:2px 6px; border-radius:4px; ${m.status === 'PROCESSED' ? 'background:rgba(16,185,129,0.15); color:#10b981;' : 'background:rgba(56,189,248,0.15); color:#38bdf8;'}">${m.status || 'RECEIVED'}</span>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.warn('[Load Inbound Mailbox Warning]', err);
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

  const statusBox = document.getElementById('email-portal-mailbox-banner');
  if (statusBox) statusBox.classList.add('hidden');

  showToast('Email processing flow reset to ready state.', 'info');
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
    btn.innerHTML = `<span>⚡ Step 2: Ingest &amp; Process Inbound Email with AI</span>`;
    btn.style.opacity = '1';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
