#!/usr/bin/env bash
# Prepares a FRESH Ubuntu 24.04 VPS for CibusHub, in one go (see docs/deployment.md).
# Run it once, as root, AFTER your laptop's SSH key is on root (ssh-copy-id root@<VPS IP>):
#
#   curl -fsSL https://raw.githubusercontent.com/localcodetech/cibushub/main/deploy/setup-vps.sh -o setup-vps.sh
#   bash setup-vps.sh
#
# It: updates the system, makes the "deploy" user with your SSH key, turns on the firewall,
# automatic security updates and 2 GB of swap, installs Docker, locks SSH to keys only
# (no root, no passwords) and downloads the code into /home/deploy/cibushub.
set -euo pipefail

REPO_URL="https://github.com/localcodetech/cibushub.git"
USER_NAME="deploy"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root." >&2
  exit 1
fi

# Without a key on root, locking SSH to keys only would lock you out: stop before anything changes
if [ ! -s /root/.ssh/authorized_keys ]; then
  echo "No SSH key on root yet. On your laptop run: ssh-copy-id root@<VPS IP>   then run this again." >&2
  exit 1
fi

echo "→ Updating the system"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get upgrade -yq
apt-get install -yq ca-certificates curl git ufw unattended-upgrades

echo "→ Creating the '$USER_NAME' user (choose its password: sudo asks for it)"
if ! id "$USER_NAME" >/dev/null 2>&1; then
  adduser --gecos "" "$USER_NAME"
fi
usermod -aG sudo "$USER_NAME"
install -d -m 700 -o "$USER_NAME" -g "$USER_NAME" "/home/$USER_NAME/.ssh"
cp /root/.ssh/authorized_keys "/home/$USER_NAME/.ssh/authorized_keys"
chown "$USER_NAME:$USER_NAME" "/home/$USER_NAME/.ssh/authorized_keys"
chmod 600 "/home/$USER_NAME/.ssh/authorized_keys"

echo "→ Firewall: SSH, HTTP and HTTPS only"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "→ Automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT

echo "→ 2 GB of swap (a safety net while images build)"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "→ Docker"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -q
apt-get install -yq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker "$USER_NAME"

echo "→ The code, and the dc shortcut"
if [ ! -d "/home/$USER_NAME/cibushub" ]; then
  sudo -u "$USER_NAME" git clone "$REPO_URL" "/home/$USER_NAME/cibushub"
fi
if ! grep -q "alias dc=" "/home/$USER_NAME/.bashrc"; then
  echo "alias dc='docker compose -f compose.prod.yaml --env-file .env.production'" >> "/home/$USER_NAME/.bashrc"
fi

echo "→ SSH: keys only, no root login"
cat > /etc/ssh/sshd_config.d/00-cibushub.conf <<'EOF'
# CibusHub: log in only as a normal user, with an SSH key
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
# Ubuntu 24.04 starts SSH on demand, so its run folder may not exist yet; the check needs it
mkdir -p /run/sshd
sshd -t
systemctl restart ssh

echo
echo "✓ Done. From now on log in as: ssh $USER_NAME@$(curl -4 -s ifconfig.me)"
echo "  Next: copy the settings files from your laptop, then run ./deploy/deploy.sh (docs/deployment.md)."
if [ -f /var/run/reboot-required ]; then
  echo "  The system updates want a restart: run 'reboot' now, then log in as $USER_NAME."
fi
