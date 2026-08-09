import http from 'node:http';
import { log } from './logger';

const PORT = Number(process.env.PORT || 3002);

export function startHealthServer(getStatus: () => Record<string, unknown>) {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'whatsapp-agent', ...getStatus() }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  server.listen(PORT, () => {
    log.info({ event: 'whatsapp_agent_health_server_listening', port: PORT });
  });

  return server;
}
