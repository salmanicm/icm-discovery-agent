const VAPI_KEY = '12b9bbd8-c4f5-4ff7-8157-ccf3feaf9cac';
const ASSISTANT_ID = 'db015b68-4aed-4f2b-b0dc-d9e614209ed6';
const h = { 'Authorization': `Bearer ${VAPI_KEY}`, 'Content-Type': 'application/json' };

async function main() {
  // Fix: Clear the server.url (not serverUrl)
  console.log('Clearing server.url from assistant...');
  const resp = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({
      server: null,  // Remove entire server object
    }),
  });

  if (resp.ok) {
    const data = await resp.json();
    console.log('✅ Fixed! server:', JSON.stringify(data.server));
    console.log('serverUrl:', JSON.stringify(data.serverUrl));
  } else {
    console.log('Failed (trying alternative):', resp.status, await resp.text());
    
    // Alt: set server URL to empty
    const resp2 = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({
        server: { url: '' },
      }),
    });
    console.log('Alt result:', resp2.status, (await resp2.json()).server);
  }

  // Verify
  const vr = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, { headers: h });
  const a = await vr.json();
  console.log('\nVerification:');
  console.log('  server:', JSON.stringify(a.server));
  console.log('  serverUrl:', JSON.stringify(a.serverUrl));
}

main();
