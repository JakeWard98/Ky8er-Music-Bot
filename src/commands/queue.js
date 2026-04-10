'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../music/player');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the current queue.'),
  async execute(interaction) {
    const { current, upcoming } = getQueue(interaction.guildId);
    if (!current && upcoming.length === 0) {
      await interaction.reply('Queue is empty.');
      return;
    }
    const lines = upcoming
      .slice(0, 10)
      .map((t, i) => `${i + 1}. ${t.title}`)
      .join('\n');
    const embed = new EmbedBuilder()
      .setTitle('Queue')
      .setDescription(
        `**Now playing:** ${current ? current.title : 'nothing'}\n\n${lines || '_(no upcoming tracks)_'}`,
      )
      .setFooter({ text: `${upcoming.length} upcoming` });
    await interaction.reply({ embeds: [embed] });
  },
};
