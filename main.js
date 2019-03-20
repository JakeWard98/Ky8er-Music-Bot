const Discord = require('discord.js');
const client = new Discord.Client;
const ytdl  = require('ytdl-core');
const request = require('request');
const fs = require('fs');
const getYOuTubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');

var config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

const discord_token = config.discord_token;
const youtube_api_key = config.youtube_api_key;
const prefix = config.prefix;
const bot_controller = config.bot_controller;

client.on('ready', function(){
    console.log('Ready!');
});

client.login(discord_token);