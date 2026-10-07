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
  initTheme();

  // Initialize DSAR Modules
  initDsarIntake();
  initDsarDashboard();
  initDsarDiscovery();
  initDsarDetail();
  initDsarAssignment();
  initDsarImpact();
  initDsarPolicy();
  initDsarExecution();
  initDsarVerification();
  initDsarCertificate();
  initDsarTeamConfig();
  initDsarSettings();
  initDsarProfile();
  initConsentHub();

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
