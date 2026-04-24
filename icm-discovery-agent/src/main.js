/* ═══════════════════════════════════════════════════════
   iCM Discovery Agent — Main Application
   ═══════════════════════════════════════════════════════ */
import './style.css';
import Vapi from '@vapi-ai/web';
import { CONFIG } from './config.js';
import { buildSystemPrompt } from './system-prompt.js';

/* ── Stage Definitions (Change 5) ────────────────────── */
const STAGES = [
  { id: 'intro',       name: 'Introduction',                  keywords: [] },
  { id: 'intake',      name: 'Intake & Enrollment',           keywords: ['intake', 'enrollment', 'admission'] },
  { id: 'service',     name: 'Service Planning & Goals',      keywords: ['service plan', 'isp', 'goals', 'person-centered'] },
  { id: 'medication',  name: 'Medication Administration',     keywords: ['medication', 'emar', 'mar', 'pharmacy'] },
  { id: 'incidents',   name: 'Incident Documentation',        keywords: ['incident', 'incident report'] },
  { id: 'billing',     name: 'Attendance & Billing',          keywords: ['billing', 'medicaid', 'evv', 'attendance'] },
  { id: 'staff',       name: 'Staff & Scheduling',            keywords: ['schedule', 'scheduling', 'staff', 'hr'] },
  { id: 'compliance',  name: 'Compliance & Requirements',     keywords: ['compliance', 'state', 'waiver', 'audit'] },
  { id: 'technology',  name: 'Technology & Pain Points',      keywords: ['software', 'technology', 'system', 'pain point', 'challenge'] },
];

/* ── Utility ────────────────────────────────────────── */
function formatCustomerName(raw) {
  if (!raw) return 'Valued Customer';
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ═══════════════════════════════════════════════════════
   Discovery App Class
   ═══════════════════════════════════════════════════════ */
class DiscoveryApp {
  constructor() {
    /* state */
    this.vapi            = null;
    this.customerName    = '';
    this.customerRaw     = '';
    this.firstName       = '';
    this.lastName        = '';
    this.email           = '';
    this.sessionId       = '';
    this.resumeSession   = false;
    this.lastCompletedStage = '';
    this.currentStage    = 0;
    this.completedStages = new Set();
    this.lastStageChangeTime = 0;
    this.sessionStart    = null;
    this.timerInterval   = null;
    this.elapsedSeconds  = 0;
    this.transcriptLog   = '';
    this.isMuted         = false;
    this.sessionComplete = false;
    this.consentGiven    = false;
    this.consentTimestamp = '';
    this.wakeLock         = null;

    /* DOM refs */
    this.screens         = {};
    this.els             = {};

    this.init();
  }

  /* ── Initialization ─────────────────────────────── */
  init() {
    this.cacheDOM();
    this.parseCustomer();
    this.renderStageChips();
    this.bindEvents();
    this.bindBeforeUnload();
  }

  cacheDOM() {
    this.screens = {
      welcome:  document.getElementById('welcome-screen'),
      micError: document.getElementById('mic-error-screen'),
      session:  document.getElementById('session-screen'),
      thankyou: document.getElementById('thankyou-screen'),
      error:    document.getElementById('error-screen'),
    };
    this.els = {
      customerName:   document.getElementById('customer-name'),
      startBtn:       document.getElementById('start-btn'),
      retryMicBtn:    document.getElementById('retry-mic-btn'),
      retryBtn:       document.getElementById('retry-btn'),
      endBtn:         document.getElementById('end-session-btn'),
      timer:          document.getElementById('session-timer'),
      statusLabel:    document.getElementById('status-label'),
      currentDept:    document.getElementById('current-dept'),
      progressPct:    document.getElementById('progress-pct'),
      stageChips:     document.getElementById('stage-chips'),
      volumeBars:     document.getElementById('volume-bars'),
      sessionBody:    document.querySelector('.session-body'),
      visualizer:     document.getElementById('visualizer-container'),
      thankyouStats:  document.getElementById('thankyou-stats'),
      errorMessage:   document.getElementById('error-message'),
      /* Form */
      inputFirstName: document.getElementById('input-firstname'),
      inputLastName:  document.getElementById('input-lastname'),
      inputEmail:     document.getElementById('input-email'),
      /* Mute */
      muteBtn:        document.getElementById('mute-btn'),
      muteLabel:      document.getElementById('mute-label'),
      micIconOn:      document.getElementById('mic-icon-on'),
      micIconOff:     document.getElementById('mic-icon-off'),
      /* Resume Modal */
      resumeModal:    document.getElementById('resume-modal'),
      resumeName:     document.getElementById('resume-name'),
      resumeContinue: document.getElementById('resume-continue-btn'),
      resumeFresh:    document.getElementById('resume-fresh-btn'),
      /* Consent Modal */
      consentModal:    document.getElementById('consent-modal'),
      consentCheckbox: document.getElementById('consent-checkbox'),
      consentAgreeBtn: document.getElementById('consent-agree-btn'),
    };
  }

  parseCustomer() {
    const params = new URLSearchParams(window.location.search);
    this.customerRaw = params.get('customer') || '';
    this.customerName = formatCustomerName(this.customerRaw);
    this.els.customerName.textContent = this.customerName;
    document.title = `Discovery Session — ${this.customerName} — iCareManager`;
  }

  bindEvents() {
    /* Start button */
    this.els.startBtn.addEventListener('click', () => this.handleStartClick());
    this.els.retryMicBtn.addEventListener('click', () => this.handleStartClick());
    this.els.retryBtn.addEventListener('click', () => this.handleStartClick());
    this.els.endBtn.addEventListener('click', () => this.endSession());

    /* Form validation (Change 1) */
    const validateForm = () => this.validateForm();
    this.els.inputFirstName.addEventListener('input', validateForm);
    this.els.inputLastName.addEventListener('input', validateForm);
    this.els.inputEmail.addEventListener('input', validateForm);

    /* Mute button (Change 4) */
    this.els.muteBtn.addEventListener('click', () => this.toggleMute());

    /* Resume modal (Change 2) */
    this.els.resumeContinue.addEventListener('click', () => this.resumeExistingSession());
    this.els.resumeFresh.addEventListener('click', () => this.startFreshSession());

    /* Consent modal */
    this.els.consentCheckbox.addEventListener('change', () => {
      this.els.consentAgreeBtn.disabled = !this.els.consentCheckbox.checked;
    });
    this.els.consentAgreeBtn.addEventListener('click', () => this.handleConsentAgree());
  }

  /* ── Form Validation (Change 1) ──────────────────── */
  validateForm() {
    const fn = this.els.inputFirstName.value.trim();
    const ln = this.els.inputLastName.value.trim();
    const em = this.els.inputEmail.value.trim();
    const valid = fn.length > 0 && ln.length > 0 && isValidEmail(em);

    this.els.startBtn.disabled = !valid;

    /* Visual feedback on email */
    if (em.length > 0 && !isValidEmail(em)) {
      this.els.inputEmail.classList.add('invalid');
    } else {
      this.els.inputEmail.classList.remove('invalid');
    }
  }

  /* ── Screen Management ──────────────────────────── */
  showScreen(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[name]) {
      this.screens[name].classList.add('active');
    }
  }

  /* ── Handle Start Click (Change 2) ───────────────── */
  async handleStartClick() {
    /* Grab form values */
    this.firstName = this.els.inputFirstName.value.trim();
    this.lastName  = this.els.inputLastName.value.trim();
    this.email     = this.els.inputEmail.value.trim();

    const btnText = this.els.startBtn.querySelector('.btn-text');
    this.els.startBtn.disabled = true;
    btnText.textContent = 'Requesting microphone…';

    /* Check mic permission */
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      console.warn('Mic permission denied:', err);
      this.els.startBtn.disabled = false;
      btnText.textContent = 'Start Discovery Session';
      this.showScreen('micError');
      return;
    }

    /* Show consent modal — session continues after user agrees */
    btnText.textContent = 'Please review consent…';
    this.els.consentCheckbox.checked = false;
    this.els.consentAgreeBtn.disabled = true;
    this.els.consentModal.style.display = 'flex';
  }

  /* ── Consent Handler ──────────────────────────────── */
  async handleConsentAgree() {
    this.els.consentModal.style.display = 'none';
    this.consentGiven = true;
    this.consentTimestamp = new Date().toISOString();

    /* Fire-and-forget: log consent to n8n */
    if (CONFIG.N8N_CONSENT_URL) {
      fetch(CONFIG.N8N_CONSENT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName:    this.customerRaw || this.customerName,
          firstName:       this.firstName,
          lastName:        this.lastName,
          email:           this.email,
          timestamp:       this.consentTimestamp,
          consentVersion:  'iCM-Consent-v1.0-2026',
          sessionId:       this.sessionId || generateUUID(),
        }),
      }).catch(err => console.warn('[Consent] Log failed:', err.message));
    }

    /* Now proceed with resume check */
    const btnText = this.els.startBtn.querySelector('.btn-text');
    btnText.textContent = 'Checking session…';

    if (CONFIG.N8N_RESUME_CHECK_URL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const resp = await fetch(CONFIG.N8N_RESUME_CHECK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.email,
            customerName: this.customerRaw || this.customerName,
            session_id: this.sessionId || '',
          }),
          signal: controller.signal,
          mode: 'cors',
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const text = await resp.text();
          if (text && text.trim().length > 0) {
            try {
              let data = JSON.parse(text);
              /* Handle both array-wrapped and plain object responses */
              if (Array.isArray(data)) data = data[0];
              if (data && data.hasSession === true) {
                this._resumeData = data;
                this.els.resumeName.textContent = this.firstName;
                this.els.resumeModal.style.display = 'flex';
                return;
              }
            } catch (parseErr) {
              console.warn('[Resume] JSON parse failed:', parseErr.message);
            }
          }
        }
      } catch (err) {
        console.warn('[Resume] Check failed, starting fresh:', err.message);
      }
    }

    await this.initVapiSession(false, '', '', '');
  }

  /* ── Resume Modal Handlers (Change 2) ────────────── */
  async resumeExistingSession() {
    this.els.resumeModal.style.display = 'none';
    const data = this._resumeData || {};
    await this.initVapiSession(true, data.lastCompletedStage || '', data.sessionId || '', data.previousTranscript || '');
  }

  async startFreshSession() {
    this.els.resumeModal.style.display = 'none';

    /* Clear saved session (Change 2) */
    if (CONFIG.N8N_SESSION_CLEAR_URL) {
      try {
        await fetch(CONFIG.N8N_SESSION_CLEAR_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: this.email,
            customerName: this.customerRaw || this.customerName,
          }),
        });
      } catch (err) {
        console.warn('[Session] Clear failed:', err.message);
      }
    }

    await this.initVapiSession(false, '', '', '');
  }

  /* ── Initialize Vapi Session ───────────────────────── */
  async initVapiSession(resuming, lastStage, existingSessionId, previousTranscript = '') {
    this.resumeSession = resuming;
    this.lastCompletedStage = lastStage;
    this.sessionId = resuming && existingSessionId ? existingSessionId : generateUUID();

    const btnText = this.els.startBtn.querySelector('.btn-text');
    btnText.textContent = 'Connecting to AI…';

    /* Core metadata (for save_progress and other tools) */
    const metadata = {
      firstName:          this.firstName,
      lastName:           this.lastName,
      email:              this.email,
      customerName:       this.customerRaw || this.customerName,
      resumeSession:      this.resumeSession,
      lastCompletedStage: this.lastCompletedStage,
      sessionId:          this.sessionId,
      consentGiven:       this.consentGiven,
      consentTimestamp:    this.consentTimestamp,
    };

    try {
      this.vapi = new Vapi(CONFIG.VAPI_PUBLIC_KEY);
      this.attachVapiEvents();

      /* ── Build the system prompt with transcript DIRECTLY embedded ── */
      const systemPrompt = buildSystemPrompt({
        firstName:          this.firstName,
        lastName:           this.lastName,
        email:              this.email,
        resumeSession:      resuming,
        lastCompletedStage: lastStage,
        previousTranscript: previousTranscript,
      });

      /* Build assistant overrides — full model config + overridden messages */
      const overrides = {
        metadata,
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          toolIds: [
            '5ba6f6ce-9832-47a5-8bce-d5bf5a1c5a78',
            '3539afb1-dc03-4fbe-b973-e7f23b8d5e97',
            '2d275ee0-1b0d-49dc-9c66-08fc27406351',
            'a2525104-769a-4858-9b3c-b3f895f3f52f',
          ],
          messages: [{ role: 'system', content: systemPrompt }],
        },
      };

      /* Override firstMessage when resuming */
      if (resuming && previousTranscript && previousTranscript.length > 50) {
        overrides.firstMessage =
          `Welcome back, ${this.firstName}! I'm really glad you're back. I have everything from our last conversation right here, so let me quickly recap what we covered and we'll pick up right where we left off.`;
      }

      console.log('[Vapi] Starting session. Resume:', resuming, 'Transcript:', (previousTranscript || '').length, 'chars');
      await this.vapi.start(CONFIG.VAPI_ASSISTANT_ID, overrides);

    } catch (err) {
      console.error('Vapi init error:', err);
      this.els.errorMessage.textContent =
        `Could not connect: ${err?.message || 'Unknown error'}. Please check your internet and try again.`;
      this.showScreen('error');
      this.els.startBtn.disabled = false;
      btnText.textContent = 'Start Discovery Session';
    }
  }

  /* ── End Session ────────────────────────────────── */
  endSession() {
    if (this.vapi) {
      this.vapi.stop();
    }
  }

  /* ── Vapi Event Handlers ────────────────────────── */
  attachVapiEvents() {
    const v = this.vapi;

    v.on('call-start', () => {
      console.log('[Vapi] Call started');
      this.showScreen('session');
      this.startTimer();
      this.setSessionState('idle');
      this.updateStage(0);
      this.acquireWakeLock();
    });

    v.on('call-end', () => {
      console.log('[Vapi] Call ended, transcript length:', this.transcriptLog.length);
      this.stopTimer();
      this.releaseWakeLock();

      if (!this.sessionComplete) {
        /* Early exit — save partial with delay to let transcript finalize */
        setTimeout(() => this.savePartialSession(), 1000);
      }

      this.showThankYou();
    });

    v.on('speech-start', () => {
      this.setSessionState('speaking');
      this.els.statusLabel.textContent = 'AI is speaking…';
    });

    v.on('speech-end', () => {
      this.setSessionState('listening');
      this.els.statusLabel.textContent = 'Listening…';
    });

    v.on('volume-level', (level) => {
      this.updateVolumeBars(level);
    });

    v.on('message', (msg) => {
      this.handleMessage(msg);
    });

    v.on('error', (err) => {
      console.error('[Vapi] Error:', err);
      if (!this.sessionStart) {
        this.els.errorMessage.textContent =
          `Connection error: ${err?.message || 'Unknown error'}. Please try again.`;
        this.showScreen('error');
        this.els.startBtn.disabled = false;
        this.els.startBtn.querySelector('.btn-text').textContent = 'Start Discovery Session';
      }
    });
  }

  /* ── Session State (speaking / listening / idle) ── */
  setSessionState(state) {
    this.els.sessionBody.classList.remove('speaking', 'listening', 'idle');
    this.els.sessionBody.classList.add(state);
  }

  /* ── Volume Bars ────────────────────────────────── */
  updateVolumeBars(level) {
    const bars = this.els.volumeBars.querySelectorAll('.bar');
    const total = bars.length;
    const mid = total / 2;

    bars.forEach((bar, i) => {
      const dist = Math.abs(i - mid) / mid;
      const h = Math.max(4, level * 36 * (1 - dist * .7) + Math.random() * 4);
      bar.style.height = `${h}px`;
    });
  }

  /* ── Mute Toggle (Change 4) ──────────────────────── */
  toggleMute() {
    this.isMuted = !this.isMuted;

    if (this.vapi) {
      this.vapi.setMuted(this.isMuted);
    }

    /* Update button visuals */
    this.els.muteBtn.classList.toggle('muted', this.isMuted);
    this.els.micIconOn.style.display  = this.isMuted ? 'none' : 'block';
    this.els.micIconOff.style.display = this.isMuted ? 'block' : 'none';
    this.els.muteLabel.textContent    = this.isMuted ? 'Muted' : 'Unmuted';

    /* Pause visualizer animation when muted */
    this.els.visualizer.classList.toggle('muted', this.isMuted);
  }

  /* ── Wake Lock — Keep Screen On During Session ────── */
  async acquireWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[WakeLock] Screen wake lock acquired');
        this.wakeLock.addEventListener('release', () => {
          console.log('[WakeLock] Screen wake lock released');
        });
      } catch (err) {
        console.warn('[WakeLock] Could not acquire:', err.message);
      }
    } else {
      console.warn('[WakeLock] Wake Lock API not supported on this browser');
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }

  /* ── Message Handler ────────────────────────────── */
  handleMessage(msg) {
    console.log('[Vapi] Message:', msg.type, msg);

    /* Accumulate transcript */
    if (msg.type === 'transcript') {
      const text = msg.transcript || msg.text || '';
      const isFinal = msg.transcriptType === 'final' || msg.isFinal;
      if (text && isFinal) {
        const role = msg.role === 'assistant' ? 'Agent' : 'Customer';
        this.transcriptLog += `${role}: ${text}\n`;
        console.log('[Transcript]', role, ':', text);

        /* Only detect stage transitions from ASSISTANT messages */
        if (msg.role === 'assistant') {
          this.detectStage(text);
        }

        /* Detect session completion (Change 7) */
        this.detectCompletion(text);
      }
    }

    /* Also capture conversation-update messages if available */
    if (msg.type === 'conversation-update' && msg.conversation) {
      this.lastConversation = msg.conversation;
    }
  }

  /* ── Stage Detection (Change 5 — Robust) ───────────
     Only advance ONE stage at a time, strictly sequential.
     Requires EITHER:
       a) A transition phrase + 1 keyword match, OR
       b) 2+ keyword matches without transition phrase
     Plus a 60-second debounce between transitions.
     Only processes ASSISTANT messages (filtered upstream).
     ───────────────────────────────────────────────────── */
  detectStage(text) {
    const lower = text.toLowerCase();

    /* Only check if the NEXT sequential stage is starting */
    const nextIdx = this.currentStage + 1;
    if (nextIdx >= STAGES.length) return; // already on last stage

    /* Debounce: require at least 60 seconds between stage transitions */
    const now = Date.now();
    if (now - this.lastStageChangeTime < 60000) return;

    /* Check for transition phrases that signal a topic change */
    const transitionPhrases = [
      "let's move on", "let's talk about", "let's discuss",
      "moving on to", "now i'd like to ask", "now let's",
      "next topic", "next area", "the next thing",
      "before we move on", "let me ask you about",
      "i want to ask about", "let's shift to",
      "now i want to", "let's turn to",
    ];
    const hasTransition = transitionPhrases.some(p => lower.includes(p));

    /* Count keyword matches for the next stage */
    const nextStage = STAGES[nextIdx];
    let score = 0;
    nextStage.keywords.forEach(kw => {
      if (lower.includes(kw)) score++;
    });

    /* Advance if: transition phrase + 1 keyword, OR 2+ keywords alone */
    const shouldAdvance = (hasTransition && score >= 1) || score >= 2;

    if (shouldAdvance) {
      this.lastStageChangeTime = now;
      /* Mark current stage as completed (green + tick) */
      this.completedStages.add(this.currentStage);
      /* Advance to the next stage */
      this.updateStage(nextIdx);
      console.log(`[Stage] Advanced to stage ${nextIdx}: ${nextStage.name} (transition: ${hasTransition}, keywords: ${score})`);
    }
  }

  /* ── Detect Session Completion (Change 7) ────────── */
  detectCompletion(text) {
    const lower = text.toLowerCase();

    const hasClosing =
      (lower.includes('be in touch with you very soon') || lower.includes('thank you so much for your time today'))
      && lower.includes('on behalf of the icaremanager team');

    if (hasClosing && !this.sessionComplete) {
      this.sessionComplete = true;
      console.log('[Session] Completion phrase detected');

      /* Mark all stages complete */
      for (let i = 0; i < STAGES.length; i++) {
        this.completedStages.add(i);
      }
      this.updateStageUI();

      /* Send completion webhook (Change 7) */
      this.sendSessionComplete();
    }
  }

  /* ── Stage UI ────────────────────────────────────── */
  updateStage(index) {
    this.currentStage = index;
    const stage = STAGES[index];
    if (stage) {
      this.els.currentDept.textContent = stage.name;
    }
    this.updateStageUI();
  }

  updateStageUI() {
    const completed = this.completedStages.size;
    const total = STAGES.length;
    /* Include the active stage as "in progress" so % is never stuck at 0 */
    const pct = Math.round(((completed + 1) / total) * 100);
    this.els.progressPct.textContent = `${Math.min(pct, 100)}%`;
    this.lastCompletedStage = STAGES[Math.max(0, ...this.completedStages, this.currentStage)]?.id || '';

    /* Update chips — strict: only green if in completedStages set */
    const chips = this.els.stageChips.querySelectorAll('.stage-chip');
    chips.forEach((chip, i) => {
      chip.classList.remove('active', 'completed');
      if (this.completedStages.has(i)) {
        chip.classList.add('completed');
      } else if (i === this.currentStage) {
        chip.classList.add('active');
      }
      /* Future stages remain unstyled (default muted appearance) */
    });
  }

  renderStageChips() {
    this.els.stageChips.innerHTML = STAGES.map((stage, i) =>
      `<span class="stage-chip" data-idx="${i}">
        <span class="chip-check">✓</span>
        ${stage.name}
      </span>`
    ).join('');
  }

  /* ── Timer ──────────────────────────────────────── */
  startTimer() {
    this.sessionStart = Date.now();
    this.elapsedSeconds = 0;
    this.els.timer.textContent = '00:00';
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.sessionStart) / 1000);
      this.els.timer.textContent = formatTime(this.elapsedSeconds);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /* ── Before Unload — Save Partial (Change 6) ────── */
  bindBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      if (this.sessionStart && !this.sessionComplete) {
        this.savePartialSession();
      }
    });
  }

  savePartialSession() {
    if (!CONFIG.N8N_SESSION_SAVE_URL || this.sessionComplete) return;

    let transcript = this.transcriptLog;
    if (!transcript && this.lastConversation) {
      transcript = this.lastConversation
        .map(m => `${m.role === 'assistant' ? 'Agent' : 'Customer'}: ${m.content}`)
        .join('\n');
    }

    const payload = {
      customerName:       this.customerRaw || this.customerName,
      email:              this.email,
      firstName:          this.firstName,
      lastName:           this.lastName,
      sessionId:          this.sessionId,
      transcript:         transcript || '',
      lastCompletedStage: this.lastCompletedStage,
      sessionComplete:    false,
    };

    console.log('[Session] Saving partial session:', {
      email: payload.email,
      name: payload.customerName,
      transcriptLength: (payload.transcript || '').length,
    });

    const url = CONFIG.N8N_SESSION_SAVE_URL;
    const jsonStr = JSON.stringify(payload);

    /* Method 1: fetch with CORS, then no-cors fallback */
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStr,
    })
      .then(resp => console.log('[Session] Partial save via fetch:', resp.status))
      .catch(() => {
        console.log('[Session] Fetch failed, trying no-cors...');
        fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: jsonStr,
        })
          .then(() => console.log('[Session] Saved via no-cors fetch'))
          .catch(err => console.error('[Session] All fetch methods failed:', err));
      });

    /* Method 2: sendBeacon as backup */
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      console.log('[Session] Also sent via sendBeacon');
    } catch (e) {
      console.warn('[Session] sendBeacon failed:', e);
    }
  }

  /* ── Send Session Complete (Change 7) ────────────── */
  async sendSessionComplete() {
    const url = CONFIG.N8N_SESSION_COMPLETE_URL;
    if (!url) {
      console.warn('[Webhook] No completion URL configured');
      return;
    }

    let transcript = this.transcriptLog;
    if (!transcript && this.lastConversation) {
      transcript = this.lastConversation
        .map(m => `${m.role === 'assistant' ? 'Agent' : 'Customer'}: ${m.content}`)
        .join('\n');
    }

    const now = new Date().toISOString();
    const startTime = this.sessionStart
      ? new Date(this.sessionStart).toISOString()
      : now;

    const payload = {
      type: 'end-of-call-report',
      transcript: transcript || 'Transcript not captured — check Vapi dashboard for full transcript.',
      call: {
        id: this.sessionId,
        startedAt: startTime,
        endedAt: now,
        metadata: {
          customer: this.customerRaw || this.customerName,
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
        },
      },
      customerName:       this.customerRaw || this.customerName,
      firstName:          this.firstName,
      lastName:           this.lastName,
      email:              this.email,
      sessionId:          this.sessionId,
      call_duration_minutes: Math.ceil(this.elapsedSeconds / 60),
      departments_covered:  this.completedStages.size,
      session_date:         new Date().toISOString().split('T')[0],
      sessionComplete:      true,
    };

    console.log('[Webhook] Sending completion payload:', payload);

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('[Webhook] Completion response:', resp.status);
    } catch (err) {
      console.warn('[Webhook] Completion error, trying no-cors:', err.message);
      try {
        await fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
        });
        console.log('[Webhook] Sent via no-cors mode');
      } catch (err2) {
        console.error('[Webhook] Failed completely:', err2);
      }
    }
  }

  /* ── Thank You ──────────────────────────────────── */
  showThankYou() {
    const mins = Math.ceil(this.elapsedSeconds / 60);
    const depts = Math.max(this.completedStages.size, 1);

    this.els.thankyouStats.innerHTML = `
      <div class="stat">
        <span class="stat-value">${mins}</span>
        <span class="stat-label">Minutes</span>
      </div>
      <div class="stat">
        <span class="stat-value">${depts}</span>
        <span class="stat-label">Departments</span>
      </div>
    `;

    this.showScreen('thankyou');
  }
}

/* ── Boot ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  new DiscoveryApp();
});
