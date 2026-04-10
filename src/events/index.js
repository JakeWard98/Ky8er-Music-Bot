'use strict';

const ready = require('./ready');
const interactionCreate = require('./interactionCreate');
const errorEvent = require('./error');

const events = [ready, interactionCreate, errorEvent];

function registerEvents(client, ctx) {
  for (const evt of events) {
    if (evt.once) {
      client.once(evt.name, (...args) => evt.execute(...args, ctx));
    } else {
      client.on(evt.name, (...args) => evt.execute(...args, ctx));
    }
  }

  client.on('shardError', (err) => ctx.logger.error({ err }, 'shard error'));
  client.on('warn', (msg) => ctx.logger.warn({ msg }, 'discord warn'));
}

module.exports = { registerEvents };
