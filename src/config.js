'use strict';

require('dotenv').config();

const REQUIRED = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
const OPTIONAL = {
  GUILD_ID: '',
  LOG_LEVEL: 'info',
  NODE_ENV: 'production',
};

function loadConfig() {
  const missing = REQUIRED.filter((k) => !process.env[k] || process.env[k].trim() === '');
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Copy .env.example to .env and fill in the values.`,
    );
  }

  const config = {
    discordToken: process.env.DISCORD_TOKEN,
    discordClientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.GUILD_ID || OPTIONAL.GUILD_ID,
    logLevel: process.env.LOG_LEVEL || OPTIONAL.LOG_LEVEL,
    nodeEnv: process.env.NODE_ENV || OPTIONAL.NODE_ENV,
  };

  Object.freeze(config);
  return config;
}

module.exports = { loadConfig };
