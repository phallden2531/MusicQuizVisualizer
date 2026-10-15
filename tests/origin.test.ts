import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

it('rejects malformed and opaque WebSocket origins without crashing the server', async () => {
  const script = `
    import { createApplication } from './server/app.ts';
    import { QuizService } from './server/service.ts';
    const storage = { readState: async()=>null, writeState:async()=>{}, putAsset:async()=>{}, getAsset:async()=>null };
    const service = await QuizService.open(storage);
    const runtime = await createApplication({ service, hostPassword:'test-password', sessionSecret:'test-session-secret-longer-than-thirty-two-characters', production:false });
    await new Promise(resolve => runtime.http.listen(0,'127.0.0.1',resolve));
    const base = 'http://127.0.0.1:' + runtime.http.address().port;
    const statuses = [];
    for (const origin of ['null','invalid-origin']) {
      const response = await fetch(base + '/socket.io/?EIO=4&transport=polling',{headers:{Origin:origin}});
      statuses.push(response.status);
    }
    const health = await fetch(base + '/api/health');
    console.log(JSON.stringify({statuses,health:health.status}));
    await runtime.close();
  `;
  const { stdout } = await promisify(execFile)(process.execPath, [
    '--import',
    'tsx',
    '--input-type=module',
    '-e',
    script,
  ]);
  expect(JSON.parse(stdout.trim())).toEqual({ statuses: [403, 403], health: 200 });
});
