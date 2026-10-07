'use strict';

/**
 * Segmento DSAR Portal & Consent Hub — Standalone Microservice Entrypoint
 * Dedicated microservice orchestrating:
 * - GDPR Art. 17 & DPDP 2023 Data Erasure Lifecycles
 * - GDPR Art. 7(3) Granular Consent Management & Kafka Event Streaming
 * - Segmento OAuth 2.0 / OIDC API Gateway & RS256 JWT Authentication
 * - Multi-Department Task Delegation & Live SMTP Notifications
 */

const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config({
  path: require('path').join(__dirname, '.env')
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const deletionRoutes = require('./backend/routes/deletion.routes');
const consentRoutes = require('./backend/routes/consent.routes');
const dsarRoutes = require('./backend/routes/dsar.routes');
const { setupGateway } = require('./backend/gateway');
require('./backend/services/kafka-consumers');

const app = express();
const { initializeSchema } = require('./backend/database/init-db');
const PORT = parseInt(process.env.PORT || '4000', 10);

/* =========================================================
   CORS & SECURITY HEADERS
========================================================= */

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Correlation-ID'],
    credentials: false
  })
);

app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

/* =========================================================
   HEALTH CHECK ROUTE (Render PaaS)
========================================================= */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'segmento-dsar-portal',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/* =========================================================
   SEGMENTO OAUTH 2.0 / OIDC API GATEWAY
========================================================= */

setupGateway(app);

/* =========================================================
   API ROUTES
========================================================= */

app.use('/api/v1/deletions', deletionRoutes);
app.use('/api/deletions', deletionRoutes);

app.use('/api/v1/consent', consentRoutes);
app.use('/api/consent', consentRoutes);

app.use('/api', dsarRoutes);
app.use('/', dsarRoutes);

/* =========================================================
   STATIC FRONTEND & DOCUMENTATION
========================================================= */

const FRONTEND_DIR = path.join(__dirname, 'frontend/public');
const DOCS_DIR = path.join(__dirname, 'docs');

app.use(
  express.static(FRONTEND_DIR, {
    index: 'index.html',
    etag: true
  })
);

if (fs.existsSync(DOCS_DIR)) {
  app.use('/docs', express.static(DOCS_DIR));
}

/* =========================================================
   SPA FALLBACK ROUTE
========================================================= */

app.get(/.*/, (req, res) => {
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  console.error('[DSAR Portal Error]', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

/* =========================================================
   START STANDALONE SERVER
========================================================= */

async function startServer() {
  try {
    await initializeSchema();
  } catch (err) {
    console.warn('[DB Init Fallback]', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Segmento DSAR Portal] Server running on port ${PORT}`);
    console.log(`[Segmento DSAR Portal] Mode: Standalone Governance Microservice`);
    console.log(`[Segmento DSAR Portal] Web UI: http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
