// server.js (CommonJS)
const { createServer } = require('http');
const next = require('next');

const port = process.env.PORT || 3000; // cPanel may inject PORT
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`Next.js app running on port ${port}`);
  });
});
