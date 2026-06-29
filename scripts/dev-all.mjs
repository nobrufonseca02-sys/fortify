import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const processes = [
  {
    name: 'app',
    command: npmCommand,
    args: ['run', 'dev:app'],
  },
  {
    name: 'gateway',
    command: npmCommand,
    args: ['--prefix', 'services/metaapi-gateway', 'run', 'dev'],
  },
];

let isShuttingDown = false;

const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: isWindows,
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
  child.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[dev:all] ${name} exited with ${signal || code}. Stopping Fortify dev runtime.`);
    stopChildren();
    process.exit(code || 0);
  });

  return child;
});

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

function handleSignal(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[dev:all] Received ${signal}. Stopping Fortify dev runtime.`);
  stopChildren();
  setTimeout(() => process.exit(0), 250);
}

process.on('SIGINT', handleSignal);
process.on('SIGTERM', handleSignal);
