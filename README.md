# Ky8er Music Bot

A minimal Discord music bot built on **discord.js v14** and **@discordjs/voice**, running on **Node 20 LTS**. Designed to run as a long-lived service on a VM / VPS / dedicated server — supported on **Linux** (`systemd`) and **Windows** (`NSSM`). Slash commands only — no message-content intent required.

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

- Node.js **20+** (Linux, Windows, or macOS)
- A Discord bot application with the following:
  - **Bot scopes**: `bot`, `applications.commands`
  - **Bot permissions**: `View Channels`, `Connect`, `Speak`, `Send Messages`, `Use Application Commands`
  - **Privileged intents**: none (this bot does not need Message Content)
- ffmpeg is provided automatically via the `ffmpeg-static` npm package (ships prebuilt Linux/Windows/macOS binaries) — no system install required
- `@discordjs/opus` ships prebuilt binaries for Linux, Windows, and macOS, so no C++ build toolchain is required on supported platforms

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

## Production deployment

The bot is intended to run as a long-lived background service on a VM, VPS, or
dedicated server. Two supported paths are documented below — pick whichever
matches your host OS:

- [**Linux** (`systemd`)](#linux-vm--vps--server-systemd)
- [**Windows** (`NSSM`)](#windows-vm--server-nssm)

Both achieve the same end state: the bot starts on boot, restarts on failure,
shuts down gracefully on SIGINT/Ctrl+C, and writes logs to a system-managed
sink.

### Linux VM / VPS / server (systemd)

A hardened unit file is provided at
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
> and NSSM paths are the supported deployment modes.

### Windows VM / server (NSSM)

On a Windows host (Windows Server 2019+ or Windows 10/11), the bot is
supervised by [NSSM](https://nssm.cc) — a small, well-trusted wrapper that
turns any executable into a proper Windows service. A PowerShell installer is
provided at
[`deploy/windows/install-service.ps1`](deploy/windows/install-service.ps1).

#### 1. Install prerequisites

From an **elevated PowerShell** prompt:

```powershell
# Install Node 20 LTS — https://nodejs.org/en/download/  (or via winget)
winget install OpenJS.NodeJS.LTS

# Install NSSM — https://nssm.cc  (or via Chocolatey)
choco install nssm -y          # easiest
# OR: download nssm.exe and place it on PATH
```

Outbound HTTPS to Discord and YouTube is the only network requirement. No
inbound firewall rules are needed.

#### 2. Install the bot

```powershell
# Clone to a stable location
git clone https://github.com/JakeWard98/Ky8er-Music-Bot.git C:\ky8er-music-bot
cd C:\ky8er-music-bot

# Install production dependencies
npm ci --omit=dev

# Configure secrets
Copy-Item .env.example .env
notepad .env
# Fill in DISCORD_TOKEN, DISCORD_CLIENT_ID (and optionally GUILD_ID).
# Keep NODE_ENV=production.
```

Lock down `.env` so only Administrators and SYSTEM can read it:

```powershell
icacls .env /inheritance:r /grant:r "BUILTIN\Administrators:R" "NT AUTHORITY\SYSTEM:R"
```

#### 3. Register slash commands (one-shot)

```powershell
node src\deploy-commands.js
```

Re-run after adding/renaming commands.

#### 4. Install and start the Windows service

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\deploy\windows\install-service.ps1
```

The script:

- Creates a Windows service named `Ky8erMusicBot` (auto-start on boot)
- Runs `node.exe src\index.js` from `C:\ky8er-music-bot`
- Writes stdout/stderr to `C:\ky8er-music-bot\logs\stdout.log` and `stderr.log`
  with rotation at 10 MiB
- Restarts on failure with a 5 s back-off
- On stop, sends a `Ctrl+C` (mapped to `SIGINT` in Node) and waits up to 15 s
  for the bot to drain — matching the in-process graceful shutdown handler
  that destroys voice connections and flushes pino

You can pass overrides if your layout differs:

```powershell
.\deploy\windows\install-service.ps1 -InstallDir D:\bots\ky8er-music-bot -ServiceName Ky8erMusicBot
```

#### 5. Manage the service

```powershell
nssm status   Ky8erMusicBot
nssm restart  Ky8erMusicBot
nssm stop     Ky8erMusicBot
nssm remove   Ky8erMusicBot confirm     # uninstall

# Or via the built-in Windows tooling:
Get-Service Ky8erMusicBot
Restart-Service Ky8erMusicBot
```

#### 6. View logs

```powershell
Get-Content C:\ky8er-music-bot\logs\stdout.log -Wait -Tail 50
Get-Content C:\ky8er-music-bot\logs\stderr.log -Wait -Tail 50
```

In production (`NODE_ENV=production`) pino emits one JSON line per event. To
pretty-print on the fly:

```powershell
Get-Content C:\ky8er-music-bot\logs\stdout.log -Wait | npx pino-pretty
```

#### 7. Updating

```powershell
cd C:\ky8er-music-bot
git pull
npm ci --omit=dev
# If commands changed:
node src\deploy-commands.js
nssm restart Ky8erMusicBot
```

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
- On Linux, `.env` lives at `/opt/ky8er-music-bot/.env` with `0600` perms owned by the unprivileged `ky8er` user. The systemd unit reads it via `EnvironmentFile=` so secrets never appear in `ps`/`/proc/<pid>/cmdline`.
- On Windows, `.env` should be ACL-locked to `Administrators` and `SYSTEM` only (`icacls` snippet in the Windows section above). The service runs under `LocalSystem` by default; if you'd rather run under a dedicated low-privilege account, set `nssm set Ky8erMusicBot ObjectName .\ky8erbot <password>`.
- The systemd unit applies `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, an empty `CapabilityBoundingSet`, and a 512 MB memory cap to contain blast radius if a dependency is ever compromised.
- CI runs `npm audit --audit-level=high`, ESLint, and unit tests on every push and PR. CodeQL runs weekly. Dependabot opens weekly PRs for npm and github-actions updates.

## License

ISC — Jake Ward
