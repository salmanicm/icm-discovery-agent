# iCM Discovery — Deployment Pipeline
### Manual Deployment Guide for Google Cloud

> **Last Updated:** April 17, 2026
> **Project Path:** `C:\Users\Adminicm\Desktop\N8N Projects\iCM-Project`

---

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD                         │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │  SI Manager Dashboard │  │  AI Discovery Agent      │ │
│  │  initialdiscovery.    │  │  aidiscoveryagent.       │ │
│  │  icaremanager.com     │  │  icaremanager.com        │ │
│  │                       │  │                          │ │
│  │  Source: icm-si-      │  │  Source: icm-discovery-  │ │
│  │  dashboard/dist/      │  │  agent/dist/             │ │
│  └───────────┬───────────┘  └────────────┬─────────────┘ │
│              │                           │               │
└──────────────┼───────────────────────────┼───────────────┘
               │                           │
               ▼                           ▼
       ┌───────────────────────────────────────────┐
       │         n8n Cloud Webhooks                │
       │    babarnawaz.app.n8n.cloud               │
       │                                           │
       │  /webhook/icm-add-customer                │
       │  /webhook/icm-get-customers               │
       │  /webhook/icm-get-consent-log             │
       │  /webhook/icm-session-complete            │
       │  /webhook/icm-resume-check                │
       │  /webhook/icm-session-save                │
       │  /webhook/icm-session-clear               │
       │  /webhook/icm-consent                     │
       └───────────────────┬───────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Google Sheets │
                    │ Google Drive  │
                    │ Gmail         │
                    └──────────────┘
```

---

## 🚀 DEPLOYMENT PIPELINE

### Phase 1 — Pre-Build Checks

```
STEP 1.1 — Verify source files are correct
─────────────────────────────────────────────
□ Open: icm-discovery-agent/src/config.js
  ✓ VAPI_PUBLIC_KEY is set
  ✓ VAPI_ASSISTANT_ID is set
  ✓ All N8N webhook URLs point to babarnawaz.app.n8n.cloud
  ✓ DRIVE_ROOT_FOLDER is correct

□ Open: icm-si-dashboard/src/config.js
  ✓ GOOGLE_CLIENT_ID is set (or will be set later)
  ✓ GOOGLE_REDIRECT_URI = https://initialdiscovery.icaremanager.com/auth/callback
  ✓ All N8N webhook URLs point to babarnawaz.app.n8n.cloud
```

```
STEP 1.2 — Verify n8n workflows are active
─────────────────────────────────────────────
□ Go to: https://babarnawaz.app.n8n.cloud
□ Confirm these workflows are ACTIVE (green toggle):
  ✓ iCM Discovery — All Webhooks      (iwi2iZ8mUFFNslnD)
  ✓ iCM Discovery — Add Customer      (4GYind17YHhUonCW)
  ✓ iCM Discovery — Get Customers     (gKFnnmdYrsM8atNW)
  ✓ iCM Discovery — Consent Capture   (qt0tvH6QSDTcDoMM)
  ✓ iCM Discovery — Get Consent Log   (vAxSLqBvhKbXYkl9)
```

---

### Phase 2 — Build

```
STEP 2.1 — Build Discovery Agent
─────────────────────────────────
□ Open Terminal
□ Run:
    cd "C:\Users\Adminicm\Desktop\N8N Projects\iCM-Project\icm-discovery-agent"
    npm run build

□ Verify output:
    ✓ dist/index.html exists
    ✓ dist/assets/ contains .js and .css files
    ✓ dist/logo-icm.svg exists
    ✓ dist/favicon.svg exists
    ✓ Build completed without errors
```

```
STEP 2.2 — Build SI Dashboard
──────────────────────────────
□ Open Terminal
□ Run:
    cd "C:\Users\Adminicm\Desktop\N8N Projects\iCM-Project\icm-si-dashboard"
    npm run build

□ Verify output:
    ✓ dist/index.html exists
    ✓ dist/assets/ contains .js and .css files
    ✓ dist/favicon.svg exists
    ✓ dist/icons.svg exists
    ✓ Build completed without errors
```

```
STEP 2.3 — Verify no old URLs leaked into builds
──────────────────────────────────────────────────
□ Run this quick check in Terminal:
    node -e "
      const fs = require('fs');
      const dir = 'icm-discovery-agent/dist/assets/';
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
      const js = files.map(f => fs.readFileSync(dir+f,'utf8')).join('');
      console.log('Agent - netlify refs:', js.includes('netlify'));
      const dir2 = 'icm-si-dashboard/dist/assets/';
      const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.js'));
      const js2 = files2.map(f => fs.readFileSync(dir2+f,'utf8')).join('');
      console.log('Dashboard - netlify refs:', js2.includes('netlify'));
    "

□ Expected output:
    Agent - netlify refs: false
    Dashboard - netlify refs: false

⚠️ If either shows "true", DO NOT DEPLOY. Fix the source config first.
```

---

### Phase 3 — Deploy to Google Cloud

```
STEP 3.1 — Deploy Discovery Agent
──────────────────────────────────
□ Go to Google Cloud Console
□ Navigate to your App Engine / Cloud Run / Firebase Hosting
  (whichever service hosts aidiscoveryagent.icaremanager.com)

□ Upload contents of:
    C:\Users\Adminicm\Desktop\N8N Projects\iCM-Project\icm-discovery-agent\dist\

□ Files to upload:
    dist/
    ├── index.html
    ├── favicon.svg
    ├── logo-icm.svg
    └── assets/
        ├── index-XXXXXXXX.js
        └── index-XXXXXXXX.css

□ Verify deployment:
    ✓ Open https://aidiscoveryagent.icaremanager.com
    ✓ Welcome screen loads with iCM logo
    ✓ "Need help?" link visible at bottom
```

```
STEP 3.2 — Deploy SI Dashboard
───────────────────────────────
□ Go to Google Cloud Console
□ Navigate to your App Engine / Cloud Run / Firebase Hosting
  (whichever service hosts initialdiscovery.icaremanager.com)

□ Upload contents of:
    C:\Users\Adminicm\Desktop\N8N Projects\iCM-Project\icm-si-dashboard\dist\

□ Files to upload:
    dist/
    ├── index.html
    ├── favicon.svg
    ├── icons.svg
    ├── _redirects     (Netlify-specific, may not be needed on GCloud)
    └── assets/
        ├── index-XXXXXXXX.js
        └── index-XXXXXXXX.css

□ Verify deployment:
    ✓ Open https://initialdiscovery.icaremanager.com
    ✓ Login screen appears with Google sign-in button
```

---

### Phase 4 — Post-Deploy Verification

```
STEP 4.1 — Test Discovery Agent
────────────────────────────────
□ Open: https://aidiscoveryagent.icaremanager.com/?customer=TestCompany
□ Verify:
    ✓ Welcome screen loads correctly
    ✓ Company name "TestCompany" appears
    ✓ iCM logo displays (not overlapping)
    ✓ "Need help?" link is visible
    ✓ Consent checkbox works
    ✓ "Start Discovery Session" button initiates Vapi call
    ✓ Mic visualizer appears without overlap
    ✓ "End Session" button shows X icon correctly
```

```
STEP 4.2 — Test SI Dashboard
─────────────────────────────
□ Open: https://initialdiscovery.icaremanager.com
□ Verify:
    ✓ Login page loads
    ✓ "Sign in with Google" button appears
    ✓ Google OAuth login works (if Client ID is configured)
    ✓ Customer list loads after login
    ✓ "Generate Link & Create Customer" creates new customer
    ✓ Generated link uses: aidiscoveryagent.icaremanager.com
    ✓ "Copy" button copies the correct link
    ✓ Consent Log page loads
```

```
STEP 4.3 — Test End-to-End Flow
────────────────────────────────
□ Create a new customer in Dashboard
□ Copy the generated discovery link
□ Open the link in an incognito browser
□ Verify:
    ✓ Discovery Agent opens (not the Dashboard)
    ✓ Customer name matches
    ✓ Full voice session works
    ✓ After session ends, data appears in Dashboard
```

---

## 🔧 TROUBLESHOOTING

### "Generated link opens Dashboard instead of Agent"
**Cause:** n8n "Add Customer" workflow has wrong URL
**Fix:** Check the "Build Customer Data" code node in workflow `4GYind17YHhUonCW`
The `fullLink` line must be:
```
const fullLink = 'https://aidiscoveryagent.icaremanager.com/?customer=' + linkParameter;
```

### "Failed to load customers"
**Cause:** n8n "Get Customers" workflow is inactive
**Fix:** Activate workflow `gKFnnmdYrsM8atNW` in n8n

### "Google login doesn't work"
**Cause:** OAuth Client ID not configured
**Fix:** 
1. Create OAuth Client in Google Cloud Console
2. Update `GOOGLE_CLIENT_ID` in `icm-si-dashboard/src/config.js`
3. Rebuild (`npm run build`) and redeploy

### "Session data not saving"
**Cause:** n8n "All Webhooks" workflow inactive
**Fix:** Activate workflow `iwi2iZ8mUFFNslnD` in n8n

### "CORS errors in browser console"
**Cause:** n8n webhook not accepting cross-origin requests
**Fix:** n8n cloud webhooks accept CORS by default — check if the URL is correct

---

## 📂 FILE REFERENCE

```
C:\Users\Adminicm\Desktop\N8N Projects\iCM-Project\
│
├── README.md
│
├── icm-discovery-agent\          ← AI Discovery Agent
│   ├── src\
│   │   ├── config.js             ← Vapi keys + n8n webhook URLs
│   │   ├── main.js               ← Core app logic
│   │   └── style.css             ← All styles
│   ├── public\
│   │   └── logo-icm.svg          ← Official logo
│   ├── index.html                ← Main HTML
│   ├── dist\                     ← ★ DEPLOY THIS to aidiscoveryagent.icaremanager.com
│   └── package.json
│
├── icm-si-dashboard\             ← SI Manager Dashboard
│   ├── src\
│   │   ├── config.js             ← OAuth + n8n webhook URLs
│   │   ├── main.js               ← Dashboard logic
│   │   └── style.css             ← All styles
│   ├── dist\                     ← ★ DEPLOY THIS to initialdiscovery.icaremanager.com
│   └── package.json
```

---

## 🔑 CREDENTIALS REFERENCE

| Service | Key | Location |
|---------|-----|----------|
| Vapi Public Key | `10ccb59f-e513-44ee-a657-e0d516dfcad3` | Agent config.js |
| Vapi Assistant ID | `db015b68-4aed-4f2b-b0dc-d9e614209ed6` | Agent config.js |
| n8n API Key | `eyJhbGciOiJI...` | Used for workflow management only |
| Google Drive Root | `1FgLI7kMbaIfmcq-Az5vEgzOTLkylAmGh` | Agent config.js |
| Google OAuth Client ID | `(to be configured)` | Dashboard config.js |

---

## ⏰ DEPLOYMENT CHECKLIST (Quick Version)

```
□ 1. Verify source configs are correct
□ 2. Run: cd icm-discovery-agent && npm run build
□ 3. Run: cd icm-si-dashboard && npm run build  
□ 4. Verify no old URLs in builds
□ 5. Upload icm-discovery-agent/dist/ → aidiscoveryagent.icaremanager.com
□ 6. Upload icm-si-dashboard/dist/ → initialdiscovery.icaremanager.com
□ 7. Test Discovery Agent loads correctly
□ 8. Test Dashboard loads correctly
□ 9. Test link generation creates correct URL
□ 10. Test end-to-end voice session
```

> **Total deployment time:** ~10 minutes
