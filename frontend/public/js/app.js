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
import { initConsentHub } from './consent-hub.js';
import { initTheme } from './theme.js';
import { showToast } from './toast.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme
  try { initTheme(); } catch (err) { console.warn('[Init Theme]', err); }

  // Initialize DSAR Modules with per-module error isolation
  const modules = [
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

  console.log('[Segmento DSAR Portal] Microservice Web App Initialized.');
});
