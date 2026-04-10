'use strict';

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with pong and latency.'),
  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging…', fetchReply: true });
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! RTT ${rtt}ms · WS ${interaction.client.ws.ping}ms`);
  },
};
