# H b&s Digital — Website Handoff

## Project
- **Company:** H b&s Digital
- **Industry:** AI automation & consulting — helping businesses adopt AI into their operations
- **Based:** Dubai, UAE
- **Current stage:** Static HTML prototype built in Claude.ai chat. Ready to become a real, deployed, multi-page site.

## Brand tokens (keep these — don't restyle)

**Colors**
- Background: `#0a0912`
- Elevated panel: `#14122540`
- Text: `#f2f0f8`
- Muted text: `#9b95b3`
- Divider lines: `#2b2740`
- Brand gradient: `linear-gradient(90deg, #5b3bd6 0%, #9440cc 35%, #e0447f 66%, #e0703a 100%)`

**Type**
- Headlines / logo: `Georgia, 'Times New Roman', serif`
- Body / UI: `Helvetica, Arial, sans-serif`

**Logo**
Gradient wordmark "H b&s" + small gradient dot + tracked "DIGITAL" caption underneath. Recreated with CSS gradient text in the prototype's nav. Original artwork also exists as a separate transparent PNG.

## What exists right now
`H_bs_Digital_Website.html` — a single self-contained HTML file with:
- 4 sections toggled by JS (Home, About, Services, Contact) — not real routes yet
- Responsive layout, focus states, reduced-motion respected
- A contact form that is **front-end only** — it does not send email anywhere yet
- No backend, no CMS, no analytics, no deployment

## What I need built
1. Convert this into a real multi-page site with proper routes (`/`, `/about`, `/services`, `/contact`) — use whatever stack deploys fastest and cleanly (Next.js, Astro, or plain static HTML are all fine).
2. Wire the contact form to actually deliver submissions to my email — e.g. via Formspree, Resend, or a small serverless function.
3. Add basic SEO: page titles, meta descriptions, Open Graph tags, and a favicon using the gradient dot from the logo.
4. Confirm responsiveness and basic accessibility (contrast, keyboard focus — groundwork is already in the CSS).
5. Set up deployment (Vercel or Netlify) connected to a GitHub repo.
6. Once live, help me connect a custom domain (not registered yet — see options below).

## Domain — not yet registered
Shortlist to consider, confirm live availability before committing to anything domain-specific in code:
- hbsdigital.ae
- hbsdigital.io
- hbs.digital
- gethbsdigital.com
- hbsai.ae

## Working notes
- I'm not a developer — please explain deployment steps in plain language as you go, and confirm with me before anything irreversible (buying a domain, deploying live, deleting files).
