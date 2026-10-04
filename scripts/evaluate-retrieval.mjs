import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const base = process.env.ORGNI_TEST_API || 'http://127.0.0.1:8080';
const runId = `Retrieval Evaluation ${Date.now()}`;
async function request(path, token, body) {
  const start = performance.now();
  const response = await fetch(`${base}/api${path}`, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(15000),
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return { status: response.status, ms: performance.now() - start, data };
}
async function login(org) {
  const response = await request('/auth/login', null, { email: 'retrieval-test@example.com', organization: org });
  if (response.status !== 200) throw new Error(`Login failed: ${response.status}`);
  return response.data.token;
}
const alpha = await login(`${runId} Alpha`);
const beta = await login(`${runId} Beta`);
const health = await request('/health');
const readiness = await request('/health/ready');
const unauthenticated = await request('/model/overview');
const tampered = await request('/model/overview', `${alpha}tampered`);
const model = await request('/model/overview', alpha);
const normal = await request('/product/ask', alpha, { text: 'What is Acme Ltd credit limit and who does it supply?' });
const repeated = [];
for (let i = 0; i < 20; i++) repeated.push(await request('/product/ask', alpha, { text: 'What is Acme Ltd credit limit?' }));
const before = await request('/product/state', alpha);
const concurrent = await Promise.all(Array.from({ length: 20 }, () => request('/product/ask', alpha, { text: 'What is Acme Ltd credit limit?' })));
const after = await request('/product/state', alpha);
const other = await request('/product/state', beta);
function stats(results) {
  const ms = results.map(r => r.ms).sort((a, b) => a - b);
  return { count: results.length, successful: results.filter(r => r.status === 200).length, medianMs: ms[Math.floor(ms.length / 2)], p95Ms: ms[Math.ceil(ms.length * .95) - 1], maxMs: ms.at(-1) };
}
const report = {
  date: new Date().toISOString(), base, syntheticOrganisationPrefix: runId,
  health, readiness, unauthenticated, tampered, model, normal,
  repeated: { ...stats(repeated), distinctContexts: new Set(repeated.map(r => JSON.stringify(r.data.action?.sourcesUsed))).size },
  concurrent: { ...stats(concurrent), activityBefore: before.data.activity?.length, activityAfter: after.data.activity?.length, recordedActions: after.data.activity?.filter(a => concurrent.some(r => r.data.action?.id === a.id)).length },
  tenantIsolation: { betaActivityCount: other.data.activity?.length, durable: after.data.durable },
};
// Session tokens are deliberately omitted from the saved evidence.
await writeFile(new URL('../artifacts/retrieval-live-results.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
