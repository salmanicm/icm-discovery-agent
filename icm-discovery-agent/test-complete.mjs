// Simulate a session complete webhook call with real-like data
async function testComplete() {
  console.log('Testing Session Complete webhook...\n');
  
  const payload = {
    type: 'end-of-call-report',
    transcript: 'Agent: Hi Babar, welcome to Eye Care Manager...\nCustomer: We are a mid-size organization...',
    call: {
      id: 'test-session-' + Date.now(),
      startedAt: new Date(Date.now() - 300000).toISOString(),
      endedAt: new Date().toISOString(),
      metadata: {
        customer: 'TestOrg',
        firstName: 'Babar',
        lastName: 'Test',
        email: 'babar@icaremanager.com',
      },
    },
    customerName: 'TestOrg',
    firstName: 'Babar',
    lastName: 'Test',
    email: 'babar@icaremanager.com',
    sessionId: 'test-session-' + Date.now(),
    call_duration_minutes: 5,
    departments_covered: 3,
    session_date: new Date().toISOString().split('T')[0],
    sessionComplete: true,
  };

  console.log('Payload:', JSON.stringify(payload, null, 2).substring(0, 500));
  
  try {
    const resp = await fetch('https://babarnawaz.app.n8n.cloud/webhook/icm-session-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    console.log('\nResponse status:', resp.status);
    const text = await resp.text();
    console.log('Response body:', text.substring(0, 500));
  } catch (err) {
    console.log('ERROR:', err.message);
  }
  
  // Wait a bit, then check execution
  console.log('\nWaiting 5s for execution to complete...');
  await new Promise(r => setTimeout(r, 5000));
  
  const h2 = {
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM'
  };
  
  const execResp = await fetch('https://babarnawaz.app.n8n.cloud/api/v1/executions?workflowId=iwi2iZ8mUFFNslnD&limit=3', { headers: h2 });
  const execData = await execResp.json();
  
  console.log('\nLatest executions:');
  execData.data.forEach(e => console.log(e.id, '|', e.status, '|', e.startedAt));
}

testComplete();
