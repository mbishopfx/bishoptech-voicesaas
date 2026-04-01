import { createServer } from 'node:http';

const port = Number(process.env.PORT || 8080);

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
    });
    request.on('end', () => resolve(data));
    request.on('error', reject);
  });
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    return json(response, 200, {
      ok: true,
      service: 'vapi-voice-ops-worker',
      blastQueueReady: Boolean(process.env.VAPI_API_KEY),
      supabaseAdminReady: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      timestamp: new Date().toISOString(),
    });
  }

  if (request.method === 'POST' && url.pathname === '/jobs/blast-dispatch') {
    const rawBody = await readBody(request);
    const payload = rawBody ? JSON.parse(rawBody) : {};

    return json(response, 202, {
      accepted: true,
      queue: 'blast-dispatch',
      receivedAt: new Date().toISOString(),
      payload,
      note: 'Worker scaffold received the job. Implement queue persistence/dispatch next.',
    });
  }

  if (request.method === 'POST' && url.pathname === '/webhooks/vapi/call-events') {
    const rawBody = await readBody(request);
    const payload = rawBody ? JSON.parse(rawBody) : {};

    return json(response, 202, {
      accepted: true,
      eventType: payload?.type || payload?.event || 'unknown',
      receivedAt: new Date().toISOString(),
      note: 'Worker scaffold received the Vapi event. Implement normalization + Supabase writes next.',
    });
  }

  return json(response, 404, {
    error: 'not_found',
  });
});

server.listen(port, () => {
  console.log(`vapi-voice-ops-worker listening on port ${port}`);
});
