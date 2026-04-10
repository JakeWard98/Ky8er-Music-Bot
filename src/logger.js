'use strict';

const pino = require('pino');

function createLogger(level = 'info', nodeEnv = 'production') {
  const isDev = nodeEnv !== 'production';
  return pino({
    level,
    redact: {
      paths: ['discordToken', 'token', '*.token', 'headers.authorization'],
      censor: '[REDACTED]',
    },
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
          },
        }
      : {}),
  });
}

module.exports = { createLogger };
