'use strict';

const { Events, Collection, MessageFlags } = require('discord.js');

const DEFAULT_COOLDOWN_SECONDS = 3;

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction, { logger }) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn({ name: interaction.commandName }, 'unknown command');
      return;
    }

    // per-user, per-command cooldown
    const { cooldowns } = interaction.client;
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }
    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownMs = (command.cooldown ?? DEFAULT_COOLDOWN_SECONDS) * 1000;
    const last = timestamps.get(interaction.user.id);
    if (last && now < last + cooldownMs) {
      const remaining = ((last + cooldownMs - now) / 1000).toFixed(1);
      await interaction.reply({
        content: `Please wait ${remaining}s before reusing /${command.data.name}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs).unref?.();

    try {
      await command.execute(interaction, { logger });
    } catch (err) {
      logger.error({ err, name: command.data.name }, 'command execution failed');
      const payload = { content: 'Command failed.', flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
