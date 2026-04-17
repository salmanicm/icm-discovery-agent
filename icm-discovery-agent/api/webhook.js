// Vercel Serverless Function — proxies webhook to Google Apps Script (bypasses CORS)
export default async function handler(req, res) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Google Apps Script URL — update this after deploying the script
  const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      redirect: 'follow', // Google Apps Script redirects
    });

    const data = await response.text();
    console.log('Webhook response:', response.status, data);
    res.status(200).json({ success: true, forwarded: true });
  } catch (err) {
    console.error('Webhook proxy error:', err);
    res.status(500).json({ error: 'Failed to forward webhook', details: err.message });
  }
}
