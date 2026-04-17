const PUBLIC_KEY = '10ccb59f-e513-44ee-a657-e0d516dfcad3';
const ASSISTANT_ID = 'db015b68-4aed-4f2b-b0dc-d9e614209ed6';
import { writeFileSync } from 'fs';

async function main() {
  let output = '';
  function log(msg) { output += msg + '\n'; console.log(msg); }

  log('=== Test 1: Call with metadata ===');
  const r1 = await fetch('https://api.vapi.ai/call/web', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PUBLIC_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assistantId: ASSISTANT_ID,
      metadata: { firstName: 'Test', lastName: 'User', email: 'test@example.com', customerName: 'TestCo' },
    }),
  });
  log('Status: ' + r1.status);
  log('Body: ' + await r1.text());

  log('\n=== Test 2: Call without metadata ===');
  const r2 = await fetch('https://api.vapi.ai/call/web', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PUBLIC_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ assistantId: ASSISTANT_ID }),
  });
  log('Status: ' + r2.status);
  log('Body: ' + await r2.text());

  writeFileSync('vapi-call-debug.txt', output);
}

main().catch(e => console.error('Fatal:', e));
