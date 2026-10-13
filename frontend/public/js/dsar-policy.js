'use strict';

/**
 * DSAR Policy & Compliance Controller (Step 4 of Segmento Protect Flow)
 * Manages Multi-Jurisdiction Statutory Policy Evaluation (DPDP, RBI, GST 7-Yr Rule, GDPR),
 * Statutory Retention Matrix rendering, Legal Defense Rationale generation, and DPO Sign-Off.
 */

let activePolicyRequestId = null;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg, type = 'info') {
  if (window.showToastMessage) {
    window.showToastMessage(msg, type);
  } else {
    console.log(`[Toast ${type}] ${msg}`);
  }
}

function updateStepperActiveStep(stepNumber) {
  const stepItems = document.querySelectorAll('.dsar-step-item');
  stepItems.forEach(item => {
    const step = parseInt(item.getAttribute('data-step') || '1', 10);
    if (step <= stepNumber) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function renderPolicyMatrixTable(policyMatrix) {
  const tbody = document.getElementById('dsar-policy-table-body');
  if (!tbody) return;

  if (!policyMatrix || policyMatrix.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">
          No statutory policy matrix data available.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = policyMatrix.map(row => {
    const isLocked = row.statutoryLockActive;
    
    let lockBadge = isLocked
      ? `<span class="meta-pill" style="background:rgba(245,158,11,0.15); color:var(--amber); border:1px solid rgba(245,158,11,0.35); font-size:0.75rem; font-weight:700;">
           🔒 Active Lock (Until ${row.retentionExpiryYear})
         </span>`
      : `<span class="meta-pill" style="background:rgba(16,185,129,0.15); color:var(--emerald); border:1px solid rgba(16,185,129,0.35); font-size:0.75rem; font-weight:700;">
           🟢 No Lock (0 Yrs)
         </span>`;

    let actionStyle = isLocked
      ? 'color:var(--cyan); font-weight:600;'
      : 'color:var(--emerald); font-weight:600;';

    return `
      <tr>
        <td style="padding:12px 14px; font-weight:700; color:var(--text-bright); font-family:monospace;">
          ${escapeHtml(row.tableName)}
          <div style="font-size:0.7rem; color:var(--text-muted); font-weight:normal; font-family:sans-serif;">${row.recordCount} Record(s) Found</div>
        </td>
        <td style="padding:12px 14px; font-size:0.82rem; color:var(--text-muted);">${escapeHtml(row.dataCategory)}</td>
        <td style="padding:12px 14px;">${lockBadge}</td>
        <td style="padding:12px 14px; font-size:0.82rem; color:var(--text-bright); font-family:monospace;">${escapeHtml(row.statuteCitation)}</td>
        <td style="padding:12px 14px; font-size:0.82rem; ${actionStyle}">${escapeHtml(row.actionLabel || row.recommendedAction)}</td>
        <td style="padding:12px 14px; font-size:0.75rem; color:var(--text-muted); line-height:1.4;">${escapeHtml(row.legalRationale)}</td>
      </tr>
    `;
  }).join('');
}

export async function runLegalPolicyEvaluation(requestId) {
  if (!requestId) return;
  activePolicyRequestId = requestId;

  const card = document.getElementById('dsar-step4-policy-card');
  const reqIdEl = document.getElementById('dsar-policy-req-id');
  const statusEl = document.getElementById('dsar-policy-status');
  const riskScoreEl = document.getElementById('dsar-policy-risk-score');
  const statutesEl = document.getElementById('dsar-policy-statutes-count');
  const approvalModeEl = document.getElementById('dsar-policy-approval-status');
  const bannerDescEl = document.getElementById('dsar-policy-desc-banner');
  const sha256El = document.getElementById('dsar-policy-sha256');
  const tbody = document.getElementById('dsar-policy-table-body');
  const btnApprove = document.getElementById('btn-approve-policy');

  if (card) card.classList.remove('hidden');
  if (reqIdEl) reqIdEl.textContent = `Target: ${requestId}`;

  // Update stepper indicator to Step 4
  updateStepperActiveStep(4);

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:24px; color:var(--cyan); font-weight:600;">
          <div style="display:inline-flex; align-items:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            <span>Evaluating statutory laws (DPDP Act, RBI KYC, GST 7-Yr Rule, GDPR) for ${escapeHtml(requestId)}…</span>
          </div>
        </td>
      </tr>
    `;
  }

  showToast(`Evaluating Legal Compliance Policy for ${requestId}…`, 'info');

  try {
    const res = await fetch(`${window.location.origin}/api/dsar/policy/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });

    const data = await res.json();

    if (data && data.success && data.report) {
      const rep = data.report;

      if (statusEl) {
        statusEl.textContent = rep.overallStatus.replace(/_/g, ' ');
        if (rep.overallStatus === 'COMPLIANT_AUTO_APPROVED') {
          statusEl.style.color = 'var(--emerald)';
        } else {
          statusEl.style.color = 'var(--amber)';
        }
      }

      if (riskScoreEl) {
        riskScoreEl.textContent = `${rep.legalRiskScore} / 100`;
        riskScoreEl.style.color = rep.legalRiskScore === 0 ? 'var(--emerald)' : (rep.legalRiskScore < 50 ? 'var(--amber)' : 'var(--red)');
      }

      if (statutesEl) {
        statutesEl.textContent = `${rep.applicableStatutes?.length || rep.statutoryLocksCount || 3} Statutes`;
      }

      if (approvalModeEl) {
        if (rep.dpoSignOff?.status === 'DPO_APPROVED') {
          approvalModeEl.innerHTML = `<span style="color:var(--emerald);">✓ DPO APPROVED</span>`;
          if (btnApprove) {
            btnApprove.disabled = true;
            btnApprove.innerHTML = `<span>✓ DPO Sign-Off Completed</span>`;
            btnApprove.style.background = 'rgba(16,185,129,0.2)';
            btnApprove.style.borderColor = 'var(--emerald)';
          }
        } else if (rep.approvalMode === 'AUTOMATED_ZERO_TOUCH') {
          approvalModeEl.innerHTML = `<span style="color:var(--emerald);">AUTO-APPROVED</span>`;
          if (btnApprove) {
            btnApprove.disabled = true;
            btnApprove.innerHTML = `<span>✓ Zero-Touch Auto-Approved</span>`;
          }
        } else {
          approvalModeEl.innerHTML = `<span style="color:var(--amber);">DPO SIGN-OFF REQUIRED</span>`;
          if (btnApprove) {
            btnApprove.disabled = false;
            btnApprove.innerHTML = `<span>✍️ Approve & Sign-Off as DPO</span>`;
          }
        }
      }

      if (bannerDescEl) {
        bannerDescEl.textContent = rep.legalDefenseStatement || rep.actionSummary;
      }

      if (sha256El) {
        sha256El.textContent = rep.legalCertificateHash || 'f928e08d2731835b3c45781a7d60';
      }

      renderPolicyMatrixTable(rep.policyMatrix);
      showToast(`✓ Legal Policy Check Complete: ${rep.statutoryLocksCount} statutory lock(s) identified.`, 'success');

      // Auto-trigger Step 4 Pre-Execution Policy Dry-Run Simulation (P2)
      await runDryRunSimulation(requestId);

      if (card) card.scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast(data.message || 'Failed to complete legal policy check', 'error');
    }
  } catch (err) {
    showToast(`Error evaluating legal policy: ${err.message}`, 'error');
  }
}

/**
 * Render Side-by-Side Mutation Diff Table for Pre-Execution Dry-Run Engine (P2)
 */
export function renderDryRunDiffTable(plan) {
  const tbody = document.getElementById('dsar-dryrun-diff-tbody');
  if (!tbody) return;

  if (!plan || plan.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:18px; color:var(--text-muted);">
          No pre-execution simulation mutations available.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = plan.map(item => {
    let actionBadge = '';
    switch (item.action) {
      case 'HARD_PURGE':
        actionBadge = `<span class="meta-pill" style="background:rgba(239,68,68,0.15); color:var(--red); border:1px solid rgba(239,68,68,0.35); font-weight:700; font-size:0.72rem;">🗑️ HARD PURGE</span>`;
        break;
      case 'PSEUDONYMIZE':
        actionBadge = `<span class="meta-pill" style="background:rgba(6,182,212,0.15); color:var(--cyan); border:1px solid rgba(6,182,212,0.35); font-weight:700; font-size:0.72rem;">🎭 PSEUDONYMIZE</span>`;
        break;
      case 'STATUTORY_RETAIN':
        actionBadge = `<span class="meta-pill" style="background:rgba(245,158,11,0.15); color:var(--amber); border:1px solid rgba(245,158,11,0.35); font-weight:700; font-size:0.72rem;">🔒 STATUTORY RETAIN</span>`;
        break;
      case 'SUPPRESS':
        actionBadge = `<span class="meta-pill" style="background:rgba(59,130,246,0.15); color:var(--blue); border:1px solid rgba(59,130,246,0.35); font-weight:700; font-size:0.72rem;">🔇 SUPPRESS</span>`;
        break;
      default:
        actionBadge = `<span class="meta-pill primary" style="font-size:0.72rem;">${escapeHtml(item.action)}</span>`;
    }

    const beforeSnippet = item.before 
      ? `<pre style="margin:0; font-size:0.72rem; color:var(--text-bright); background:rgba(0,0,0,0.25); padding:6px 8px; border-radius:4px; max-height:80px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;">${escapeHtml(JSON.stringify(item.before, null, 1))}</pre>`
      : '<span style="color:var(--text-muted); font-size:0.75rem;">None</span>';

    const afterSnippet = item.after
      ? `<pre style="margin:0; font-size:0.72rem; color:${item.action === 'STATUTORY_RETAIN' ? 'var(--amber)' : 'var(--cyan)'}; background:rgba(0,0,0,0.25); padding:6px 8px; border-radius:4px; max-height:80px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;">${escapeHtml(JSON.stringify(item.after, null, 1))}</pre>`
      : `<span style="color:var(--red); font-weight:700; font-size:0.75rem; font-family:monospace;">[PERMANENTLY PURGED FROM DISK]</span>`;

    const conflictNote = item.legalHoldConflict 
      ? `<div style="margin-top:4px; color:var(--amber); font-weight:700; font-size:0.7rem;">⚠️ Exemption: Retain until ${item.retentionExpiry || '2033'}</div>`
      : `<div style="margin-top:4px; color:var(--emerald); font-size:0.7rem;">✓ Zero conflict (Safe to process)</div>`;

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.05); vertical-align:top;">
        <td style="padding:10px 12px;">
          <div style="font-weight:700; color:var(--text-bright); font-size:0.82rem;">${escapeHtml(item.system)}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;">${escapeHtml(item.target)}</div>
        </td>
        <td style="padding:10px 12px;">${actionBadge}</td>
        <td style="padding:10px 12px;">${beforeSnippet}</td>
        <td style="padding:10px 12px;">${afterSnippet}</td>
        <td style="padding:10px 12px; font-size:0.75rem;">
          <div style="color:var(--text-secondary); font-weight:600;">${escapeHtml(item.statutoryRule)}</div>
          ${conflictNote}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Execute Policy Dry-Run Simulation (POST /api/dsar/dryrun/simulate)
 */
export async function runDryRunSimulation(requestId) {
  if (!requestId) return;

  const kpiHardPurge = document.getElementById('dryrun-kpi-hard-purge');
  const kpiPseudonymize = document.getElementById('dryrun-kpi-pseudonymize');
  const kpiStatutoryRetain = document.getElementById('dryrun-kpi-statutory-retain');
  const kpiSuppress = document.getElementById('dryrun-kpi-suppress');
  const kpiDpoStatus = document.getElementById('dryrun-kpi-dpo-status');
  const shaEl = document.getElementById('dryrun-sha256');
  const btnDpoApprove = document.getElementById('btn-approve-dryrun-dpo');

  try {
    const res = await fetch(`${window.location.origin}/api/dsar/dryrun/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });

    const data = await res.json();
    if (data && data.success && data.summary) {
      if (kpiHardPurge) kpiHardPurge.textContent = `${data.summary.hardPurge} Records`;
      if (kpiPseudonymize) kpiPseudonymize.textContent = `${data.summary.pseudonymize} Orders`;
      if (kpiStatutoryRetain) kpiStatutoryRetain.textContent = `${data.summary.statutoryRetain} Invoices (2033)`;
      if (kpiSuppress) kpiSuppress.textContent = `${data.summary.suppress} Webhooks`;
      if (shaEl) shaEl.textContent = data.simulationDigest || 'b848cfbe2c24c2957e8412';

      if (kpiDpoStatus) {
        if (data.summary.dpoApprovalStatus === 'DPO_APPROVED_READY_FOR_EXECUTION') {
          kpiDpoStatus.innerHTML = `<span style="color:var(--emerald);">✓ DPO AUTHORIZED</span>`;
          if (btnDpoApprove) {
            btnDpoApprove.disabled = true;
            btnDpoApprove.innerHTML = `<span>✓ DPO Authorized</span>`;
            btnDpoApprove.style.background = 'rgba(16,185,129,0.2)';
            btnDpoApprove.style.borderColor = 'var(--emerald)';
          }
        } else {
          kpiDpoStatus.innerHTML = `<span style="color:var(--amber);">PENDING SIGN-OFF</span>`;
          if (btnDpoApprove) {
            btnDpoApprove.disabled = false;
            btnDpoApprove.innerHTML = `<span>⚖️ DPO Sign-Off</span>`;
          }
        }
      }

      renderDryRunDiffTable(data.dryRunPlan);
      showToast(`✓ Pre-Execution Dry-Run: 5 targets previewed (${data.summary.hardPurge} purge, ${data.summary.statutoryRetain} retained until 2033)`, 'info');
    }
  } catch (err) {
    console.error('[Dry-Run Simulation Error]', err);
    showToast(`Dry-run simulation failed: ${err.message}`, 'error');
  }
}

/**
 * DPO Sign-Off for Dry-Run Simulation Plan (POST /api/dsar/dryrun/approve)
 */
export async function approveDryRunDpo(requestId) {
  if (!requestId) return;

  try {
    const res = await fetch(`${window.location.origin}/api/dsar/dryrun/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        approverName: 'Chief Privacy Officer (DPO)',
        dpoNotes: 'Authorized pre-execution dry-run transformation diffs. Statutory CGST Sec. 36 retention rules and marketing suppression flags confirmed.'
      })
    });

    const data = await res.json();
    if (data && data.success) {
      showToast('✓ DPO Formal Sign-Off Granted for Dry-Run Plan', 'success');
      const kpiDpoStatus = document.getElementById('dryrun-kpi-dpo-status');
      const btnDpoApprove = document.getElementById('btn-approve-dryrun-dpo');

      if (kpiDpoStatus) {
        kpiDpoStatus.innerHTML = `<span style="color:var(--emerald);">✓ DPO AUTHORIZED</span>`;
      }
      if (btnDpoApprove) {
        btnDpoApprove.disabled = true;
        btnDpoApprove.innerHTML = `<span>✓ DPO Authorized</span>`;
        btnDpoApprove.style.background = 'rgba(16,185,129,0.2)';
        btnDpoApprove.style.borderColor = 'var(--emerald)';
      }
    } else {
      showToast(data.message || 'Failed to authorize dry-run plan', 'error');
    }
  } catch (err) {
    showToast(`Error signing off dry-run plan: ${err.message}`, 'error');
  }
}

export async function approveDpoSignOff(requestId) {
  if (!requestId) return;

  try {
    const res = await fetch(`${window.location.origin}/api/dsar/policy/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        dpoNotes: 'Statutory 7-year GST retention locks verified. Non-financial marketing records approved for permanent erasure.',
        approverName: 'Chief Privacy Officer (DPO)'
      })
    });

    const data = await res.json();
    if (data && data.success) {
      showToast(data.message, 'success');
      const approvalModeEl = document.getElementById('dsar-policy-approval-status');
      const btnApprove = document.getElementById('btn-approve-policy');

      if (approvalModeEl) {
        approvalModeEl.innerHTML = `<span style="color:var(--emerald);">✓ DPO APPROVED</span>`;
      }
      if (btnApprove) {
        btnApprove.disabled = true;
        btnApprove.innerHTML = `<span>✓ DPO Sign-Off Completed</span>`;
        btnApprove.style.background = 'rgba(16,185,129,0.2)';
        btnApprove.style.borderColor = 'var(--emerald)';
      }
    } else {
      showToast(data.message || 'Failed to record DPO approval', 'error');
    }
  } catch (err) {
    showToast(`Error recording DPO approval: ${err.message}`, 'error');
  }
}

export function initDsarPolicy() {
  const retriggerBtn = document.getElementById('btn-retrigger-policy');
  const btnApprove = document.getElementById('btn-approve-policy');
  const proceedStep5Btn = document.getElementById('btn-proceed-step5');

  if (retriggerBtn) {
    retriggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (activePolicyRequestId) {
        runLegalPolicyEvaluation(activePolicyRequestId);
      } else {
        showToast('Please run Step 3 Impact Analysis first.', 'info');
      }
    });
  }

  if (btnApprove) {
    btnApprove.addEventListener('click', (e) => {
      e.preventDefault();
      if (activePolicyRequestId) {
        approveDpoSignOff(activePolicyRequestId);
      } else {
        showToast('Please evaluate a DSAR request first.', 'info');
      }
    });
  }

  if (proceedStep5Btn) {
    proceedStep5Btn.addEventListener('click', (e) => {
      e.preventDefault();
      const reqIdTag = document.getElementById('dsar-policy-req-id');
      const reqId = reqIdTag ? reqIdTag.textContent.replace('Target: ', '').trim() : activePolicyRequestId;
      if (typeof window.goToPipelineStep === 'function') {
        window.goToPipelineStep(5, reqId);
      } else if (window.runDsarExecution && reqId) {
        window.runDsarExecution(reqId);
      } else {
        const execBtn = document.getElementById('btn-retrigger-execution');
        if (execBtn) execBtn.click();
      }
    });
  }

  // Dry-Run Simulation Buttons
  const btnRunDryRun = document.getElementById('btn-run-dryrun-sim');
  if (btnRunDryRun) {
    btnRunDryRun.addEventListener('click', (e) => {
      e.preventDefault();
      const targetReqId = activePolicyRequestId || (window.activePipelineRequestId || 'DSAR-2026-000101');
      runDryRunSimulation(targetReqId);
    });
  }

  const btnApproveDryRun = document.getElementById('btn-approve-dryrun-dpo');
  if (btnApproveDryRun) {
    btnApproveDryRun.addEventListener('click', (e) => {
      e.preventDefault();
      const targetReqId = activePolicyRequestId || (window.activePipelineRequestId || 'DSAR-2026-000101');
      approveDryRunDpo(targetReqId);
    });
  }

  // Expose global handlers for cross-module invocations
  window.runLegalPolicyEvaluation = runLegalPolicyEvaluation;
  window.runDryRunSimulation = runDryRunSimulation;
  window.approveDryRunDpo = approveDryRunDpo;
}
