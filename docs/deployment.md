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

## 7. Backups (AC-DB-06)

`deploy/backup.sh` saves the real site's database (`cibushub`) as `/var/backups/cibushub/cibushub-<date>.sql.gz` and copies it to Backblaze B2. The VPS keeps 14 days, and a lifecycle rule on the bucket keeps 30. The demo isn't backed up: its seeders rebuild it.

### Set up (once)

1. Backblaze B2: a **private**, encrypted bucket `cibushub-backups`; lifecycle rule "hide after 30 days, delete 1 day later"; an application key for that bucket only (read and write).
2. On the VPS: `sudo apt install -y rclone`, then `sudo rclone config` → new remote named `offsite`, type `b2`, with the key ID and key. It must be **root's** config (`sudo`), because cron runs the backup as root.
3. Nightly at 02:30 (Ghana time = UTC): `sudo crontab -e` and add
   ```
   30 2 * * * /home/deploy/cibushub/deploy/backup.sh >> /var/log/cibushub-backup.log 2>&1
   ```

### Check it's running

```bash
sudo rclone ls offsite:cibushub-backups     # one file per night
tail -5 /var/log/cibushub-backup.log        # ends with "✓ Backup saved"
```

### Practice restore (tested 2026-10-17: 2 of 2 users, 28 of 28 tables)

Into a **separate** database, never over the real one. With `compose` defined as in `deploy/deploy.sh`:

```bash
mkdir -p ~/restore-test
sudo rclone copy offsite:cibushub-backups/cibushub-<date>.sql.gz ~/restore-test/
compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "CREATE DATABASE cibushub_restore_test"'
sudo zcat ~/restore-test/cibushub-<date>.sql.gz | compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot cibushub_restore_test'
# compare row counts with cibushub, then:
compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "DROP DATABASE cibushub_restore_test"'
rm -rf ~/restore-test
```

Repeat it every few months, and after any change to `backup.sh`.

### In a real emergency (the real database is lost or damaged)

Everything since the last backup (up to a day) is lost, so restore only when the data really is gone.

1. **Stop the app**, so nobody writes to a half-restored database:
   `compose stop web api worker`
2. **Keep a copy of the damaged database first** (it may hold the newest orders):
   `sudo ./deploy/backup.sh` (saved under today's date; rename it, e.g. `-damaged`, before step 4 overwrites today's name)
3. **Get the newest good backup.** `sudo rclone ls offsite:cibushub-backups`, then `sudo rclone copy` it to `~/restore`. If the whole VPS is gone: set up a new one (sections 1 to 4, without the first seed), install and configure rclone with the same key, then continue here.
4. **Empty the real database and load the backup:**
   ```bash
   compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot -e "DROP DATABASE cibushub; CREATE DATABASE cibushub CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; GRANT ALL ON cibushub.* TO \"$MYSQL_USER\"@\"%\";"'
   sudo zcat ~/restore/cibushub-<date>.sql.gz | compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot cibushub'
   ```
5. **Bring the schema up to date** (the backup may be older than the code): `compose run --rm migrate`
6. **Start the app:** `compose up -d`, then check `https://cibushubgh.com/api/health` and log in.
7. **Payments made after the backup** exist in Paystack but not in the database. Check the Paystack dashboard for that period and settle them by hand.

## Still to do (Step 15)

- **Monitoring:** Sentry for errors, and UptimeRobot on both `/api/health` addresses (AC-MON-01, 03)
- **CI:** GitHub Actions running lint, tests and build on every pull request (AC-OPS-03, AC-TEST-06)
- **Demo extras:** photos, the "Demo" banner, quick role logins and a nightly reset
