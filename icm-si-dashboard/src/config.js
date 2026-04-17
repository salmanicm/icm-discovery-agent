/**
 * iCM SI Manager Dashboard — Configuration
 */
export const CONFIG = {
  /* ── Google OAuth ──────────────────────────── */
  GOOGLE_CLIENT_ID:        '570876990120-7np9ldk35faa5b4j2vtlg008lp0gbst9.apps.googleusercontent.com',
  GOOGLE_REDIRECT_URI:     'https://initialdiscovery.icaremanager.com/auth/callback',

  /* ── n8n Webhooks ──────────────────────────── */
  N8N_ADD_CUSTOMER_URL:    'https://babarnawaz.app.n8n.cloud/webhook/icm-add-customer',
  N8N_GET_CUSTOMERS_URL:   'https://babarnawaz.app.n8n.cloud/webhook/icm-get-customers',
  N8N_GET_CONSENT_LOG_URL: 'https://babarnawaz.app.n8n.cloud/webhook/icm-get-consent-log',

  /* ── Security ──────────────────────────────── */
  N8N_SECRET:              'icm-si-dashboard-secret-2026',

  /* ── Branding ──────────────────────────────── */
  APP_NAME:                'iCareManager SI Dashboard',
  SUPPORT_EMAIL:           'support@icaremanager.com',
};
