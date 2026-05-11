/**
 * ThreatIntel - Distributed Forensics Engine
 * 
 * Copyright (C) 2026 Alessandro Modica. All rights reserved.
 * 
 * Licensed under the Business Source License 1.1 (BSL-1.1).
 * See root LICENSE.md for core engine licensing details.
 */
import swaggerJsdoc from 'swagger-jsdoc';
import { Router } from 'express';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { appDomain, apiBaseUrl, appBasePath } from './config';
import path from 'path';
import fs from 'fs';

const contactUrl = appDomain === 'localhost' ? 'http://localhost' : `https://${appDomain}`;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ThreatIntel Core API',
      version: '1.0.0',
      description: 'Documentazione delle API per il sistema di logging e analisi Threat Intelligence',
      contact: {
        name: 'Alessandro Modica',
        url: contactUrl
      }
    },
    servers: [
      {
        url: appBasePath + '/api',
        description: 'Server (Relative Path via Nginx)'
      },
      {
        url: apiBaseUrl,
        description: 'Server (Absolute Path from Config)'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Inserisci il token JWT ottenuto dal login'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    tags: [
      { name: 'Auth Proxy', description: 'Proxy verso l\'Identity Provider per login e registrazione' },
      { name: 'Dashboard API', description: 'Recupero statistiche e dati investigativi' },
      { name: 'Honeypot Traps', description: 'API esca per catturare e tracciare gli attaccanti' },
      { name: 'Dossier & Forensics', description: 'Generazione investigazioni e report forensi' },
      { name: 'System & Security', description: 'Gestione configurazioni, Rate Limit e Access Control' }
    ]
  },
  // Documentiamo le rotte, i controller e l'endpoint principale (per l'auth)
  apis: [
    path.join(process.cwd(), 'core/apis/*.ts'), 
    path.join(process.cwd(), 'core/controllers/*.ts'), 
    path.join(process.cwd(), 'core/endpoint.ts')
  ]
};

// Logica per caricare lo spec pre-generato in produzione (necessario per bundle ncc)
let swaggerSpecInternal: any;
const specPath = path.join(process.cwd(), 'public', 'swagger', 'swagger-spec.json');

if (fs.existsSync(specPath)) {
  try {
    swaggerSpecInternal = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    
    // Sovrascriviamo i server con quelli attuali della configurazione (Dinamici)
    swaggerSpecInternal.servers = [
      {
        url: (appBasePath === '/' ? '' : appBasePath) + '/api',
        description: 'Server (Relative Path via Nginx)'
      },
      {
        url: apiBaseUrl,
        description: 'Server (Absolute Path from Config)'
      }
    ];

    console.log('✅ Swagger spec caricato da file statico (Server aggiornati dinamicamente)');
  } catch (e) {
    console.warn('⚠️ Errore caricamento swagger-spec.json, generazione dinamica...');
    swaggerSpecInternal = swaggerJsdoc(options);
  }
} else {
  swaggerSpecInternal = swaggerJsdoc(options);
}

export const swaggerSpec = swaggerSpecInternal;

export const setupSwagger = (router: Router) => {
  let assetsPath: string;

  try {
    // In sviluppo, cerchiamo nel node_modules
    const { getAbsoluteFSPath } = require('swagger-ui-dist');
    assetsPath = getAbsoluteFSPath();
  } catch (e) {
    // In produzione (bundle ncc), usiamo la cartella copiata nella release
    assetsPath = path.join(process.cwd(), 'public', 'swagger');
  }

  // Verifica di sicurezza: se la cartella da node_modules non è accessibile, usa quella locale
  if (!assetsPath || !fs.existsSync(path.join(assetsPath, 'swagger-ui-bundle.js'))) {
    assetsPath = path.join(process.cwd(), 'public', 'swagger');
  }

  // 1. Serviamo i file statici di swagger (senza index.html per evitare conflitti)
  router.use('/api/api-docs', express.static(assetsPath, { index: false }));

  // 2. Generiamo l'HTML di base
  const swaggerHtml = swaggerUi.generateHTML(swaggerSpec, {
    customSiteTitle: "ThreatIntel API Docs",
    swaggerOptions: {
      withCredentials: true,
      validatorUrl: null
    },
    // Utilizziamo i file caricati staticamente
    customJs: [
      './swagger-ui-bundle.js',
      './swagger-ui-standalone-preset.js'
    ],
    customCssUrl: './swagger-ui.css'
  });

  // 3. Rotta principale per l'HTML
  router.get('/api/api-docs', (req, res) => {
    res.send(swaggerHtml);
  });

  // 4. Generiamo dinamicamente il file di inizializzazione per evitare MIME errors e 418
  router.get('/api/api-docs/swagger-ui-init.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
      window.onload = function() {
        const ui = SwaggerUIBundle({
          spec: ${JSON.stringify(swaggerSpec)},
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          validatorUrl: null,
          withCredentials: true
        });
        window.ui = ui;
      };
    `);
  });

  // Endpoint per scaricare il JSON raw dello spec (utile per tool esterni)
  router.get('/api/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
