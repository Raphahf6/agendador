import http from 'node:http';
import fs from 'node:fs';

import handler from '../api/v1/[...path].js';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile('.env.local');

const port = Number(process.env.API_PORT || process.env.PORT || 8787);
const host = process.env.API_HOST || '0.0.0.0';

const server = http.createServer(async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = error?.status || 500;
    res.end(JSON.stringify({ detail: error?.message || 'Erro interno' }));
  }
});

server.listen(port, host, () => {
  console.log(`Horalis API local ouvindo em http://${host}:${port}/api/v1`);
});
