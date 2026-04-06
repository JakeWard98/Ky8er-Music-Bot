# Ky8er Music Bot

A minimal Discord music bot built on **discord.js v14** and **@discordjs/voice**, running on **Node 20 LTS**. Slash commands only — no message-content intent required.

## Features

- `/ping` — health/latency check
- `/play <youtube-url>` — joins your voice channel and plays a YouTube video (URL allowlisted)
- `/skip` — skip the current track
- `/stop` — stop playback, clear the queue, disconnect (requires Manage Server)
- `/queue` — show the current queue
- Per-user, per-command 3 s cooldown
- Structured logging via [pino](https://github.com/pinojs/pino)
- Graceful shutdown on SIGINT/SIGTERM
- Strict env validation — fails fast with a clear error if secrets are missing

## Requirements

- Node.js **20+**
- A Discord bot application with the following:
  - **Bot scopes**: `bot`, `applications.commands`
  - **Bot permissions**: `View Channels`, `Connect`, `Speak`, `Send Messages`, `Use Application Commands`
  - **Privileged intents**: none (this bot does not need Message Content)
- ffmpeg is provided automatically via the `ffmpeg-static` npm package — no system install required

## Setup

```bash
git clone https://github.com/JakeWard98/Ky8er-Music-Bot.git
cd Ky8er-Music-Bot
npm install
cp .env.example .env
# fill in DISCORD_TOKEN and DISCORD_CLIENT_ID (and GUILD_ID for fast guild deploys)
npm run deploy-commands
npm start
```

## Environment variables

| Variable            | Required | Default      | Notes                                                   |
| ------------------- | -------- | ------------ | ------------------------------------------------------- |
| `DISCORD_TOKEN`     | yes      | —            | Bot token from the Discord developer portal             |
| `DISCORD_CLIENT_ID` | yes      | —            | Application (client) ID                                 |
| `GUILD_ID`          | no       | _(global)_   | If set, slash commands deploy to this guild only (fast) |
| `LOG_LEVEL`         | no       | `info`       | pino log level                                          |
| `NODE_ENV`          | no       | `production` | `development` enables pretty logging                    |

## Scripts

| Command                   | Purpose                              |
| ------------------------- | ------------------------------------ |
| `npm start`               | Run the bot                          |
| `npm run deploy-commands` | Register slash commands with Discord |
| `npm run lint`            | ESLint                               |
| `npm test`                | Run the smoke tests (`node --test`)  |
| `npm run format`          | Format source with Prettier          |

## Security notes

- `/play` only accepts URLs whose host is `youtube.com`, `www.youtube.com`, `m.youtube.com`, or `youtu.be`, and whose protocol is `https`. Anything else is rejected before reaching ytdl.
- The bot connects with only `Guilds`, `GuildVoiceStates`, and `GuildMessages` intents — no privileged intents.
- The Discord token is read from `process.env`; `.env` is gitignored. Tokens are never logged (pino redact paths cover common cases).
- CI runs `npm audit --audit-level=high`, ESLint, and unit tests on every push and PR. CodeQL runs weekly. Dependabot opens weekly PRs for npm and github-actions updates.

## License

ISC — Jake Ward
