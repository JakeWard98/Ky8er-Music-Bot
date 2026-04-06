'use strict';

const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client, { logger }) {
    logger.info({ user: client.user.tag, guilds: client.guilds.cache.size }, 'discord ready');
  },
};
