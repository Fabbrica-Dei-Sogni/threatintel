import fs from 'fs';
import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

// IMPORTANTE: Definiamo qui le opzioni per la generazione a freddo
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ThreatIntel Core API',
      version: '1.0.0',
      description: 'Documentazione delle API generata staticamente per la release',
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    tags: [
      { name: 'Auth Proxy', description: 'Proxy verso l\'Identity Provider per login e registrazione' },
      { name: 'Dashboard API', description: 'Recupero statistiche e dati investigativi' },
      { name: 'Honeypot Traps', description: 'API esca per catturare e tracciare gli attaccanti' },
      { name: 'Dossier & Forensics', description: 'Generazione investigazioni e report forensi' },
      { name: 'System & Security', description: 'Gestione configurazioni, Rate Limit e Access Control' }
    ]
  },
  // Usiamo path assoluti basati sulla posizione di questo script
  apis: [
    path.join(__dirname, '../core/apis/*.ts'),
    path.join(__dirname, '../core/controllers/*.ts'),
    path.join(__dirname, '../core/endpoint.ts')
  ]
};

console.log('🔍 Scansione file per documentazione Swagger...');
const swaggerSpec = swaggerJsdoc(options) as any;

const outputDir = path.join(process.cwd(), 'public', 'swagger');
const outputFile = path.join(outputDir, 'swagger-spec.json');

// Assicura che la cartella esista
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Scrive il file JSON
fs.writeFileSync(outputFile, JSON.stringify(swaggerSpec, null, 2));

console.log(`✅ Swagger spec generato con successo in: ${outputFile}`);
console.log(`📊 Trovati ${Object.keys(swaggerSpec.paths || {}).length} endpoint.`);
