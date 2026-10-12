'use strict';

/**
 * Standalone app.js for Segmento DSAR Portal & Consent Hub Microservice
 */

import { initDsarIntake } from './dsar-intake.js';
import { initDsarDashboard, switchDsarSubview } from './dsar-dashboard.js';
import { initDsarDiscovery } from './dsar-discovery.js';
import { initDsarDetail } from './dsar-detail.js';
import { initDsarAssignment } from './dsar-assignment.js';
import { initDsarImpact } from './dsar-impact.js';
import { initDsarPolicy } from './dsar-policy.js';
import { initDsarExecution } from './dsar-execution.js';
import { initDsarVerification } from './dsar-verification.js';
import { initDsarCertificate } from './dsar-certificate.js';
import { initDsarTeamConfig } from './dsar-team-config.js';
import { initDsarSettings } from './dsar-settings.js';
import { initDsarProfile } from './dsar-profile.js';
import { initDsarStepper } from './dsar-stepper.js';
import { initConsentHub } from './consent-hub.js';
import { initDsarEmailFlow } from './dsar-email-flow.js';
import { initTheme } from './theme.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme
  try { initTheme(); } catch (err) { console.warn('[Init Theme]', err); }

  // Initialize DSAR Modules with per-module error isolation
  const modules = [
    ['DsarStepper', initDsarStepper],
    ['DsarEmailFlow', initDsarEmailFlow],
    ['DsarIntake', initDsarIntake],
    ['DsarDashboard', initDsarDashboard],
    ['DsarDiscovery', initDsarDiscovery],
    ['DsarDetail', initDsarDetail],
    ['DsarAssignment', initDsarAssignment],
    ['DsarImpact', initDsarImpact],
    ['DsarPolicy', initDsarPolicy],
    ['DsarExecution', initDsarExecution],
    ['DsarVerification', initDsarVerification],
    ['DsarCertificate', initDsarCertificate],
    ['DsarTeamConfig', initDsarTeamConfig],
    ['DsarSettings', initDsarSettings],
    ['DsarProfile', initDsarProfile],
    ['ConsentHub', initConsentHub]
  ];

  modules.forEach(([name, initFn]) => {
    try {
      if (typeof initFn === 'function') initFn();
    } catch (err) {
      console.error(`[Init Error in ${name}]`, err);
    }
  });

  // Expose global subview switcher for navigation bar
  window.switchDsarSubview = switchDsarSubview;
  window.switchDsarSubView = switchDsarSubview;

  // Ensure default subview is active (Dashboard / Queue)
  const defaultSub = document.getElementById('dsar-subview-dashboard');
  if (defaultSub) {
    defaultSub.classList.remove('hidden');
  }

  
  // Universal Global Handler for Pipeline Navigation
  function handleOpenPipeline(e) {
    const target = e.target.closest('.btn-open-dsar-flow, #btn-detail-proceed-pipeline, #btn-detail-run-discovery, .btn-subtask-action, [data-tab="pipeline"], #nav-dsar-pipeline, [data-action="open-pipeline"]');
    if (target) {
      e.preventDefault();
      const reqId = target.dataset.id || target.getAttribute('data-id') || window.activePipelineRequestId || 'DSAR-2026-000101';
      window.activePipelineRequestId = reqId;

      // Close stacked detail & internal dashboard views
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

      // Highlight active nav links
      document.querySelectorAll('.app-header__nav .nav-link').forEach(link => link.classList.remove('active'));
      const navPipe = document.getElementById('nav-dsar-pipeline');
      if (navPipe) navPipe.classList.add('active');

      document.querySelectorAll('.dsar-sidebar-nav-item').forEach(item => {
        if (item.dataset.tab === 'pipeline') item.classList.add('active');
        else item.classList.remove('active');
      });

      // Jump to step (Step 2 Identity Discovery for existing requests)
      if (typeof window.goToPipelineStep === 'function') {
        window.goToPipelineStep(2, reqId);
      }

      setTimeout(() => {
        if (pipelineSection) {
          pipelineSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }

  document.addEventListener('click', handleOpenPipeline, true);
  window.openPipelineView = (reqId, step) => {
    if (typeof window.goToPipelineStep === 'function') {
      window.goToPipelineStep(step || 2, reqId || 'DSAR-2026-000101');
    }
  };

  console.log('[Segmento DSAR Portal] Microservice Web App Initialized.');
});
