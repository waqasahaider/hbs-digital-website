# H b&s Digital — VPS Deployment Guide

Production deployment for the **Hostinger KVM 2 VPS**. Docker-based, GitHub
workflow, automatic HTTPS, and ready to grow into a CRM/API + n8n on the same box.

> **Legend:** `<VPS_IP>`, `<you@github>`, etc. are placeholders — replace them.
> Run commands **on the VPS** unless a step says "on your Mac" or "in GitHub".
> ⚠️ marks the steps that are hard to undo — the DNS change and SSH hardening.

---

## 0. Architecture (what you're building)

```
Internet ─▶ Traefik  :80 → :443 (auto-redirect), Let's Encrypt TLS
                │  routes by Docker labels, on the `edge` network
                ├─▶ web  nginx → /opt/hbs/hbs-digital-website/site   hbsdigital.ae
                ├─▶ n8n  (added later)                               n8n.hbsdigital.ae
                └─▶ api  (added later, CRM/API)                      api.hbsdigital.ae
```

One reverse proxy handles TLS for everything. Adding a service later never
touches the site or the proxy config — you add a container with a few labels.

---

## 1. What is currently required on the VPS

A **fresh Hostinger KVM 2** (2 vCPU, 8 GB RAM, ~100 GB NVMe) is far more than
enough. Before deploying, the server needs the following — all installed in Part 3:

| Requirement | Why | Installed in |
|---|---|---|
| Ubuntu 22.04 or 24.04 LTS | base OS (Hostinger default template) | pre-installed |
| A non-root `deploy` user with sudo | never deploy/SSH as root | Step 3.2 |
| SSH key authentication | secure, password-less access | Step 3.3 |
| UFW firewall (22, 80, 443 only) | lock down everything else | Step 3.4 |
| Docker Engine + Compose plugin | runs the whole stack | Step 3.5 |
| This Git repo cloned to `/opt/hbs/` | the app + infra | Step 5 |
| `infra/.env` with real secrets | domain + ACME email (+ n8n later) | Step 5.3 |
| Ports 80/443 reachable + DNS pointed | so Let's Encrypt can issue certs | Parts 4 & 6 |

**Nothing else.** No Node.js on the host (the future API will run in its own
container), no Apache, no cPanel, no Hostinger Website Builder.

> If you set the VPS up through Hostinger's panel, note its **IP address** and the
> **root password / SSH key** you chose — you'll need them for the first login.

---

## 2. One-time prep on your Mac

Create an SSH key for yourself if you don't already have one:

```bash
ls ~/.ssh/id_ed25519.pub 2>/dev/null || ssh-keygen -t ed25519 -C "waqas@hbsdigital"
```

Copy the **public** key text — you'll paste it onto the server:

```bash
cat ~/.ssh/id_ed25519.pub
```

---

## 3. Server setup (step by step)

### 3.1 First login and update

```bash
ssh root@<VPS_IP>          # use the root password Hostinger gave you
apt update && apt -y upgrade
timedatectl set-timezone Asia/Dubai
```

### 3.2 Create a non-root deploy user

```bash
adduser deploy             # set a strong password when prompted
usermod -aG sudo deploy
```

### 3.3 Set up SSH key login for `deploy`

```bash
mkdir -p /home/deploy/.ssh
# paste YOUR Mac public key (from step 2) into authorized_keys:
nano /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Open a **new terminal** and confirm key login works before locking anything down:

```bash
ssh deploy@<VPS_IP>        # should log in WITHOUT asking for a password
```

⚠️ **3.4 Harden SSH (only after key login works).** Editing this wrong can lock
you out — keep your current root session open until you've re-tested.

```bash
sudo nano /etc/ssh/sshd_config
# set these lines:
#   PermitRootLogin no
#   PasswordAuthentication no
sudo systemctl restart ssh
```

### 3.5 Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable            # answer 'y'
sudo ufw status verbose
```

### 3.6 Install Docker Engine + Compose plugin

```bash
# Official Docker apt repo
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Let 'deploy' run docker without sudo
sudo usermod -aG docker deploy
newgrp docker              # or log out and back in
docker run --rm hello-world   # sanity check
```

### 3.7 (Recommended) fail2ban + Docker log rotation

```bash
sudo apt-get install -y fail2ban
# Cap container log sizes so disk can't fill:
echo '{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }' | \
  sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

---

## 4. ⚠️ DNS — point hbsdigital.ae at the VPS (Tasjeel)

This is the change to make deliberately. Your domain is at **Tasjeel**; add these
records in Tasjeel's DNS management for `hbsdigital.ae`:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `<VPS_IP>` | 3600 |
| A | `www` | `<VPS_IP>` | 3600 |
| A | `n8n` | `<VPS_IP>` | 3600 | *(optional, for later)* |

- Leave nameservers at Tasjeel; you're only adding A records.
- Propagation can take 30 min – a few hours. Check with:
  ```bash
  dig +short hbsdigital.ae     # should print <VPS_IP>
  ```
- **Do not start the stack for real until `dig` returns the VPS IP** — Let's Encrypt
  validates over HTTP and will fail (and rate-limit you) if DNS isn't ready.

---

## 5. Get the code onto the server (GitHub)

### 5.1 Push this repo to GitHub (from your Mac, once)

```bash
cd "/Users/waqasahaider/Desktop/HBS Digital Website"
git init && git add -A && git commit -m "Initial production setup"
git branch -M main
git remote add origin git@github.com:<you>/hbs-digital-website.git
git push -u origin main
```

### 5.2 Clone it on the VPS

```bash
sudo mkdir -p /opt/hbs && sudo chown deploy:deploy /opt/hbs
cd /opt/hbs
git clone https://github.com/<you>/hbs-digital-website.git
cd hbs-digital-website
```

> A **public** repo clones over HTTPS with no keys. For a **private** repo, add a
> read-only *deploy key*: `ssh-keygen -t ed25519 -f ~/.ssh/gh_deploy -N ""`, add
> the `.pub` to the repo's Settings → Deploy keys, and clone the `git@github.com:…`
> URL.

### 5.3 Create the server secrets file

```bash
cd /opt/hbs/hbs-digital-website/infra
cp .env.example .env
nano .env          # set SITE_DOMAIN=hbsdigital.ae and ACME_EMAIL=you@hbsdigital.ae
```

`.env` is gitignored — secrets never leave the server.

---

## 6. First launch + SSL

```bash
cd /opt/hbs/hbs-digital-website/infra
docker compose up -d
docker compose ps                 # traefik + web should be "running"
docker compose logs -f traefik    # watch it obtain the certificate, Ctrl-C to exit
```

Then verify:

```bash
curl -I https://hbsdigital.ae     # expect HTTP/2 200
```

Open **https://hbsdigital.ae** in a browser — padlock present, all four pages work,
`http://` redirects to `https://`, and `www.` redirects to the apex.

---

## 7. Automatic deploys from GitHub

Once Part 5–6 work, wire up push-to-deploy.

1. **Create an SSH key for the Action** (on the VPS as `deploy`):
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/gh_actions -N ""
   cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys
   cat ~/.ssh/gh_actions          # copy this PRIVATE key
   ```
2. **Add repo secrets** in GitHub → Settings → Secrets and variables → Actions:
   - `VPS_HOST` = `<VPS_IP>`
   - `VPS_USER` = `deploy`
   - `VPS_SSH_PORT` = `22`
   - `VPS_SSH_KEY` = the private key from step 1
3. Push to `main` → the **Deploy to VPS** workflow runs `./infra/deploy.sh` and the
   site updates. (`.github/workflows/deploy.yml` is already in the repo.)

---

## 8. Updating the site safely (no downtime)

**Content or copy change:**
```bash
# edit files in site/, then:
git commit -am "Update copy" && git push      # Action deploys it
```
Because `site/` is bind-mounted into nginx, the new files are served the instant
`git pull` lands on the server — **zero downtime, no restart.**

**Manual deploy on the server** (if not using the Action):
```bash
cd /opt/hbs/hbs-digital-website && ./infra/deploy.sh
```

**Infra/image change** (Traefik/nginx version, labels, adding a service): running
`docker compose up -d` recreates only the changed container — a few seconds of blip
for that one service; do these off-peak. Content and other services are unaffected.

**Roll back:**
```bash
cd /opt/hbs/hbs-digital-website
git log --oneline -n 5
git reset --hard <previous_commit> && ./infra/deploy.sh
```

---

## 9. Backups

- **The site + all config are in Git** — GitHub is your primary backup; a rebuild is
  "clone + `.env` + `docker compose up -d`".
- **Enable Hostinger VPS automatic backups / take a snapshot** in hPanel before big
  changes (KVM plans include weekly backups + on-demand snapshots).
- **Named volumes** (`traefik_letsencrypt`, and `n8n_data` later) hold state. Certs
  auto-reissue, but back up app data once n8n/CRM exist:
  ```bash
  # example: back up all named volumes to /home/deploy/backups
  mkdir -p ~/backups
  docker run --rm -v n8n_data:/data -v ~/backups:/backup alpine \
    tar czf /backup/n8n_data-$(date +%F).tar.gz -C /data .
  ```
  Add that to `cron` (`crontab -e`) and copy off-server (or rely on Hostinger snapshots).

---

## 10. Logging & monitoring

- **Live logs:** `docker compose logs -f` (all) or `docker compose logs -f web`.
- **Traefik access log** is on; view with `docker compose logs traefik`.
- **Rotation** is capped by the `daemon.json` from Step 3.7 (10 MB × 3 per container).
- **Health at a glance:** `docker compose ps` and `docker stats`.
- **Disk/uptime:** `df -h`, `uptime`. Hostinger's panel also graphs CPU/RAM/network.
- Optional later: add Uptime Kuma (another labelled container) for status-page monitoring.

---

## 11. Adding services later (the payoff)

Everything is already shaped for this. To add **n8n**:

```bash
cd /opt/hbs/hbs-digital-website/infra
nano .env      # fill in the N8N_* vars (see .env.example)
# add an A record  n8n.hbsdigital.ae → <VPS_IP>  at Tasjeel, then:
docker compose -f docker-compose.yml -f services/n8n.yml up -d
```

Traefik picks it up and issues its cert automatically — n8n is live at
`https://n8n.hbsdigital.ae`. A **CRM/API** follows the same pattern: a Dockerfile in
a new `api/` folder, a service block with `Host(\`api.hbsdigital.ae\`)` labels, its
own env vars. The reverse proxy and the website never change.

---

## ✅ Go-live checklist

**Domain / DNS**
- [ ] A record `@` → `<VPS_IP>` at Tasjeel
- [ ] A record `www` → `<VPS_IP>`
- [ ] `dig +short hbsdigital.ae` returns the VPS IP

**Server setup**
- [ ] OS updated; timezone set
- [ ] `deploy` sudo user created
- [ ] SSH key login works for `deploy`

**Firewall**
- [ ] UFW allows only 22, 80, 443; enabled

**Docker**
- [ ] Docker Engine + Compose plugin installed
- [ ] `deploy` in the `docker` group; `hello-world` runs
- [ ] Log rotation set in `/etc/docker/daemon.json`

**Reverse proxy + SSL**
- [ ] `docker compose up -d` → traefik + web running
- [ ] `https://hbsdigital.ae` serves with a valid padlock
- [ ] `http://` → `https://` and `www` → apex redirects work

**GitHub deployment**
- [ ] Repo pushed to GitHub
- [ ] Repo cloned to `/opt/hbs/hbs-digital-website`
- [ ] Action secrets set; push to `main` deploys

**Environment variables**
- [ ] `infra/.env` created on the server with real values
- [ ] `.env` confirmed gitignored (never committed)

**Hardening**
- [ ] Root SSH + password auth disabled
- [ ] fail2ban installed

**Backups**
- [ ] Hostinger VPS backups/snapshots enabled
- [ ] Volume backup cron in place (once app data exists)

**Logging**
- [ ] `docker compose logs` verified
- [ ] Rotation confirmed; disk usage checked (`df -h`)

**Safe updates**
- [ ] Test edit pushed → auto-deploys with no downtime
- [ ] Rollback procedure understood
