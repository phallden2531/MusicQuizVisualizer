import express, { type Express } from 'express';
import { join, sep } from 'node:path';

/**
 * Serves the built client. Vite fingerprints everything under assets/, so those
 * files may be cached forever; index.html must be revalidated on every visit or
 * a redeploy leaves browsers pointing at assets that no longer exist.
 */
export function serveClient(app: Express, directory: string) {
  app.use(
    express.static(directory, {
      index: false,
      setHeaders(res, path) {
        res.setHeader(
          'Cache-Control',
          path.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(directory, 'index.html'));
  });
}
