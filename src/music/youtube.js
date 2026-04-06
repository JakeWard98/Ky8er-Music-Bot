'use strict';

const ytdl = require('@distube/ytdl-core');

const ALLOWED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be']);

function validateYouTubeUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Only https URLs are allowed.');
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error('Only YouTube URLs are allowed.');
  }
  return url.toString();
}

async function getInfo(url) {
  const safeUrl = validateYouTubeUrl(url);
  const info = await ytdl.getInfo(safeUrl);
  return {
    url: safeUrl,
    title: info.videoDetails.title,
    durationSec: Number(info.videoDetails.lengthSeconds) || 0,
    author: info.videoDetails.author?.name || 'unknown',
  };
}

function createStream(url) {
  const safeUrl = validateYouTubeUrl(url);
  return ytdl(safeUrl, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  });
}

module.exports = { validateYouTubeUrl, getInfo, createStream };
