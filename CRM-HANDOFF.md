# HBS CRM — Handoff (for a fresh chat)

**Purpose of the new chat:** change the **company name** shown in the CRM (`hbs-crm`).
Everything Claude needs to take over is below. Open the new chat in this folder
(`/Volumes/Business/AI/HBS Digital`) or wherever you keep the VPS work.

---

## 1. The task
- **Goal:** rename the company/brand shown inside the CRM.
- **New name:** _(tell Claude the exact new company name at the start of the new chat)_
- **Where it likely appears:** the CRM's app title / org name / logo text / login page /
  email templates. The exact place depends on which CRM software this is (see §4).

## 2. Where the CRM lives (confirmed facts)
| Item | Value |
|---|---|
| Service name | **hbs-crm** |
| VPS | Hostinger KVM 2, host **`srv1777624.hstgr.cloud`** (same VPS as n8n) |
| Deploy path on VPS | **`/docker/hbs-crm`** |
| URL | **https://crm.srv1777624.hstgr.cloud** |
| Containers (4) | **web** (`:3000`), **api** (`:4000`), **db** (postgres), **backup** (`hbs-crm-backup`) |
| Reverse proxy | Shared **Traefik** (`/docker/traefik`, host network, LE resolver `letsencrypt`) — **do not modify** |
| Secrets | in **`/docker/hbs-crm/.env`** (on the VPS, not local) |
| Backups | `hbs-crm-backup` container already runs — **leave it running** |

**Also on this VPS (do NOT disturb):**
- `n8n-4hkc` → https://n8n-4hkc.srv1777624.hstgr.cloud (the automation stack; Haider Mortgage social workflow lives here)
- `hbs-site` → the H b&s Digital website (`/docker/hbs-site`, apex `hbsdigital.ae`)

## 3. Access
- **Hostinger VPS** — use the Hostinger panel (**Docker Manager** shows the 4 hbs-crm
  containers) or **SSH** into the VPS (`ssh root@srv1777624.hstgr.cloud` or the panel's
  browser terminal — you have the credentials).
- The CRM code/config is **only on the VPS** — there is no local copy on the Mac, so the
  work happens over SSH / the Docker Manager, not in a local repo.

## 4. How to change the name (investigation → change)
Because the CRM software wasn't identified in prior chats, first **identify it**, then change the name:

1. **Identify the software & config**
   ```bash
   cd /docker/hbs-crm
   cat docker-compose.yml         # image names reveal the CRM (e.g. twentycrm/twenty, espocrm, or a custom web+api)
   cat .env                       # look for APP_NAME / COMPANY_NAME / ORG / SERVER_URL etc.
   docker compose ps
   ```
2. **Find where the company name is set** — usually one of:
   - an **env var** in `/docker/hbs-crm/.env` (then `docker compose up -d` to apply), or
   - an **in-app Settings → Organization/Workspace** screen at https://crm.srv1777624.hstgr.cloud (admin login), or
   - a **seed/config file** or the **postgres DB** (a `workspace`/`organization`/`settings` row).
3. **BACK UP FIRST** (before any DB/config change):
   ```bash
   docker exec <hbs-crm-db-container> pg_dump -U <user> <db> > /root/hbs-crm-backup-$(date +%F).sql
   ```
4. **Make the change**, then **restart only the CRM**:
   ```bash
   cd /docker/hbs-crm && docker compose up -d   # never touch /docker/traefik or /docker/n8n-4hkc
   ```
5. **Verify** at https://crm.srv1777624.hstgr.cloud, and confirm n8n + the website still load.

## 5. Guardrails
- Only touch **`/docker/hbs-crm`**. Do **not** modify Traefik, n8n, or the website.
- **Back up the CRM postgres** before any DB or config change.
- Confirm with the user before anything irreversible.

## 6. Source sessions (history)
- **HBS Digital** — main VPS-stack session (confirmed `hbs-crm — 4 containers, Running`).
- **Website Haider Mortgage LLC** / **Haider Mortgage LLC** (+ forks) — contain the VPS
  services table listing `hbs-crm`.
- The CRM appears as a **pre-existing** service in all of these — it may have been first
  deployed in an earlier chat (possibly a claude.ai web chat) or set up directly on the VPS.

## 7. Brand context (so you rename to the right thing)
- **H b&s Digital** — AI automation & consulting, Dubai (`hbsdigital.ae`). Logo: gradient
  wordmark "H b&s" + "DIGITAL". Brand gradient `#5b3bd6 → #9440cc → #e0447f → #e0703a`.
- **Haider Mortgage LLC** — the mortgage brokerage (separate; its social automation is in n8n).
- Confirm with the user **which name the CRM should now show** before changing it.
