// server/index.js - Node.js Server Entrypoint
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { initDatabase } from './db.js';
import { seedDemoData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const publicDir = path.resolve(root, 'public');

async function main() {
  console.log('[Server] Initializing database...');
  const db = await initDatabase();
  seedDemoData(db);

  const app = createApp();

  // Static File Serving with SPA fallback
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
  };

  app.get('*', async (c) => {
    const reqPath = c.req.path;
    // Do not intercept /api/
    if (reqPath.startsWith('/api/')) {
      return c.json({ error: 'Endpoint not found', code: 'NOT_FOUND' }, 404);
    }

    if (!fs.existsSync(publicDir)) {
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head><title>CoachingOS API</title></head>
          <body style="font-family:sans-serif;padding:40px;background:#09090b;color:#f4f4f5;">
            <h1>CoachingOS API Server Running</h1>
            <p>Static frontend has not been compiled yet. Run <code>npm run build</code> to compile the React SPA.</p>
            <p>API Health: <a style="color:#38bdf8;" href="/api/v1/health">/api/v1/health</a></p>
          </body>
        </html>
      `);
    }

    // Attempt direct file serve
    const sanitizedPath = reqPath === '/' ? '/index.html' : reqPath;
    const filePath = path.resolve(publicDir, '.' + sanitizedPath);

    if (filePath.startsWith(publicDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      return c.body(content, 200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      });
    }

    // SPA fallback: return index.html for client-side routing
    const indexPath = path.resolve(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf8');
      return c.html(html, 200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
    }

    return c.text('Page not found', 404);
  });

  const port = Number(process.env.PORT) || 3000;
  console.log(`[Server] CoachingOS listening on http://0.0.0.0:${port}`);

  serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  });
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
