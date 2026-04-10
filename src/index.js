'use strict';

const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { createClient } = require('./client');
const { registerCommands } = require('./commands');
const { registerEvents } = require('./events');
const { destroyAll } = require('./music/player');

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, config.nodeEnv);

  const client = createClient();
  registerCommands(client);
  registerEvents(client, { logger });

  process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => logger.error({ err }, 'uncaughtException'));

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    try {
      destroyAll();
      await client.destroy();
    } catch (err) {
      logger.error({ err }, 'shutdown error');
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await client.login(config.discordToken);
}

main().catch((err) => {
  // logger may not exist if config failed
  // eslint-disable-next-line no-console
  console.error('fatal startup error:', err.message);
  process.exit(1);
});
