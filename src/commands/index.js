'use strict';

const ping = require('./ping');
const play = require('./play');
const skip = require('./skip');
const stop = require('./stop');
const queue = require('./queue');

const commands = [ping, play, skip, stop, queue];

function registerCommands(client) {
  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }
}

module.exports = { commands, registerCommands };
