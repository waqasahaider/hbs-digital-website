# H b&s Digital — Website

Production website for **H b&s Digital** (AI automation & consulting, Dubai).
Static front-end, deployed as a container on the existing Hostinger KVM 2 VPS.

## Where it runs

The VPS already runs a shared **Traefik** reverse proxy (host network, Let's Encrypt
resolver `letsencrypt`) that fronts the CRM and n8n. This website is **one more
container behind that same Traefik** — it does not run its own proxy.

```
Internet ─▶ Traefik (:80/:443, existing)  on the VPS <VPS_IP>
                ├─▶ hbs-site (nginx → ./site)   hbsdigital.ae, www
                ├─▶ hbs-crm-web / -api          crm.<vps-hostname>
                └─▶ n8n                          n8n-4hkc.<vps-hostname>
```

## Repository layout

```
site/                  the website (edit these files to change content)
docker-compose.yml      the site container + Traefik labels
nginx/nginx.conf        static-serving config (clean URLs, gzip, cache, 404)
deploy.sh              git pull + docker compose up (zero-downtime for content)
.github/workflows/deploy.yml   auto-deploy on push to main
DEPLOYMENT.md           full runbook: how it's wired, DNS, deploy, updates
archive/                original single-file prototype (reference only)
```

## Deploy location on the VPS

`/docker/hbs-site` (alongside `/docker/traefik`, `/docker/hbs-crm`, `/docker/n8n-4hkc`).

## Everyday workflow

1. Edit files in `site/`, commit, push to `main`.
2. GitHub Actions runs `deploy.sh` on the VPS (or run it there manually).
3. Content changes are live immediately — `site/` is bind-mounted, so no downtime.

## Contact form

The contact form posts to **Formspree** (client-side, host-independent). Set your
form ID in [`site/contact/index.html`](site/contact/index.html). Later it can be
repointed to the CRM/API already running on this VPS.

## Secrets

The static site has none. Existing/future services keep their secrets in their own
`/docker/<service>/.env` on the VPS (as the CRM, n8n, and Traefik already do) — never
committed to git.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full runbook.
