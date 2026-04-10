'use strict';

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  NoSubscriberBehavior,
} = require('@discordjs/voice');

const { createStream } = require('./youtube');

const guilds = new Map();

function getGuildState(guildId) {
  let state = guilds.get(guildId);
  if (!state) {
    state = { queue: [], player: null, connection: null, current: null };
    guilds.set(guildId, state);
  }
  return state;
}

async function ensureConnection(voiceChannel, logger) {
  const guildId = voiceChannel.guild.id;
  const state = getGuildState(guildId);

  if (!state.connection) {
    state.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    state.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(state.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(state.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        logger.warn({ guildId }, 'voice disconnected, destroying connection');
        destroyGuild(guildId);
      }
    });
  }

  if (!state.player) {
    state.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    state.connection.subscribe(state.player);

    state.player.on(AudioPlayerStatus.Idle, () => {
      playNext(guildId, logger).catch((err) =>
        logger.error({ err, guildId }, 'failed to advance queue'),
      );
    });

    state.player.on('error', (err) => {
      logger.error({ err, guildId }, 'audio player error');
      playNext(guildId, logger).catch(() => {});
    });
  }

  await entersState(state.connection, VoiceConnectionStatus.Ready, 15_000);
  return state;
}

async function enqueue(voiceChannel, track, logger) {
  const state = await ensureConnection(voiceChannel, logger);
  state.queue.push(track);
  if (state.player.state.status === AudioPlayerStatus.Idle && !state.current) {
    await playNext(voiceChannel.guild.id, logger);
  }
  return state.queue.length;
}

async function playNext(guildId, logger) {
  const state = getGuildState(guildId);
  const next = state.queue.shift();
  if (!next) {
    state.current = null;
    return;
  }
  state.current = next;
  const stream = createStream(next.url);
  const resource = createAudioResource(stream);
  state.player.play(resource);
  logger.info({ guildId, title: next.title }, 'now playing');
}

function skip(guildId) {
  const state = getGuildState(guildId);
  if (!state.player) return false;
  state.player.stop(true);
  return true;
}

function stop(guildId) {
  const state = guilds.get(guildId);
  if (!state) return false;
  state.queue.length = 0;
  if (state.player) state.player.stop(true);
  destroyGuild(guildId);
  return true;
}

function destroyGuild(guildId) {
  const state = guilds.get(guildId);
  if (!state) return;
  try {
    state.player?.stop(true);
  } catch {
    /* noop */
  }
  const conn = getVoiceConnection(guildId);
  try {
    conn?.destroy();
  } catch {
    /* noop */
  }
  guilds.delete(guildId);
}

function getQueue(guildId) {
  const state = guilds.get(guildId);
  if (!state) return { current: null, upcoming: [] };
  return { current: state.current, upcoming: [...state.queue] };
}

function destroyAll() {
  for (const guildId of [...guilds.keys()]) {
    destroyGuild(guildId);
  }
}

module.exports = { enqueue, skip, stop, getQueue, destroyAll };
