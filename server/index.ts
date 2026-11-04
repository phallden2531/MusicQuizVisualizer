import { resolve } from 'node:path';
import { createApplication } from './app.js';
import { serveClient } from './client.js';
import { AzureStorage, LocalStorage } from './storage.js';
import { QuizService } from './service.js';

const production = process.env.NODE_ENV === 'production';
const storage = process.env.AZURE_STORAGE_ACCOUNT_URL
  ? new AzureStorage(
      process.env.AZURE_STORAGE_ACCOUNT_URL,
      process.env.AZURE_STORAGE_CONTAINER || 'quiz',
    )
  : new LocalStorage(resolve(process.env.DATA_DIR || '.data'));
if (production && !process.env.AZURE_STORAGE_ACCOUNT_URL)
  throw new Error('Configure AZURE_STORAGE_ACCOUNT_URL for production.');
const service = await QuizService.open(storage);
const runtime = await createApplication({
  service,
  production,
  hostPassword: process.env.HOST_PASSWORD || '',
  sessionSecret: process.env.SESSION_SECRET || '',
  publicOrigin: process.env.PUBLIC_ORIGIN,
});
if (production) serveClient(runtime.app, resolve('dist/client'));
else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: runtime.http } },
    appType: 'spa',
  });
  runtime.app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
runtime.http.listen(port, '0.0.0.0', () =>
  console.log(`Music Quiz ready at http://localhost:${port}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    runtime.close().finally(() => process.exit(0));
  });
