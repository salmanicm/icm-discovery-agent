---
description: How to build and deploy the iCM project (Discovery Agent + SI Dashboard) to production
---

# iCM Project — Build & Deploy Workflow

After making ANY changes to the iCM Discovery Agent or SI Dashboard, always follow these steps to deploy automatically.

## Project Info
- **Repo**: `salmanicm/icm-discovery-agent` on GitHub
- **Branch**: `main`
- **Remote**: `origin`
- **Working directory**: `c:\Users\Adminicm\Desktop\N8N Projects\iCM-Project`
- **Cloud Build**: Triggered automatically on push to `main`
- **Deploys to**: `function-vm` (us-central1-a) → `/var/www/agent/` and `/var/www/dashboard/`

## Steps

// turbo-all

1. If changes are in the **SI Dashboard** (`icm-si-dashboard/`), build first:
```
cd icm-si-dashboard && npm run build
```

2. If changes are in the **Discovery Agent** (`icm-discovery-agent/`), build first:
```
cd icm-discovery-agent && npm run build
```

3. Stage all changed files:
```
git add -A
```

4. Commit with a descriptive message:
```
git commit -m "feat: <brief description of changes>"
```

5. Push to GitHub (triggers Cloud Build auto-deploy):
```
git push origin main
```

## Notes
- Cloud Build picks up the push and deploys both apps to the VM automatically
- Build takes ~5 minutes to complete
- Discovery Agent serves at: `https://onboarding.icaremanager.com`
- SI Dashboard serves at: `https://initialdiscovery.icaremanager.com`
- Always build before pushing — Cloud Build also builds, but local build catches errors early
