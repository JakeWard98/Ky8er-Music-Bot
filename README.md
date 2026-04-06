# Ky8er Music Bot

A minimal Discord music bot built on **discord.js v14** and **@discordjs/voice**, running on **Node 20 LTS**. Designed to run as a long-lived service on a Linux VM / VPS / dedicated server under `systemd`. Slash commands only — no message-content intent required.

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

## Local development

```bash
git clone https://github.com/JakeWard98/Ky8er-Music-Bot.git
cd Ky8er-Music-Bot
npm install
cp .env.example .env
# fill in DISCORD_TOKEN and DISCORD_CLIENT_ID (and GUILD_ID for fast guild deploys)
# set NODE_ENV=development for pretty pino logs while iterating locally
npm run deploy-commands
npm start
```

## Production deployment (Linux VM / VPS / server)

The bot is intended to be deployed on a Linux server (Ubuntu 22.04+/Debian 12+
recommended) and supervised by **systemd**. A hardened unit file is provided at
[`deploy/ky8er-music-bot.service`](deploy/ky8er-music-bot.service).

### 1. Provision the server

Tested on a small VPS (1 vCPU / 1 GB RAM is sufficient for a handful of guilds).
You only need outbound HTTPS (Discord API + YouTube) — no inbound ports.

```bash
# As root, install Node 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git

# Create a dedicated unprivileged user
useradd --system --create-home --shell /usr/sbin/nologin ky8er
```

### 2. Install the bot

```bash
# As root
install -d -o ky8er -g ky8er /opt/ky8er-music-bot
sudo -u ky8er git clone https://github.com/JakeWard98/Ky8er-Music-Bot.git /opt/ky8er-music-bot
cd /opt/ky8er-music-bot
sudo -u ky8er npm ci --omit=dev
sudo -u ky8er cp .env.example .env
# Edit .env and fill in DISCORD_TOKEN, DISCORD_CLIENT_ID (and GUILD_ID if needed).
# Keep NODE_ENV=production so pino emits structured JSON for journald.
chmod 600 .env
chown ky8er:ky8er .env
```

### 3. Register slash commands (one-shot)

```bash
sudo -u ky8er --preserve-env=PATH bash -c 'cd /opt/ky8er-music-bot && node src/deploy-commands.js'
```

Re-run this any time you add/rename a command. Guild-scoped (`GUILD_ID` set)
deploys are instant; global deploys can take up to an hour to propagate.

### 4. Install and start the systemd service

```bash
install -m 644 /opt/ky8er-music-bot/deploy/ky8er-music-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ky8er-music-bot
systemctl status ky8er-music-bot
```

The unit:

- Runs as the unprivileged `ky8er` user out of `/opt/ky8er-music-bot`
- Reads secrets from `/opt/ky8er-music-bot/.env` via `EnvironmentFile=`
- Restarts automatically on failure (`Restart=on-failure`, 5 s backoff)
- Forwards SIGINT on stop so the bot shuts down gracefully (destroys voice
  connections, flushes logs)
- Hardens the process: `NoNewPrivileges`, `ProtectSystem=strict`,
  `ProtectHome`, `PrivateTmp`, dropped capabilities, 512 MB memory cap

### 5. View logs

```bash
journalctl -u ky8er-music-bot -f          # follow live
journalctl -u ky8er-music-bot --since "1 hour ago"
```

In production (`NODE_ENV=production`) pino emits one JSON line per event,
which journald indexes natively. To pretty-print on the fly:

```bash
journalctl -u ky8er-music-bot -o cat | npx pino-pretty
```

### 6. Updating

```bash
cd /opt/ky8er-music-bot
sudo -u ky8er git pull
sudo -u ky8er npm ci --omit=dev
# If commands changed:
sudo -u ky8er bash -c 'node src/deploy-commands.js'
systemctl restart ky8er-music-bot
```

> **Firewall**: only outbound 443 is required. No inbound ports need to be
> opened on the VPS.
>
> **Containers**: a Dockerfile is intentionally not provided — the systemd
> path is the supported deployment mode.

## Environment variables

| Variable            | Required | Default      | Notes                                                   |
| ------------------- | -------- | ------------ | ------------------------------------------------------- |
| `DISCORD_TOKEN`     | yes      | —            | Bot token from the Discord developer portal             |
| `DISCORD_CLIENT_ID` | yes      | —            | Application (client) ID                                 |
| `GUILD_ID`          | no       | _(global)_   | If set, slash commands deploy to this guild only (fast) |
| `LOG_LEVEL`         | no       | `info`       | pino log level (`debug` for verbose, `warn` for quiet)  |
| `NODE_ENV`          | no       | `production` | Use `production` on the VPS — emits JSON logs for journald. `development` enables pino-pretty colourised output. |

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
- On the VPS, `.env` lives at `/opt/ky8er-music-bot/.env` with `0600` perms owned by the unprivileged `ky8er` user. The systemd unit reads it via `EnvironmentFile=` so secrets never appear in `ps`/`/proc/<pid>/cmdline`.
- The systemd unit applies `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, an empty `CapabilityBoundingSet`, and a 512 MB memory cap to contain blast radius if a dependency is ever compromised.
- CI runs `npm audit --audit-level=high`, ESLint, and unit tests on every push and PR. CodeQL runs weekly. Dependabot opens weekly PRs for npm and github-actions updates.

## License

ISC — Jake Ward
