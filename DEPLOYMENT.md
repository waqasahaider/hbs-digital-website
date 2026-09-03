# H b&s Digital — VPS Deployment Runbook

How the website is deployed onto the **Hostinger KVM 2 VPS** (`srv1777624`,
`187.127.185.134`, Ubuntu 24.04) and how to operate it.

> ⚠️ marks the only hard-to-undo step: the DNS change at Tasjeel.

---

## 0. The existing environment (discovered, do not disturb)

This VPS already runs a production stack under `/docker/`:

| App | Containers | Domain (via Traefik) | Dir |
|---|---|---|---|
| **traefik** | reverse proxy, host network, LE resolver `letsencrypt` | — | `/docker/traefik` |
| **hbs-crm** | web (:3000), api (:4000), db + backup (postgres) | `crm.srv1777624.hstgr.cloud` | `/docker/hbs-crm` |
| **n8n-4hkc** | n8n | `n8n-4hkc.srv1777624.hstgr.cloud` | `/docker/n8n-4hkc` |

Traefik: `--providers.docker`, `exposedbydefault=false`, entrypoints `web`:80 →
`websecure`:443 (auto-redirect), HTTP-01 Let's Encrypt via resolver **`letsencrypt`**.

**The website plugs into this Traefik.** It adds one nginx container with matching
labels. It never modifies Traefik, the CRM, or n8n.

---

## 1. The website deployment

Location on the VPS: **`/docker/hbs-site`** (this repo, cloned).

- `docker-compose.yml` — the `hbs-site` nginx container + Traefik labels
  (`Host(hbsdigital.ae) || Host(www.hbsdigital.ae)`, `certresolver=letsencrypt`).
- `nginx/nginx.conf` — clean URLs, gzip, caching, security headers, custom 404.
- `site/` — the static files, bind-mounted read-only into nginx.

Because the site is a static, secret-free app, there is **no `.env`** for it. (The CRM,
n8n, and Traefik keep their own secrets in their own `/docker/<svc>/.env`.)

---

## 2. First deploy (one time)

**a. Get the code on GitHub** (from your Mac, once authenticated):
```bash
gh repo create hbs-digital-website --private --source="." --remote=origin --push
```

**b. Clone it on the VPS:**
```bash
cd /docker
git clone https://github.com/<you>/hbs-digital-website.git hbs-site
cd hbs-site
```
(Private repo → add a read-only **deploy key**: `ssh-keygen -t ed25519 -f ~/.ssh/gh_deploy -N ""`,
put the `.pub` in the repo's Settings → Deploy keys, and clone the `git@github.com:…` URL.)

**c. Bring it up (behind the existing Traefik):**
```bash
cd /docker/hbs-site
docker compose up -d
docker compose ps
```

At this point the container is running and Traefik knows the route, but the TLS cert
can only be issued once DNS points here — that's the next step.

---

## 3. ⚠️ DNS — point hbsdigital.ae at the VPS (Tasjeel)

Add these records in Tasjeel's DNS for `hbsdigital.ae`:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@`   | `187.127.185.134` | 3600 |
| A | `www` | `187.127.185.134` | 3600 |

- Only A records change; leave nameservers at Tasjeel.
- Propagation: 30 min – a few hours. Verify: `dig +short hbsdigital.ae` → the IP.
- Once DNS resolves, Traefik completes the Let's Encrypt HTTP challenge automatically
  (watch: `docker logs traefik-traefik-1 -f`). Then:
  ```bash
  curl -I https://hbsdigital.ae      # expect HTTP/2 200
  ```

Open **https://hbsdigital.ae** — valid padlock, all pages work, `http`→`https` and
`www`→apex redirects work.

---

## 4. Updating the site (no downtime)

**Content/copy change:**
```bash
# edit files in site/, then:
git commit -am "Update copy" && git push        # Action deploys it
```
`site/` is bind-mounted, so new files are served the instant `git pull` lands on the
VPS — **zero downtime, no restart.**

**Manual deploy on the VPS:**
```bash
cd /docker/hbs-site && ./deploy.sh
```

**Config change** (nginx.conf, labels): `docker compose up -d` recreates only the
`hbs-site` container — a few seconds of blip for the website only; CRM/n8n unaffected.

**Roll back:**
```bash
cd /docker/hbs-site && git reset --hard <previous_commit> && ./deploy.sh
```

---

## 5. Auto-deploy from GitHub

`.github/workflows/deploy.yml` SSHes to the VPS and runs `deploy.sh` on push to `main`.
Add repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `VPS_HOST` | `187.127.185.134` |
| `VPS_USER` | `deploy` (or `root` to start) |
| `VPS_SSH_PORT` | `22` |
| `VPS_SSH_KEY` | private key whose public half is in that user's `authorized_keys` |

---

## 6. Backups & logging

- **Site + config are in Git** → GitHub is the primary backup; rebuild = clone + `up -d`.
- Hostinger VPS has **weekly backups** (hPanel → this VPS → Backups & Monitoring); take a
  snapshot before big changes.
- Logs: `docker compose logs -f` (site), `docker logs traefik-traefik-1` (proxy/cert).
- The CRM Postgres already has an `hbs-crm-backup` container — leave it running.

---

## 7. Adding more later

Another service = another `/docker/<svc>` with its own compose + Traefik labels
(`certresolver=letsencrypt`, its own `Host(...)`), plus a DNS record. The website and
the proxy are untouched. n8n and the CRM already follow this exact pattern.

---

## ✅ Checklist

- [ ] Repo pushed to GitHub
- [ ] Cloned to `/docker/hbs-site` on the VPS
- [ ] `docker compose up -d` → `hbs-site` running
- [ ] A records `@` and `www` → `187.127.185.134` at Tasjeel
- [ ] `dig +short hbsdigital.ae` returns the IP
- [ ] `https://hbsdigital.ae` serves with a valid cert; redirects work
- [ ] CRM (`crm.srv1777624.hstgr.cloud`) and n8n still work — unaffected
- [ ] GitHub Action secrets set; push to `main` deploys
- [ ] Formspree form ID set in `site/contact/index.html`
