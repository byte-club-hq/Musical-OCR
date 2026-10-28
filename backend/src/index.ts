import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createLogger } from './logger.ts';

const config = loadConfig();
const logger = createLogger();
const app = createApp({ config, logger });
const server = app.listen(config.port, config.host, () => {
  logger.info('server.listening', {
    url: `http://${config.host}:${config.port}`,
    concurrency: config.recognition.concurrency,
  });
});

server.on('error', (error) => {
  logger.error('server.error', { errorName: error.name });
  process.exitCode = 1;
});

function shutdown(signal: NodeJS.Signals) {
  logger.info('server.shutdown', { signal });

  server.close((error) => {
    if (error) {
      logger.error('server.shutdown_failed', { errorName: error.name });
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
