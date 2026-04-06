'use strict';

const { REST, Routes } = require('discord.js');
const { loadConfig } = require('./config');
const { createLogger } = require('./logger');
const { commands } = require('./commands');

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel, config.nodeEnv);

  const body = commands.map((c) => c.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  const route = config.guildId
    ? Routes.applicationGuildCommands(config.discordClientId, config.guildId)
    : Routes.applicationCommands(config.discordClientId);

  logger.info({ count: body.length, scope: config.guildId ? 'guild' : 'global' }, 'deploying commands');
  await rest.put(route, { body });
  logger.info('commands deployed');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('deploy failed:', err.message);
  process.exit(1);
});
