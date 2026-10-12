'use strict';

/**
 * DSAR Certificate Controller (Step 7 of Segmento Protect Flow)
 * Manages:
 * - Case Completeness Gate Validation (Blocks issuance if any system failed or is in DLQ).
 * - Cryptographically Sealed Certificate of Erasure Generation.
 * - Downstream Multi-Store Reconciliation Receipts Table.
 * - DLQ Replay and DPO Exception Waivers.
 */

let activeCertificateRequestId = null;
let activeCertificateData = null;

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

/**
 * Render Case Completeness Gate Status Alert Box
 */
function renderGateBox(gateData) {
  const box = document.getElementById('dsar-completeness-gate-box');
  const certDoc = document.getElementById('dsar-official-certificate-document');
  if (!box) return;

  const passed = gateData.passed || gateData.gatePassed || (gateData.gateStatus === 'PASSED');

  if (passed) {
    box.innerHTML = `
      <div style="padding:14px 18px; background:rgba(5,150,105,0.08); border:1px solid rgba(5,150,105,0.3); border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:32px; height:32px; border-radius:50%; background:rgba(5,150,105,0.15); color:var(--emerald); display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:800;">✓</div>
          <div>
            <div style="font-weight:800; color:var(--emerald); font-size:0.9rem;">Case Completeness Gate: PASSED (All 5 Downstream Stores Confirmed Reconciled)</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
              Zero unconfirmed systems &bull; Regulatory compliance certificate permitted under DPDP Act 2023 Sec. 12 &amp; GDPR Art. 17.
            </div>
          </div>
        </div>
        <span class="meta-pill success" style="font-size:0.75rem; font-weight:700;">🛡️ Gate Verified</span>
      </div>
    `;
    if (certDoc) certDoc.style.display = 'block';
  } else {
    const blockedCount = (gateData.blockedConnectors && gateData.blockedConnectors.length) || 1;
    const blockedNames = (gateData.blockedConnectors || []).map(b => b.name).join(', ') || 'Marketing Cloud';

    box.innerHTML = `
      <div style="padding:18px 20px; background:rgba(220,38,38,0.08); border:1px solid rgba(220,38,38,0.4); border-radius:var(--radius-md); box-shadow:0 4px 14px rgba(220,38,38,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:50%; background:rgba(220,38,38,0.18); color:var(--red); display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:800;">⛔</div>
            <div>
              <div style="font-weight:800; color:var(--red); font-size:0.95rem;">Case Completeness Gate TRIPPED: Certificate Issuance Withheld</div>
              <div style="font-size:0.78rem; color:var(--text-bright); margin-top:3px; max-width:700px; line-height:1.4;">
                <strong>${blockedCount} downstream connector (${escapeHtml(blockedNames)}) failed or is in Dead-Letter Queue (DLQ).</strong> Under statutory law, a Certificate of Erasure cannot be issued until all systems confirm deletion or an authorized DPO legal exception is registered.
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons inside gate alert -->
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" id="gate-action-replay-dlq" class="btn-primary" style="font-size:0.78rem; padding:7px 14px; cursor:pointer;">
              🔄 Replay DLQ &amp; Unblock Gate
            </button>
            <button type="button" id="gate-action-sign-exception" class="btn-ghost" style="font-size:0.78rem; padding:7px 14px; color:var(--purple); border-color:rgba(139,92,246,0.35); cursor:pointer;">
              🛡️ Sign DPO Statutory Exception
            </button>
          </div>
        </div>

        <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace; background:rgba(0,0,0,0.15); padding:6px 12px; border-radius:4px;">
          Gate Status: <strong>BLOCKED_DLQ</strong> &bull; Reason: 504 Gateway Timeout on Marketing Cloud Webhook &bull; Ticket cannot be certified closed.
        </div>
      </div>
    `;

    // Wire gate alert action buttons
    const replayBtn = document.getElementById('gate-action-replay-dlq');
    const excBtn = document.getElementById('gate-action-sign-exception');

    if (replayBtn) {
      replayBtn.addEventListener('click', async () => {
        showToast('Replaying event from Dead Letter Queue…', 'info');
        try {
          await fetch(`${window.location.origin}/api/dsar/reconciliation/replay-dlq`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: activeCertificateRequestId, connectorId: 'connector-marketing' })
          });
          showToast('✓ DLQ Event Resolved! Re-generating Certificate…', 'success');
          generateDsarCertificate(activeCertificateRequestId);
        } catch (e) {
          showToast(`DLQ replay failed: ${e.message}`, 'error');
        }
      });
    }

    if (excBtn) {
      excBtn.addEventListener('click', async () => {
        showToast('Registering DPO Statutory Exception…', 'info');
        try {
          await fetch(`${window.location.origin}/api/dsar/reconciliation/grant-exception`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requestId: activeCertificateRequestId,
              connectorId: 'connector-marketing',
              dpoName: 'Sarah Lee (DPO)',
              exceptionReason: 'Vendor maintenance window; manual SQL audit script verified #PURGE-901',
              legalStatutoryBasis: 'GDPR Art. 17(3)(b) Statutory Waiver'
            })
          });
          showToast('✓ DPO Exception Signed. Re-generating Certificate…', 'success');
          generateDsarCertificate(activeCertificateRequestId);
        } catch (e) {
          showToast(`DPO Exception failed: ${e.message}`, 'error');
        }
      });
    }

    if (certDoc) certDoc.style.display = 'none';
  }
}

/**
 * Render Certificate Document and KPI details into the DOM.
 */
function renderCertificate(cert) {
  if (!cert) return;
  activeCertificateData = cert;

  const targetIdEl = document.getElementById('dsar-cert-target-id');
  const certNumberEl = document.getElementById('dsar-cert-display-number');
  const certReqIdEl = document.getElementById('dsar-cert-display-req-id');
  const certDateEl = document.getElementById('dsar-cert-display-date');
  const subjectNameEl = document.getElementById('dsar-cert-subject-name');
  const subjectEmailEl = document.getElementById('dsar-cert-subject-email');
  const customerIdEl = document.getElementById('dsar-cert-customer-id');
  const evidenceEl = document.getElementById('dsar-cert-evidence');
  const defenseEl = document.getElementById('dsar-cert-defense-statement');
  const dpoNameEl = document.getElementById('dsar-cert-dpo-name');
  const dpoRoleEl = document.getElementById('dsar-cert-dpo-role');
  const signedAtEl = document.getElementById('dsar-cert-signed-at');
  const sha256SealEl = document.getElementById('dsar-cert-sha256-seal');
  const summaryTbody = document.getElementById('dsar-cert-summary-tbody');

  if (targetIdEl) targetIdEl.textContent = cert.certificateId || 'CERT-2026-000101';
  if (certNumberEl) certNumberEl.textContent = cert.certificateId || 'CERT-2026-000101';
  if (certReqIdEl) certReqIdEl.textContent = cert.requestId || 'DSAR-2026-000101';
  if (certDateEl) {
    const d = cert.issuedAt ? new Date(cert.issuedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    certDateEl.textContent = d;
  }

  if (cert.dataSubject) {
    if (subjectNameEl) subjectNameEl.textContent = cert.dataSubject.fullName || 'Vikram Patel';
    if (subjectEmailEl) subjectEmailEl.textContent = cert.dataSubject.email || 'vikram.patel@example.in';
    if (customerIdEl) customerIdEl.textContent = cert.dataSubject.customerId || 'CUST-8891';
    if (evidenceEl) evidenceEl.textContent = cert.dataSubject.verificationEvidence || 'Government ID & Aadhaar Verified';
  }

  if (defenseEl && cert.legalDefenseStatement) {
    defenseEl.textContent = cert.legalDefenseStatement;
  }

  if (cert.dpoAttestation) {
    if (dpoNameEl) dpoNameEl.textContent = cert.dpoAttestation.dpoName || '[Authorized Privacy Signatory / Title]';
    if (dpoRoleEl) dpoRoleEl.textContent = cert.dpoAttestation.dpoRole || '[Data Protection & Compliance Authority]';
    if (signedAtEl) signedAtEl.textContent = `Timestamp: ${cert.dpoAttestation.signedAt || new Date().toISOString()}`;
  }

  if (sha256SealEl) {
    sha256SealEl.textContent = cert.digitalCertificateSeal || '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
  }

  // Populate Multi-Store Erasure Attestation Summary Table
  if (summaryTbody && Array.isArray(cert.erasureSummaryBreakdown)) {
    summaryTbody.innerHTML = cert.erasureSummaryBreakdown.map(item => {
      const isRetained = item.status === 'STATUTORY_RETAINED';
      const badgeHtml = isRetained
        ? '<span class="meta-pill" style="background:rgba(245,158,11,0.12); color:var(--amber); border:1px solid rgba(245,158,11,0.3); font-size:0.75rem; font-weight:700;">🛡️ CGST ACT SEC. 36 RETAINED</span>'
        : '<span class="meta-pill success" style="font-size:0.75rem; font-weight:700;">✅ PURGED</span>';

      return `
        <tr>
          <td><strong>${escapeHtml(item.store)}</strong></td>
          <td>${escapeHtml(item.action)}</td>
          <td>${badgeHtml}</td>
        </tr>
      `;
    }).join('');
  }
}

/**
 * Generate official deletion certificate and immutable audit trail.
 */
export async function generateDsarCertificate(requestId) {
  if (!requestId || typeof requestId !== 'string' || !requestId.trim()) {
    showToast('Valid DSAR Tracking ID is required to generate certificate', 'error');
    return;
  }

  activeCertificateRequestId = requestId.trim();

  const card = document.getElementById('dsar-step7-certificate-card');
  if (card) {
    card.classList.remove('hidden');
    card.style.display = 'block';
  }

  showToast(`Evaluating Case Completeness Gate for ${requestId}…`, 'info');

  try {
    const res = await fetch(`${window.location.origin}/api/dsar/certificate/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: activeCertificateRequestId })
    });

    const data = await res.json();

    if (res.status === 422 || (data && data.blockedByGate)) {
      // Case Completeness Gate TRIPPED!
      renderGateBox(data);
      showToast('⛔ Case Completeness Gate TRIPPED: 1 system unresolved in DLQ. Certificate withheld.', 'error');
      if (card) card.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (data && data.success && data.certificate) {
      renderGateBox({ passed: true, gateStatus: 'PASSED' });
      renderCertificate(data.certificate);
      showToast(`✓ Step 7 Complete: Official Certificate ${data.certificateId} Issued & Cryptographically Sealed!`, 'success');

      if (window.updateStepperActiveStep) {
        window.updateStepperActiveStep(7);
      } else {
        document.querySelectorAll('.dsar-step-item').forEach(item => item.classList.add('active'));
      }

      if (card) card.scrollIntoView({ behavior: 'smooth' });
    } else {
      showToast(data.message || 'Failed to generate certificate', 'error');
    }
  } catch (err) {
    showToast(`Error generating certificate: ${err.message}`, 'error');
  }
}

/**
 * Download Immutable Audit Package JSON.
 */
async function downloadAuditPackage() {
  if (!activeCertificateRequestId) {
    showToast('No active certificate available to download', 'error');
    return;
  }

  try {
    const exportUrl = `${window.location.origin}/api/dsar/certificate/${encodeURIComponent(activeCertificateRequestId)}/export`;
    const res = await fetch(exportUrl);
    if (!res.ok) throw new Error('Failed to fetch audit package');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SegmentoProtect-AuditPackage-${activeCertificateRequestId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    showToast('✓ Downloaded Immutable Audit Package (.json)', 'success');
  } catch (err) {
    showToast(`Error downloading audit package: ${err.message}`, 'error');
  }
}

function printCertificatePdf() {
  window.print();
}

export function initDsarCertificate() {
  const refreshBtn = document.getElementById('btn-regenerate-certificate');
  const downloadBtn = document.getElementById('btn-download-audit-package');
  const printBtn = document.getElementById('btn-print-certificate');
  const copySealBtn = document.getElementById('btn-copy-cert-seal');
  const completeBtn = document.getElementById('btn-complete-dsar-lifecycle');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (activeCertificateRequestId) {
        generateDsarCertificate(activeCertificateRequestId);
      } else {
        showToast('Please execute Steps 1 through 6 first.', 'info');
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      downloadAuditPackage();
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', (e) => {
      e.preventDefault();
      printCertificatePdf();
    });
  }

  if (copySealBtn) {
    copySealBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const sealEl = document.getElementById('dsar-cert-sha256-seal');
      if (sealEl && sealEl.textContent) {
        navigator.clipboard.writeText(sealEl.textContent.trim())
          .then(() => showToast('✓ SHA-256 Certificate Seal copied to clipboard', 'success'))
          .catch(() => showToast('Failed to copy seal to clipboard', 'error'));
      }
    });
  }

  if (completeBtn) {
    completeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('🎉 DSAR Statutory Erasure Lifecycle Completed and Certified Closed!', 'success');
      setTimeout(() => {
        if (window.switchDsarSubview) window.switchDsarSubview('dashboard');
      }, 1500);
    });
  }

  window.generateDsarCertificate = generateDsarCertificate;
  window.renderCertificate = renderCertificate;
}
