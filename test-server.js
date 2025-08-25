// test-server.js
const http = require('http' );

const port = process.env.PORT || 8080;

const server = http.createServer((req, res ) => {
  console.log(`Request received for: ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from the simple test server!\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Simple test server is listening on port ${port}`);
});
