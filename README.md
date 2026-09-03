# H b&s Digital — Website

Production website for **H b&s Digital** (AI automation & consulting, Dubai).
Static front-end today, architected to grow into a CRM/API + n8n on the same VPS.

## Stack

- **Site:** plain static HTML/CSS/JS (no build step) — in [`site/`](site/)
- **Reverse proxy + TLS:** Traefik v3 (automatic Let's Encrypt HTTPS)
- **Web server:** nginx (serves the static files)
- **Orchestration:** Docker Compose — in [`infra/`](infra/)
- **Host:** Hostinger KVM 2 VPS (Docker)
- **Deploy:** GitHub → VPS over SSH ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))

```
Internet ──▶ Traefik (:80/:443, HTTPS)
                 │
                 ├─▶ web   (nginx → ./site)          hbsdigital.ae
                 ├─▶ n8n   (later)                    n8n.hbsdigital.ae
                 └─▶ api   (later, CRM/API)           api.hbsdigital.ae
             all on the shared `edge` Docker network
```

## Repository layout

```
site/                     the website (edit these files to change content)
infra/
  docker-compose.yml      the production stack (Traefik + nginx)
  nginx/nginx.conf        static-serving config (clean URLs, gzip, cache, 404)
  deploy.sh              safe deploy script (git pull + compose up)
  services/n8n.yml        ready-to-use overlay for adding n8n later
  .env.example            template for server secrets (copy to .env on VPS)
.github/workflows/deploy.yml   auto-deploy on push to main
DEPLOYMENT.md             full server setup + go-live checklist
archive/                  original single-file prototype (reference only)
```

## Everyday workflow

1. Edit files in `site/`, commit, push to `main`.
2. GitHub Actions deploys to the VPS automatically (or run `./infra/deploy.sh` on the server).
3. Content changes are live immediately — the site is bind-mounted, so there's no downtime.

## Going live / server setup

See **[DEPLOYMENT.md](DEPLOYMENT.md)** — it covers DNS, server hardening, firewall,
Docker, reverse proxy, SSL, GitHub deployment, environment variables, backups,
logging, and safe zero-downtime updates, with copy-paste commands.

## Contact form

The contact form posts to **Formspree** (client-side, host-independent). Set your
form ID in [`site/contact/index.html`](site/contact/index.html). When the CRM/API
lands on the VPS, the form can be repointed to a self-hosted endpoint.
