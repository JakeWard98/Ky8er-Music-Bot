'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getInfo } = require('../music/youtube');
const { enqueue } = require('../music/player');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a YouTube URL in your current voice channel.')
    .addStringOption((opt) =>
      opt.setName('url').setDescription('YouTube video URL').setRequired(true),
    ),
  async execute(interaction, { logger }) {
    const url = interaction.options.getString('url', true);
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: 'You must be in a voice channel to use /play.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    let info;
    try {
      info = await getInfo(url);
    } catch (err) {
      logger.warn({ err: err.message, userId: interaction.user.id }, 'play rejected');
      await interaction.editReply(`Cannot play this URL: ${err.message}`);
      return;
    }

    try {
      const position = await enqueue(
        voiceChannel,
        { ...info, requestedBy: interaction.user.id },
        logger,
      );
      await interaction.editReply(
        position > 1
          ? `Queued **${info.title}** (position ${position}).`
          : `Now playing **${info.title}**.`,
      );
    } catch (err) {
      logger.error({ err }, 'enqueue failed');
      await interaction.editReply('Failed to start playback.');
    }
  },
};
