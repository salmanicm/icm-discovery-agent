/**
 * Test all 4 webhooks
 */
import https from 'https';

function webhookCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'babarnawaz.app.n8n.cloud',
      path: '/webhook/' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // Test 1: Consent
  console.log('=== Test 1: Consent Capture ===');
  const r1 = await webhookCall('POST', 'icm-consent', {
    customerName: 'TestOrg',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    timestamp: new Date().toISOString(),
    consentVersion: 'iCM-Consent-v1.0-2026',
    sessionId: 'test-session-001',
  });
  console.log(`  Status: ${r1.status}`);
  console.log(`  Body: ${r1.body.substring(0, 200)}`);

  // Test 2: Add Customer
  console.log('\n=== Test 2: Add Customer ===');
  const r2 = await webhookCall('POST', 'icm-add-customer', {
    customerOrgName: 'Harmony Health Services',
    pmName: 'Sarah Johnson',
    pmEmail: 'sarah@harmonyhhealth.com',
    siManagerEmail: 'babar@icaremanager.com',
  });
  console.log(`  Status: ${r2.status}`);
  console.log(`  Body: ${r2.body.substring(0, 300)}`);

  // Test 3: Get Customers
  console.log('\n=== Test 3: Get Customers ===');
  const r3 = await webhookCall('GET', 'icm-get-customers');
  console.log(`  Status: ${r3.status}`);
  console.log(`  Body: ${r3.body.substring(0, 500)}`);

  // Test 4: Get Consent Log
  console.log('\n=== Test 4: Get Consent Log ===');
  const r4 = await webhookCall('GET', 'icm-get-consent-log');
  console.log(`  Status: ${r4.status}`);
  console.log(`  Body: ${r4.body.substring(0, 500)}`);

  console.log('\n=== All tests complete! ===');
  process.exit(0);
})();
