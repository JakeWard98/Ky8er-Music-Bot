'use strict';

const { Events } = require('discord.js');

module.exports = {
  name: Events.Error,
  once: false,
  execute(err, { logger }) {
    logger.error({ err }, 'discord client error');
  },
};
