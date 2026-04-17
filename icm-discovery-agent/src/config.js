/**
 * iCM Discovery Agent — Configuration
 * ────────────────────────────────────
 * Update these values with your actual keys.
 * Never commit real keys to a public repo.
 */

export const CONFIG = {
  /* ── Vapi ─────────────────────────────────────────── */
  VAPI_PUBLIC_KEY:          '10ccb59f-e513-44ee-a657-e0d516dfcad3',
  VAPI_ASSISTANT_ID:        'db015b68-4aed-4f2b-b0dc-d9e614209ed6',

  /* ── n8n Webhooks ──────────────────────────────────── */
  N8N_SESSION_COMPLETE_URL: 'https://babarnawaz.app.n8n.cloud/webhook/icm-session-complete',
  N8N_RESUME_CHECK_URL:     'https://babarnawaz.app.n8n.cloud/webhook/icm-resume-check',
  N8N_SESSION_SAVE_URL:     'https://babarnawaz.app.n8n.cloud/webhook/icm-session-save',
  N8N_SESSION_CLEAR_URL:    'https://babarnawaz.app.n8n.cloud/webhook/icm-session-clear',
  N8N_CONSENT_URL:          'https://babarnawaz.app.n8n.cloud/webhook/icm-consent',

  /* ── Branding ─────────────────────────────────────── */
  COMPANY_NAME:             'iCareManager',
  SUPPORT_EMAIL:            'support@icaremanager.com',

  /* ── Google Drive ──────────────────────────────────── */
  DRIVE_ROOT_FOLDER:        '1FgLI7kMbaIfmcq-Az5vEgzOTLkylAmGh',
};
