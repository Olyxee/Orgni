import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const apiDir = fileURLToPath(new URL('../artifacts/api-server/', import.meta.url));
// Keep local bot credentials in the ignored API .env file.
const apiEnvFile = fileURLToPath(new URL('../artifacts/api-server/.env', import.meta.url));
if (existsSync(apiEnvFile)) loadEnvFile(apiEnvFile);
const apiPort = process.env.API_PORT || '8080';
const children = new Set();
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}

function run(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit' });
  children.add(child);
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => {
    children.delete(child);
    if (!stopping) stop(code ?? 1);
  });
  return child;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

// Build with Node directly so the launcher works on Windows without shell
// exports or a globally installed pnpm executable.
const apiEnv = { ...process.env, NODE_ENV: 'development', PORT: apiPort };
const build = spawn(process.execPath, ['build.mjs'], {
  cwd: apiDir, env: apiEnv, stdio: 'inherit',
});
children.add(build);
const buildCode = await new Promise((resolve) => {
  build.on('error', (error) => { console.error(error.message); resolve(1); });
  build.on('exit', (code) => resolve(code ?? 1));
});
children.delete(build);
if (buildCode !== 0 || stopping) {
  stop(buildCode);
} else {
  run(['--enable-source-maps', 'dist/index.mjs'], apiDir, apiEnv);
  run([
    'artifacts/orgni/node_modules/vite/bin/vite.js',
    '--config', 'artifacts/orgni/vite.config.ts', '--host', '0.0.0.0',
  ], root, {
    ...process.env, NODE_ENV: 'development', PORT: process.env.WEB_PORT || '5173',
    ORGNI_API_PROXY: `http://127.0.0.1:${apiPort}`,
  });
}
