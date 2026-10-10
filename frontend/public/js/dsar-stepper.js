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

  // Make sure internal dashboard view is visible and detail/assignment views are closed
  const dashInternal = document.getElementById('dsar-dashboard-internal-view');
  const dashSubview = document.getElementById('dsar-subview-dashboard');
  const detailView = document.getElementById('dsar-ticket-detail-view');
  const assignView = document.getElementById('dsar-task-assignment-view');
  const subtaskView = document.getElementById('dsar-subtask-detail-view');

  if (detailView) detailView.classList.add('hidden');
  if (assignView) assignView.classList.add('hidden');
  if (subtaskView) subtaskView.classList.add('hidden');
  if (dashInternal) dashInternal.classList.remove('hidden');
  if (dashSubview) dashSubview.classList.remove('hidden');

  updateStepperActiveStep(stepNumber);

  switch (stepNumber) {
    case 1: {
      const card = document.getElementById('dsar-step1-intake-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      }
      if (typeof window.runIdentityDiscoveryScan === 'function') {
        window.runIdentityDiscoveryScan(reqId);
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 3: {
      const card = document.getElementById('dsar-step3-impact-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
      }
      if (typeof window.runImpactAnalysisScan === 'function') {
        window.runImpactAnalysisScan(reqId);
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 4: {
      const card = document.getElementById('dsar-step4-policy-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
      }
      if (typeof window.runLegalPolicyEvaluation === 'function') {
        window.runLegalPolicyEvaluation(reqId);
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 5: {
      const card = document.getElementById('dsar-step5-execution-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
      }
      if (typeof window.runDsarExecution === 'function') {
        window.runDsarExecution(reqId);
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 6: {
      const card = document.getElementById('dsar-step6-verification-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
      }
      if (typeof window.runDsarVerification === 'function') {
        window.runDsarVerification(reqId);
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
    case 7: {
      const card = document.getElementById('dsar-step7-certificate-card');
      if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
      }
      if (typeof window.generateDsarCertificate === 'function') {
        window.generateDsarCertificate(reqId);
      }
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
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

  // Global hooks
  window.updateStepperActiveStep = updateStepperActiveStep;
  window.goToPipelineStep = goToPipelineStep;
  window.getActivePipelineRequestId = getActivePipelineRequestId;
}
