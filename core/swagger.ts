import swaggerJsdoc from 'swagger-jsdoc';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { appDomain, apiBaseUrl } from './config';

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
        url: '/honeypot/api',
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
  apis: ['./core/apis/*.ts', './core/controllers/*.ts', './core/endpoint.ts']
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (router: Router) => {
  router.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "ThreatIntel API Docs",
    swaggerOptions: {
      withCredentials: true
    }
  }));
  
  // Endpoint per scaricare il JSON raw dello spec (utile per tool esterni)
  router.get('/api/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
