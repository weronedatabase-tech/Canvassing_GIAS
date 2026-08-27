const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/redirect') {
    res.writeHead(302, { Location: '/target' });
    res.end();
  } else if (req.url === '/target') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ method: req.method }));
  }
});
server.listen(3001, async () => {
  const fetch = globalThis.fetch;
  const res = await fetch('http://localhost:3001/redirect', { method: 'POST', body: 'hello' });
  const data = await res.json();
  console.log('Redirect method:', data.method);
  server.close();
});
