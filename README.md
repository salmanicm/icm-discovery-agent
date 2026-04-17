# iCareManager — AI Discovery Agent & SI Manager Dashboard

## What This Project Does

iCareManager (iCM) is an **AI-powered onboarding system** designed for healthcare and human services organizations. It automates the discovery process when a new customer organization signs up for iCareManager's software platform.

### The Problem It Solves

When a new customer organization (e.g., a home care agency, behavioral health provider, or disability services company) signs up for iCareManager, the **System Implementation (SI) Manager** needs to:

1. Understand the customer's current workflows across 9 departments
2. Identify pain points and technology gaps
3. Gather compliance requirements specific to their state/programs
4. Collect consent from each department head before recording their session

Previously, this was done through **manual phone calls and spreadsheets** — taking 2-3 hours per customer with inconsistent data collection.

### What This System Delivers

This project replaces that manual process with a **fully automated, AI-driven discovery pipeline** that produces:

---

## Outputs & Results

### 1. Personalized Discovery Links
When an SI Manager adds a new customer through the dashboard, the system generates a **unique onboarding link** like:
```
https://onboarding.icaremanager.com/?customer=SunriseCareServices
```
This link is sent to the customer's Project Manager (PM) who distributes it to their department heads.

### 2. AI Voice Discovery Sessions
Each department head opens their link and has a **natural conversation with an AI agent** (powered by Vapi AI) that covers 9 operational areas:

| Stage | Topics Covered |
|---|---|
| Introduction | Organization overview, role, responsibilities |
| Intake & Enrollment | Admission workflows, referral sources, documentation |
| Service Planning & Goals | ISP creation, person-centered planning, goal tracking |
| Medication Administration | eMAR, pharmacy integration, medication protocols |
| Incident Documentation | Incident reporting, investigation, follow-up |
| Attendance & Billing | EVV, Medicaid billing, attendance tracking |
| Staff & Scheduling | HR workflows, shift management, credential tracking |
| Compliance & Requirements | State regulations, waiver programs, audit prep |
| Technology & Pain Points | Current software, challenges, desired improvements |

**Output**: A complete transcript of the discovery conversation, session duration, and progress through all 9 stages — stored in Google Sheets for the SI Manager to review.

### 3. Legal Consent Records
Before each session begins, the system captures **legally compliant consent** that includes:

| Data Captured | Example |
|---|---|
| Timestamp | Apr 9, 2026 at 3:45 PM |
| Customer Organization | Sunrise Care Services |
| Respondent Name | Jane Smith |
| Email | jane@sunrisecare.com |
| Session ID | a3f7b2c1-... |
| Consent Version | iCM-Consent-v1.0-2026 |
| IP Address | 110.93.249.138 |

**Output**: A searchable, filterable, exportable (CSV) consent log that serves as an audit trail proving informed consent was obtained from every session participant.

### 4. Customer Management Dashboard
The SI Manager Dashboard provides a real-time operational view:

#### Customers Page
- **Add Customer Form**: Create a new customer, auto-generate their discovery link
- **Customer Table**: View all customers with session counts, copy links, manage records
- **Search & Filter**: Find customers instantly by name

#### Consent Log Page
- **3 Summary Stats**: Total Consents, Unique Customers, Consents Today
- **Full Consent Table**: Every consent record with timestamp, name, email, session ID
- **Filters**: Search by name/email, filter by date range
- **CSV Export**: One-click download of filtered consent data for compliance reporting

#### Account Page
- SI Manager profile, role display, sign-out

### 5. Session Analytics (Per Customer)
For each customer organization, the system tracks:
- **Number of discovery sessions completed** (visible in the Customers table)
- **Which department heads have participated** (via consent log)
- **Session progress** through all 9 stages (real-time during the call)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SI MANAGER DASHBOARD                             │
│  (admin.icaremanager.com)                                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Customers   │  │ Consent Log  │  │   Account    │             │
│  │  Page        │  │ Page         │  │   Page       │             │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘             │
│         │                  │                                        │
└─────────┼──────────────────┼────────────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      n8n WEBHOOK LAYER                              │
│                                                                     │
│  POST /icm-add-customer     → Create customer + generate link      │
│  GET  /icm-get-customers    → Fetch all customers from sheet       │
│  POST /icm-consent          → Log consent record                   │
│  GET  /icm-get-consent-log  → Fetch consent records (filterable)   │
│                                                                     │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      GOOGLE SHEETS (Database)                       │
│                                                                     │
│  Tab: Customers    → Customer Name, Link, PM, SI Manager, Sessions │
│  Tab: Consent Log  → Timestamp, Name, Email, Session ID, IP, etc.  │
│  Tab: Sheet1       → Live session data from Vapi AI calls          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                    AI DISCOVERY AGENT                                │
│  (onboarding.icaremanager.com/?customer=CustomerName)               │
│                                                                     │
│  1. Customer PM opens unique link                                   │
│  2. Enters name + email                                             │
│  3. Reviews & accepts legal consent                                 │
│  4. AI voice agent conducts 9-stage discovery interview             │
│  5. Real-time progress tracking with stage indicators               │
│  6. Session data saved to Google Sheets                             │
│                                                                     │
│  Powered by: Vapi AI (voice) + n8n (webhooks) + Google Sheets      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Business Value

| Metric | Before (Manual) | After (This System) |
|---|---|---|
| Time per discovery | 2-3 hours of phone calls | 20-30 min AI session |
| Data consistency | Varies by SI Manager | Standardized 9-stage framework |
| Consent tracking | Paper forms / emails | Digital audit trail with export |
| Customer visibility | Spreadsheet tracking | Real-time dashboard |
| Scalability | 1 customer at a time | Unlimited parallel sessions |
| Session resumption | Start over if interrupted | Auto-resume from last stage |

---

## Quick Start

### Agent Page (Discovery Session)
```bash
cd icm-discovery-agent
npm install
npm run dev          # → http://localhost:5173
npx vite build       # → dist/ folder for deployment
```

### SI Manager Dashboard
```bash
cd icm-si-dashboard
npm install
npm run dev          # → http://localhost:5174
npx vite build       # → dist/ folder for deployment
```

### Test n8n Webhooks
```bash
cd icm-discovery-agent
node test-webhooks.mjs
```

### Redeploy n8n Workflows
```bash
cd icm-discovery-agent
node fix-workflows.mjs
```

---

## Deployment

| App | Testing (Netlify) | Production (Google Cloud) |
|---|---|---|
| Agent Page | gleeful-daifuku-4f5fa6.netlify.app | onboarding.icaremanager.com |
| Dashboard | sunny-valkyrie-957472.netlify.app | admin.icaremanager.com |

**Current status**: Testing on Netlify. Production deployment to Google Cloud (Firebase Hosting) is planned.

---

## Project Structure
```
iCM-Project/
├── icm-discovery-agent/         ← AI Voice Discovery Agent
│   ├── src/
│   │   ├── config.js            ← Vapi + n8n settings
│   │   ├── main.js              ← DiscoveryApp class (723 lines)
│   │   └── style.css            ← Dark glassmorphism theme
│   ├── index.html               ← Main HTML with consent modal
│   ├── dist/                    ← Production build output
│   ├── docs/build-guide.txt     ← Full requirements specification
│   ├── fix-workflows.mjs        ← n8n workflow deployment script
│   └── test-webhooks.mjs        ← Webhook verification script
│
├── icm-si-dashboard/            ← SI Manager Dashboard
│   ├── src/
│   │   ├── config.js            ← n8n webhook URLs + auth config
│   │   ├── main.js              ← Dashboard logic (routing, CRUD)
│   │   └── style.css            ← Dashboard dark theme
│   ├── index.html               ← Login + 3-page SPA
│   └── dist/                    ← Production build output
│
└── README.md                    ← This file
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend (Agent) | Vanilla JavaScript + Vite |
| Frontend (Dashboard) | Vanilla JavaScript + Vite |
| AI Voice Engine | Vapi AI |
| Workflow Automation | n8n Cloud |
| Database | Google Sheets |
| Authentication | Google SSO (planned) |
| Hosting (Testing) | Netlify |
| Hosting (Production) | Google Cloud / Firebase Hosting (planned) |

---

## Key APIs & Services

- **n8n Cloud**: `babarnawaz.app.n8n.cloud` — Webhook orchestration
- **Google Sheets**: Serves as the database for customers, consent logs, and session data
- **Vapi AI**: Powers the voice-based discovery interviews
- **Google SSO**: Planned for dashboard authentication (only @icaremanager.com accounts)
