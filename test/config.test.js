'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function freshConfig() {
  delete require.cache[require.resolve('../src/config.js')];
  return require('../src/config.js');
}

test('loadConfig throws when DISCORD_TOKEN is missing', () => {
  delete process.env.DISCORD_TOKEN;
  delete process.env.DISCORD_CLIENT_ID;
  const { loadConfig } = freshConfig();
  assert.throws(() => loadConfig(), /Missing required environment variables/);
});

test('loadConfig returns frozen config when env vars are set', () => {
  process.env.DISCORD_TOKEN = 'test-token';
  process.env.DISCORD_CLIENT_ID = 'test-client';
  const { loadConfig } = freshConfig();
  const cfg = loadConfig();
  assert.equal(cfg.discordToken, 'test-token');
  assert.equal(cfg.discordClientId, 'test-client');
  assert.equal(Object.isFrozen(cfg), true);
});

test('youtube validateYouTubeUrl rejects non-YouTube hosts', () => {
  const { validateYouTubeUrl } = require('../src/music/youtube.js');
  assert.throws(() => validateYouTubeUrl('https://example.com/foo'), /YouTube/);
  assert.throws(() => validateYouTubeUrl('http://www.youtube.com/watch?v=abc'), /https/);
  assert.throws(() => validateYouTubeUrl('not a url'), /Invalid URL/);
});

test('youtube validateYouTubeUrl accepts youtube.com and youtu.be', () => {
  const { validateYouTubeUrl } = require('../src/music/youtube.js');
  assert.doesNotThrow(() => validateYouTubeUrl('https://www.youtube.com/watch?v=abc'));
  assert.doesNotThrow(() => validateYouTubeUrl('https://youtu.be/abc'));
});
