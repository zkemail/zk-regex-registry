# Deployment — zk-regex-registry (production)

How the live registry is deployed and operated. Verified 2026-06-22.

## Where it runs
- **GCP VM** `zk-regex-registry` — `e2-standard-16`, zone `us-central1-c`, project **`zkemail`**.
- **Public IP**: `34.66.37.121` — a **static/reserved** address (`zk-email-sdk`), so it survives stop/start.
- **DNS**: **`registry-dev.zkregex.com`** → that IP. This is the single live registry env (there is no separate `registry.zkregex.com` / `registry-staging` at present).
- **Boot/data disk**: `zk-regex-registry` (pd-balanced, 500G; ~280G used — mostly generated ZK circuit artifacts under `packages/`).

## App
- **Next.js app**, run as user **`sdk`** from `/home/sdk/zk-regex-registry/packages/app` via `next start` on **:3000**.
- **Node** v21.7.3 (installed via nvm at `/home/sdk/.nvm/versions/node/v21.7.3`).
- **Database**: **remote** Postgres `regex-db.zk.email:5432` (db `zkemail`) — set in `packages/app/.env.local`. (Because the DB is remote, a VM reboot only needs the app to restart.)

## Reboot-safety (systemd) — added 2026-06-21
The app used to be started **manually** (no init), so a reboot left nginx up but the app down (502). It's now a systemd service:
- Unit: **`/etc/systemd/system/zk-regex-registry.service`** — `ExecStart=<node> .../node_modules/.bin/next start`, `User=sdk`, `WorkingDirectory=.../packages/app`, `Restart=always`, **enabled** (`WantedBy=multi-user.target`).
- Validated: starts cleanly + connects to the remote DB. So the VM can be safely stopped/resized/rebooted (the static IP is preserved and the app auto-starts).

## nginx (reverse proxy)
- `/etc/nginx/sites-enabled/registry-dev.zkregex.com.conf` → proxies to the app on **:3000**.
- `/etc/nginx/sites-enabled/prisma-studo.conf` → `registry-dev.zkregex.com:8080` → **Prisma Studio :5555**, protected by **HTTP basic auth** (`/etc/nginx/.htpasswd`).
- nginx is `systemctl enable`d (auto-starts).

## Prisma Studio (:5555) — DB admin GUI
- Started manually via `prisma studio` (port 5555), behind nginx basic auth. **NOT auto-started** on boot — if you need it after a reboot, start it manually (or add a systemd unit). It is *not* required for the registry to serve.

## Operations
- **Restart the app**: `sudo systemctl restart zk-regex-registry`
- **Logs**: `journalctl -u zk-regex-registry -f`
- **Downsize note**: the 500G disk is ~280G real circuit data (grows per registry entry), so it can only shrink modestly; left at 500G as of 2026-06-22.
- **Health check**: `curl -s -o /dev/null -w '%{http_code}' https://registry-dev.zkregex.com` → expect `200`.
