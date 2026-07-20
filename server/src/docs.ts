import { createRequire } from 'module';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { swaggerUI } from '@hono/swagger-ui';
import type { OpenAPIHono } from '@hono/zod-openapi';

/**
 * Self-hosted OpenAPI docs (spec JSON + Swagger UI).
 *
 * Code Insights is local-first — "no data leaves the machine" is a hard project
 * rule (see CLAUDE.md). @hono/swagger-ui's default SwaggerUI() middleware loads
 * its JS/CSS bundle from a CDN (unpkg/jsdelivr), which would make /api/docs
 * depend on network access and leak the fact that this tool is running to a
 * third party. Instead we vendor swagger-ui-dist as a real dependency and serve
 * its two runtime assets (swagger-ui.css, swagger-ui-bundle.js) ourselves.
 *
 * We reuse @hono/swagger-ui's own `baseUrl` option rather than
 * `manuallySwaggerUIHtml`: passing baseUrl = '/api/docs/assets' makes it request
 * '/api/docs/assets/swagger-ui-dist/swagger-ui.css' and
 * '/api/docs/assets/swagger-ui-dist/swagger-ui-bundle.js', which is exactly the
 * path shape our own static handler below serves — zero CDN references appear
 * anywhere in the rendered page.
 */

const require = createRequire(import.meta.url);
const swaggerUiDistDir = dirname(require.resolve('swagger-ui-dist/package.json'));

// Allowlist: only the files Swagger UI actually needs at runtime. Prevents
// path traversal through the :file param and keeps the surface area small.
const ASSET_CONTENT_TYPES: Record<string, string> = {
  'swagger-ui.css': 'text/css; charset=utf-8',
  'swagger-ui-bundle.js': 'application/javascript; charset=utf-8',
};

export function registerDocs(app: OpenAPIHono): void {
  // OpenAPI spec — generated from the createRoute() definitions registered
  // across every mounted router via app.openapi(...).
  app.doc('/api/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'Code Insights API',
      version: '0.1.0',
    },
  });

  // Self-hosted Swagger UI static assets.
  app.get('/api/docs/assets/swagger-ui-dist/:file', (c) => {
    const file = c.req.param('file');
    const contentType = ASSET_CONTENT_TYPES[file];
    if (!contentType) return c.notFound();
    const data = readFileSync(join(swaggerUiDistDir, file));
    return c.body(data, 200, { 'Content-Type': contentType });
  });

  // Swagger UI page itself, pointed at the local spec + local assets above.
  app.get(
    '/api/docs',
    swaggerUI({
      url: '/api/openapi.json',
      baseUrl: '/api/docs/assets',
      title: 'Code Insights API Docs',
    }),
  );
}
