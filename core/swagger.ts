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
import { AppConfigProvider } from './services/AppConfigProvider';
import path from 'path';
import fs from 'fs';

/**
 * Funzione per generare lo spec in modo dinamico
 */
const getSwaggerSpec = (config: AppConfigProvider) => {
  const contactUrl = config.appDomain === 'localhost' ? 'http://localhost' : `https://${config.appDomain}`;
  const appBasePath = config.appBasePath;
  const apiBaseUrl = config.apiBaseUrl;

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
          url: (appBasePath === '/' ? '' : appBasePath) + '/api',
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
    apis: [
      path.join(process.cwd(), 'core/apis/*.ts'), 
      path.join(process.cwd(), 'core/controllers/*.ts'), 
      path.join(process.cwd(), 'core/endpoint.ts')
    ]
  };

  let spec: any;
  const specPath = path.join(process.cwd(), 'public', 'swagger', 'swagger-spec.json');

  if (fs.existsSync(specPath)) {
    try {
      spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      spec.servers = [
        {
          url: (appBasePath === '/' ? '' : appBasePath) + '/api',
          description: 'Server (Relative Path via Nginx)'
        },
        {
          url: apiBaseUrl,
          description: 'Server (Absolute Path from Config)'
        }
      ];
    } catch (e) {
      spec = swaggerJsdoc(options);
    }
  } else {
    spec = swaggerJsdoc(options);
  }

  return spec;
};

export const setupSwagger = (router: Router, config: AppConfigProvider) => {
  const swaggerSpec = getSwaggerSpec(config);
  let assetsPath: string;

  try {
    const { getAbsoluteFSPath } = require('swagger-ui-dist');
    assetsPath = getAbsoluteFSPath();
  } catch (e) {
    assetsPath = path.join(process.cwd(), 'public', 'swagger');
  }

  if (!assetsPath || !fs.existsSync(path.join(assetsPath, 'swagger-ui-bundle.js'))) {
    assetsPath = path.join(process.cwd(), 'public', 'swagger');
  }

  router.use('/api/api-docs', express.static(assetsPath, { index: false }));

  const swaggerHtml = swaggerUi.generateHTML(swaggerSpec, {
    customSiteTitle: "ThreatIntel API Docs",
    swaggerOptions: {
      withCredentials: true,
      validatorUrl: null
    },
    customJs: [
      './api-docs/swagger-ui-bundle.js',
      './api-docs/swagger-ui-standalone-preset.js',
      './api-docs/swagger-ui-init.js'
    ],
    customCssUrl: './api-docs/swagger-ui.css'
  });

  router.get('/api/api-docs', (req, res) => {
    res.send(swaggerHtml);
  });

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

  router.get('/api/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
