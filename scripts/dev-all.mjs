import { spawn } from 'node:child_process';
import net from 'node:net';

const isWindows = process.platform === 'win32';
const npmCliPath = process.env.npm_execpath || '';
const npmCommand = npmCliPath ? process.execPath : isWindows ? 'npm.cmd' : 'npm';
const appUrl = 'http://localhost:8080';
const gatewayHealthUrl = 'http://localhost:3001/health';
let isShuttingDown = false;
const children = [];

function log(message) {
  console.log(`[dev] ${message}`);
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function isGatewayHealthy() {
  try {
    const response = await fetch(gatewayHealthUrl);
    if (!response.ok) return false;
    const body = await response.json().catch(() => ({}));
    return body?.ok === true;
  } catch {
    return false;
  }
}

function spawnProcess(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: isWindows && !npmCliPath,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const prefix = (data) => {
    String(data)
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => process.stdout.write(`[${name}] ${line}\n`));
  };

  child.stdout.on('data', prefix);
  child.stderr.on('data', prefix);
  child.on('error', (error) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.error(`[dev] Falha ao iniciar ${name}: ${error.message}`);
    stopChildren();
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.error(`[dev] ${name} saiu inesperadamente com ${signal || code}. Encerrando o runtime Fortify.`);
    stopChildren();
    process.exit(code || 1);
  });

  children.push(child);
  return child;
}

function npmArgs(args) {
  return npmCliPath ? [npmCliPath, ...args] : args;
}

function stopChild(child) {
  if (child.killed || child.exitCode !== null) return;
  if (isWindows) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

function stopChildren() {
  for (const child of children) stopChild(child);
}

function handleSignal(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  log(`Recebido ${signal}. Encerrando frontend e gateway iniciados por este comando.`);
  stopChildren();
  setTimeout(() => process.exit(0), 350);
}

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);

const appPortInUse = await isPortOpen(8080);
if (appPortInUse) {
  console.error('[dev] Porta 8080 já está em uso. Feche o processo antigo ou reinicie o terminal.');
  process.exit(1);
}

const gatewayPortInUse = await isPortOpen(3001);
if (gatewayPortInUse) {
  const healthy = await isGatewayHealthy();
  if (!healthy) {
    console.error('[dev] Porta 3001 já está em uso, mas http://localhost:3001/health não respondeu corretamente.');
    console.error('[dev] Feche o processo antigo ou reinicie o terminal antes de rodar npm run dev.');
    process.exit(1);
  }
  log('Gateway já está rodando em http://localhost:3001/health. Reutilizando esse backend.');
} else {
  spawnProcess('gateway', npmCommand, npmArgs(['run', 'dev:gateway']));
}

spawnProcess('app', npmCommand, npmArgs(['run', 'dev:app']));

log(`Frontend: ${appUrl}`);
log(`Gateway: ${gatewayHealthUrl}`);
log('Use Ctrl+C para encerrar o runtime local do Fortify.');
