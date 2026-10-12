'use strict';

/**
 * 7-Stage Interactive Pipeline Stepper & Step Orchestration Controller
 * Provides seamless navigation, unhiding, and execution across Steps 1 to 7.
 */

export function getActivePipelineRequestId() {
  if (window.activePipelineRequestId) return window.activePipelineRequestId;

  // Try to inspect from any open step badge
  const tags = [
    document.getElementById('dsar-discovery-req-id'),
    document.getElementById('dsar-impact-req-id'),
    document.getElementById('dsar-policy-req-id'),
    document.getElementById('dsar-execution-req-id'),
    document.getElementById('dsar-verif-target-id')
  ];
  for (const t of tags) {
    if (t && t.textContent && t.textContent.includes('DSAR-')) {
      const match = t.textContent.match(/DSAR-\d{4}-\d+/);
      if (match) return match[0];
    }
  }

  // Try from queue table rows
  const firstRow = document.querySelector('#dsar-dashboard-table-body tr[data-request-id]');
  if (firstRow && firstRow.dataset.requestId) {
    return firstRow.dataset.requestId;
  }

  // Fallback to top demo request
  return 'DSAR-2026-000101';
}

export function updateStepperActiveStep(stepNumber) {
  const stepItems = document.querySelectorAll('.dsar-step-item');
  stepItems.forEach(item => {
    const s = parseInt(item.getAttribute('data-step') || '1', 10);
    if (s <= stepNumber) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
    if (s === stepNumber) {
      item.classList.add('current-step');
    } else {
      item.classList.remove('current-step');
    }
  });
}

export async function goToPipelineStep(stepNumber, explicitRequestId = null) {
  const reqId = explicitRequestId || getActivePipelineRequestId();
  window.activePipelineRequestId = reqId;
  window.activePipelineStep = stepNumber;

  // Unhide pipeline subview and close stacked views
  const dashInternal = document.getElementById('dsar-dashboard-internal-view');
  const pipelineSection = document.getElementById('dsar-subview-pipeline');
  const deepPipeline = document.getElementById('dsar-deep-pipeline-section');
  const detailView = document.getElementById('dsar-ticket-detail-view');
  const assignView = document.getElementById('dsar-task-assignment-view');
  const subtaskView = document.getElementById('dsar-subtask-detail-view');

  if (detailView) detailView.classList.add('hidden');
  if (assignView) assignView.classList.add('hidden');
  if (subtaskView) subtaskView.classList.add('hidden');
  if (dashInternal) dashInternal.classList.add('hidden');

  if (pipelineSection) {
    pipelineSection.classList.remove('hidden');
    pipelineSection.style.display = 'block';
  }
  if (deepPipeline) {
    deepPipeline.classList.remove('hidden');
    deepPipeline.style.display = 'block';
  }

  updateStepperActiveStep(stepNumber);

  switch (stepNumber) {
    case 1: {
      const card = document.getElementById('dsar-step1-intake-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        const txt = document.getElementById('intake-request-text');
        if (txt) setTimeout(() => txt.focus(), 300);
      }
      break;
    }
    case 2: {
      const card = document.getElementById('dsar-step2-discovery-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
      if (typeof window.runIdentityDiscoveryScan === 'function') {
        window.runIdentityDiscoveryScan(reqId);
      }
      break;
    }
    case 3: {
      const card = document.getElementById('dsar-step3-impact-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
      if (typeof window.runImpactAnalysisScan === 'function') {
        window.runImpactAnalysisScan(reqId);
      }
      break;
    }
    case 4: {
      const card = document.getElementById('dsar-step4-policy-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
      if (typeof window.runLegalPolicyEvaluation === 'function') {
        window.runLegalPolicyEvaluation(reqId);
      }
      break;
    }
    case 5: {
      const card = document.getElementById('dsar-step5-execution-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
      if (typeof window.runDsarExecution === 'function') {
        window.runDsarExecution(reqId);
      }
      break;
    }
    case 6: {
      const card = document.getElementById('dsar-step6-verification-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
      if (typeof window.runDsarVerification === 'function') {
        window.runDsarVerification(reqId);
      }
      break;
    }
    case 7: {
      const card = document.getElementById('dsar-step7-certificate-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
      if (typeof window.generateDsarCertificate === 'function') {
        window.generateDsarCertificate(reqId);
      }
      break;
    }
  }
}

/**
 * Auto-execute the complete 7-stage pipeline sequentially with live visual progress.
 */
export async function runEntirePipelineAuto(explicitRequestId = null) {
  const reqId = explicitRequestId || getActivePipelineRequestId();
  window.activePipelineRequestId = reqId;

  const btn = document.getElementById('btn-auto-run-pipeline');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  try {
    const toast = (msg, t = 'info') => {
      if (window.showToastMessage) window.showToastMessage(msg, t);
      else console.log(msg);
    };

    toast(`🚀 Starting Automated 7-Stage DSAR Privacy Pipeline for ${reqId}…`, 'info');

    // Step 2: Identity Discovery
    if (btn) btn.innerHTML = '<span>⚡ Running Step 2: Identity Discovery…</span>';
    await goToPipelineStep(2, reqId);
    await new Promise(r => setTimeout(r, 900));

    // Step 3: Impact Analysis
    if (btn) btn.innerHTML = '<span>⚡ Running Step 3: Impact Analysis…</span>';
    await goToPipelineStep(3, reqId);
    await new Promise(r => setTimeout(r, 900));

    // Step 4: Policy Check
    if (btn) btn.innerHTML = '<span>⚡ Running Step 4: Policy Check…</span>';
    await goToPipelineStep(4, reqId);
    await new Promise(r => setTimeout(r, 900));

    // Step 5: Deletion Execution
    if (btn) btn.innerHTML = '<span>⚡ Running Step 5: Deletion Execution…</span>';
    await goToPipelineStep(5, reqId);
    await new Promise(r => setTimeout(r, 1100));

    // Step 6: Verification
    if (btn) btn.innerHTML = '<span>⚡ Running Step 6: Post-Deletion Verification…</span>';
    await goToPipelineStep(6, reqId);
    await new Promise(r => setTimeout(r, 900));

    // Step 7: Certificate of Erasure
    if (btn) btn.innerHTML = '<span>⚡ Running Step 7: Minting Certificate…</span>';
    await goToPipelineStep(7, reqId);

    toast(`🎉 All 7 Stages Completed Successfully for ${reqId}! Official Certificate Issued.`, 'success');
  } catch (err) {
    console.error('[Pipeline Auto-Run Error]', err);
    if (window.showToastMessage) window.showToastMessage(`Pipeline execution error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.innerHTML = originalHtml;
    }
  }
}

export function initDsarStepper() {
  const stepItems = document.querySelectorAll('.dsar-step-item');
  stepItems.forEach(item => {
    item.style.cursor = 'pointer';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('title', `Navigate to Step ${item.dataset.step || '1'}`);

    item.addEventListener('click', (e) => {
      e.preventDefault();
      const stepNum = parseInt(item.getAttribute('data-step') || '1', 10);
      goToPipelineStep(stepNum);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const stepNum = parseInt(item.getAttribute('data-step') || '1', 10);
        goToPipelineStep(stepNum);
      }
    });
  });


  const autoRunBtn = document.getElementById('btn-auto-run-pipeline');
  if (autoRunBtn) {
    autoRunBtn.addEventListener('click', (e) => {
      e.preventDefault();
      runEntirePipelineAuto();
    });
  }

  // Global hooks
  window.runEntirePipelineAuto = runEntirePipelineAuto;
  window.updateStepperActiveStep = updateStepperActiveStep;
  window.goToPipelineStep = goToPipelineStep;
  window.getActivePipelineRequestId = getActivePipelineRequestId;
}
