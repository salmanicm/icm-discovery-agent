# iCM SIM Agent — MASTER CONTEXT
> **Saved**: April 20, 2026 — 4:04 PM PKT
> **Purpose**: Complete brain dump for Antigravity AI to resume from exactly this point.

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Scale of the Project](#2-scale-of-the-project)
3. [Technology Stack & Architecture](#3-technology-stack--architecture)
4. [Project Structure (Planned)](#4-project-structure-planned)
5. [Database Schema (Firestore)](#5-database-schema-firestore)
6. [Integrations & Data Sources](#6-integrations--data-sources)
7. [Screen-by-Screen UI Specification](#7-screen-by-screen-ui-specification)
8. [Core Features](#8-core-features)
9. [Build Phases — Ordered Delivery Plan](#9-build-phases--ordered-delivery-plan)
10. [Current Status & Next Steps](#10-current-status--next-steps)

---

## 1. PROJECT OVERVIEW

The **iCM SIM Agent** is an intelligent, AI-powered platform that serves as the primary brain behind every customer implementation at iCareManager. It combines 5 roles — SIM Copilot, Project Manager, Workflow Administrator, Business Analyst, and Accountability Engine — into a single unified tool deployed entirely on Google Cloud.

**Important Note**: This is a completely separate project from the `iCM Discovery Agent` and `iCM SI Dashboard`. It uses React + Firebase + Cloud Run rather than Vanilla JS.

---

## 2. SCALE OF THE PROJECT

| Metric | Count | Details |
|---|---|---|
| Screens to build | 6 | SIM Dashboard, SIM Portal, PO Dashboard, PO Portal, Admin Dashboard, Admin Settings |
| Integrations | 7 | Google Drive, Asana, Jira, Teachable, Google Chat Spaces, Gmail API, Vertex AI/Anthropic |
| Alert triggers | 13 | Health drops, recording missed, stalled tickets, champion inactive |
| Quick prompts | 17 | Before Call, After Call, Check-in Anytime |
| Hard gates | 4 | Setup complete, workflow sign-off, go-live checklist, close confirmation |
| Build phases | 5 | Foundation, Intelligence, PO/Comms, Monitoring, Leadership/Performance |
| Firestore collections | 8 | customers, users, chatHistory, communicationLog, scopeChangeLog, alerts, llmConfig, agentSettings |

---

## 3. TECHNOLOGY STACK & ARCHITECTURE

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router v6
- **State**: React Context + Firestore onSnapshot
- **Styling**: Vanilla CSS (tokens: #1A56A0, Outfit font, 12px radius)
- **Icons**: Lucide React
- **Hosting**: Firebase Hosting

### Backend Stack (Google Cloud)
- **API**: Cloud Run (Node.js/Express)
- **Database**: Firestore (NoSQL)
- **Auth**: Firebase Auth / Google Identity Platform (@icaremanager.com domain lock)
- **Background Jobs**: Cloud Functions (post-call summary, alerts)
- **Scheduling**: Cloud Scheduler (reports, pulse checks)
- **AI**: Vertex AI (Gemini 1.5 Pro) + Anthropic API via LLM Router

---

## 4. PROJECT STRUCTURE (PLANNED)

The project will be built in `C:\Users\Adminicm\.gemini\antigravity\scratch\icm-sim-agent\`:
- `frontend/` (React SPA)
- `backend/` (Cloud Run API + LLM Router)
- `functions/` (Cloud Functions)
- `firestore.rules`

---

## 5. DATABASE SCHEMA (FIRESTORE)

1. **customers**: Profile, auth lists, assignments, health score, workflow signoff status
2. **users**: Admin, SIM, PO access levels
3. **chatHistory**: Gemini conversaton history by customer
4. **communicationLog**: Outbound communication approval state
5. **scopeChangeLog**: Captured scope changes from transcript/chat
6. **alerts**: Active triggers per customer
7. **llmConfig**: Model router configuration (primary, fallback, ticket writing models)
8. **agentSettings**: Global system prompts, score weights, and thresholds

---

## 6. INTEGRATIONS & DATA SOURCES

1. **Google Drive API**: Folder linked at setup, triggers functions on new Gemini call transcript
2. **Asana API**: Project linked at setup, reads completion status + overdue count
3. **Jira API**: Tickets linked via URL, pulls status for accountability / tickets in progress
4. **Teachable API**: Courses assigned, syncs completions by email
5. **iCM Knowledge Base**: Admin uploads docs, Gemini indexes them for workflow mapping
6. **Google Chat Spaces API**: Pulls internal discussion logs between SIM/Tech

---

## 7. SCREEN-BY-SCREEN UI SPECIFICATION

1. **SIM Dashboard**: View active vs implemented customers, health score, recording status.
2. **SIM Customer Portal**: Three zones: Top Info, Center Chat Console, Right Live Stats (Gauge, Asana stats, Accountability).
3. **PO Dashboard**: Summary stats and card grid showing ticket status for all customers.
4. **PO Customer Portal**: Left panel tracks Jira context/scope logs. Right panel is PO Ticket Writing Assistant.
5. **Admin Dashboard**: Full portfolio view of active implementations, accountability flags, SIM management.
6. **Agent Settings**: Configuration for System Prompts, health scores, alert thresholds, and the LLM Model Switcher.

---

## 8. CORE FEATURES

1. **Customer Setup Form**: Requires 13 fields (including Google Drive folder, Asana Project, and Meet Link). Hard Gate block until filled.
2. **Chat Console**: Quick prompt pills (e.g., "Prep me for today's call") which scan Asana, Jira and past transcripts.
3. **Workflow Map Generator**: Agent produces signed docs from voice transcripts. Implementation blocked until signoff.
4. **Post-Call Auto Summary**: Analyzes dropped transcript files automatically to list decisions/action items.
5. **Go-Live Readiness Checklist**: 8 checkpoints required before closing implementation.
6. **Biweekly Executive Report**: Auto-generated report held for SIM review before dispatch to clients via Gmail API.

---

## 9. BUILD PHASES — ORDERED DELIVERY PLAN

**Phase 1 — Foundation (Build First)**
> Google Cloud Setup, React SPA Scaffold, Design System, LLM Router API, basic integrations (Drive + Asana), SIM/PO Dashboard outlines.

**Phase 2 — Intelligence Layer**
> Health Score recalculation, Alert Evaluator, internal tracker, post-call summary function, Quick Prompt bindings.

**Phase 3 — Protection, PO & Comm Layer**
> Workflow generator, scope change logging, Jira integration, PO Ticket Assist, Biweekly reports.

**Phase 4 — Monitoring, Lifecycle & Model Base**
> Manual review vs auto email, Close implementation gates, Pulse check, Teachable integration.

**Phase 5 — Leadership & Performance Layer**
> Admin dashboards, comprehensive settings, logging visibility.

---

## 10. CURRENT STATUS & NEXT STEPS

- The **Build plan** and **interactive wireframes** have been received and analyzed (`C:\Users\Adminicm\.gemini\antigravity\scratch\icm-sim-agent-plan.txt` and `C:\Users\Adminicm\.gemini\antigravity\brain\11245519-c821-4f23-8ca7-e51dc1a7ed82\implementation_plan.md`).
- Awaiting user confirmation to begin **Phase 1** scaffolding and provisioning the Google Cloud (Firebase) project.
- **Action Required**: User must confirm they have a GCP project ready or authorize Firebase project creation before scaffolding begins.
