'use strict';

const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { stop } = require('../music/player');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback, clear the queue, and disconnect.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    const member = interaction.member;
    const botVoice = interaction.guild?.members?.me?.voice?.channelId;
    if (!botVoice || member?.voice?.channelId !== botVoice) {
      await interaction.reply({
        content: 'You must be in the same voice channel as the bot.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const ok = stop(interaction.guildId);
    await interaction.reply(ok ? 'Stopped and disconnected.' : 'Not currently playing.');
  },
};
