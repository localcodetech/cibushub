# Deployment

How CibusHub runs on one VPS: the real site at **cibushubgh.com** and the demo at **demo.cibushubgh.com**, both from the same code.

```
Internet ──► Caddy (web container, ports 80/443, HTTPS)
               ├─ cibushubgh.com       app files + /api, /socket.io ──► api      ─┐
               ├─ www. and app.        redirect to cibushubgh.com                 ├─ worker
               ├─ api.cibushubgh.com   live webhooks ─────────────────► api      ─┘
               └─ demo.cibushubgh.com  app files + /api, /socket.io ──► demo-api ── demo-worker
                                                                         │
               MySQL: database cibushub (real) and cibushub_demo (demo) ◄┤
               Redis: database 0 (real) and 1 (demo)                    ◄┘
```

- **One address per site.** The app calls `/api` on its own address and Caddy forwards it, exactly like the Vite proxy in development. That means no CORS, and the login cookies are first-party.
- **Only Caddy faces the internet.** MySQL and Redis are never published.
- **Files:**
  - [compose.prod.yaml](../compose.prod.yaml): the containers
  - [client/Caddyfile](../client/Caddyfile): the web server
  - [deploy/deploy.sh](../deploy/deploy.sh): one deploy
  - `.env.production.example`, `server/.env.production.example`, `server/.env.demo.example`: the settings

## 1. The VPS (once)

Ubuntu 24.04, at least 2 vCPU, **4 GB RAM** (two sites and MySQL) and 40 GB of disk.

**The quick way:** [deploy/setup-vps.sh](../deploy/setup-vps.sh) does everything in this section in one go.

```bash
# On the laptop: forget the old server's fingerprint (after a reinstall), then put your key on root
ssh-keygen -R <VPS IP>
ssh-copy-id root@<VPS IP>

# On the VPS, as root
curl -fsSL https://raw.githubusercontent.com/localcodetech/cibushub/main/deploy/setup-vps.sh -o setup-vps.sh
bash setup-vps.sh
```

Then go on with section 3; the code is already downloaded. After the first deploy, `./deploy/first-seed.sh` creates the super admins and the demo data (section 4).

**By hand, step by step:** log in as root once, then:

```bash
# A normal user with sudo, and your SSH key copied to it
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Firewall: SSH, HTTP and HTTPS only
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Security updates install themselves
apt update && apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 2 GB of swap: a safety net while the images build
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Check that `ssh deploy@<VPS IP>` works with your key. Then turn off root and password logins in `/etc/ssh/sshd_config`:

```
PermitRootLogin no
PasswordAuthentication no
```

Restart SSH with `systemctl restart ssh`.

Then install Docker as `deploy`, following [docs.docker.com/engine/install/ubuntu](https://docs.docker.com/engine/install/ubuntu/), and let `deploy` use it:

```bash
sudo usermod -aG docker deploy   # log out and back in afterwards
docker compose version           # must print v2.x
```

## 2. DNS in Cloudflare (once)

In **cibushubgh.com → DNS**, add five `A` records, each pointing to the VPS IP, and set every one to **DNS only (grey cloud)**:

| Name | Purpose |
| --- | --- |
| `@` | The real site |
| `www` | Redirects to the real site |
| `app` | Redirects to the real site. Google and Apple were first set up with this address |
| `api` | Live webhooks |
| `demo` | The demo |

Grey cloud matters for two reasons:
- Caddy can then get its own certificates.
- Each visitor's real IP reaches the API, which `TRUST_PROXY=1` relies on.

Leave the existing `mail` (Resend) records as they are.

## 3. The code and the settings (once)

```bash
cd ~
git clone https://github.com/localcodetech/cibushub.git
cd cibushub
cp .env.production.example .env.production
cp server/.env.production.example server/.env.production
```

Fill in both files. Make every secret new, never the development ones:

```bash
openssl rand -hex 32    # once for each: OTP_SECRET, JWT_ACCESS_SECRET, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD
```

Then the demo's settings. The demo reads `server/.env.production` first and `server/.env.demo` on top of it. So it automatically has everything the real site has: real SMS, real email, Cloudinary photos, Google and Apple sign-in, and maps. `server/.env.demo` holds **only** what differs: its address, its database and Redis number, `DEMO_SITE=true`, Paystack **test** keys, its own secrets and its own super admin.

```bash
cp server/.env.demo.example server/.env.demo
nano server/.env.demo
chmod 600 .env.production server/.env.production server/.env.demo
```

## 4. The first deploy

```bash
./deploy/deploy.sh

# The real site's super admin (from SUPER_ADMIN_* in server/.env.production)
docker compose -f compose.prod.yaml --env-file .env.production run --rm migrate \
  npx sequelize-cli db:seed --seed 20261006000001-super-admin.cjs

# The demo: its super admin and the demo data (restaurants, riders, admin; password Demo2026)
docker compose -f compose.prod.yaml --env-file .env.production run --rm demo-migrate \
  npx sequelize-cli db:seed:all
```

On first start, MySQL creates both databases. The `cibushub_demo` one comes from [docker/mysql/prod-init](../docker/mysql/prod-init/). Caddy gets the HTTPS certificates within a minute.

Check:
- `https://cibushubgh.com/api/health` and `https://demo.cibushubgh.com/api/health` both show `"status":"ok"`
- `http://cibushubgh.com`, `https://www.cibushubgh.com` and `https://app.cibushubgh.com` all end on `https://cibushubgh.com`
- logging in on each site works

## 5. Outside services (once)

| Service | Setting |
| --- | --- |
| **Paystack, Live mode** | Webhook URL: `https://api.cibushubgh.com/api/v1/webhooks/paystack` |
| **Paystack, Test mode** | Webhook URL: `https://demo.cibushubgh.com/api/v1/webhooks/paystack` |
| **Resend** | Webhook `https://api.cibushubgh.com/api/v1/webhooks/resend`, event `email.bounced`. Put its secret in `RESEND_WEBHOOK_SECRET` |
| **Google sign-in** | Add `https://cibushubgh.com` and `https://demo.cibushubgh.com` to the authorised JavaScript origins. They were set up with `app.` first; see [social-sign-in-setup.md](social-sign-in-setup.md) |
| **Apple sign-in** | Add `cibushubgh.com` and `demo.cibushubgh.com` to the Services ID's domains, and `https://cibushubgh.com/login` and `https://demo.cibushubgh.com/login` to its return URLs |

**While Paystack hasn't verified the business yet,** the real site has to use test keys too. Paystack only has one test webhook URL, so it can't reach both sites. Until the live keys arrive:
- point the test webhook at the site you're testing
- the other site still confirms payments through its own status check when the customer comes back from Paystack, just a few seconds later

## 6. Every update afterwards

Merge to `main`, then on the VPS:

```bash
cd ~/cibushub && ./deploy/deploy.sh
```

The script runs these steps in order:
1. pull the code
2. build the images
3. run new migrations (real, then demo) while the old version is still serving
4. swap in the new containers
5. remove the old images

## Everyday commands

```bash
alias dc='docker compose -f compose.prod.yaml --env-file .env.production'
dc ps                        # what's running, and whether it's healthy
dc logs -f api               # the real API's logs (worker, demo-api, web the same way)
dc restart api worker        # restart the real site's server
dc exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" cibushub'   # a database shell
```

Never run `dc down -v` on the VPS: it deletes the databases.

## Still to do (Step 15)

- **Backups:** a daily database dump copied off the server, plus one tested restore (AC-DB-06)
- **Monitoring:** Sentry for errors, and UptimeRobot on both `/api/health` addresses (AC-MON-01, 03)
- **CI:** GitHub Actions running lint, tests and build on every pull request (AC-OPS-03, AC-TEST-06)
- **Demo extras:** photos, the "Demo" banner, quick role logins and a nightly reset
