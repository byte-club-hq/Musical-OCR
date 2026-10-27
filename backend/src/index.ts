import { app } from './app.ts';
import { resolvePort } from './port.ts';

const host = '0.0.0.0';
const port = resolvePort(process.env.PORT);
const server = app.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
});

server.on('error', (error) => {
  console.error(`Backend server error: ${error.message}`);
  process.exitCode = 1;
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}; closing backend server.`);

  server.close((error) => {
    if (error) {
      console.error(`Backend shutdown error: ${error.message}`);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
