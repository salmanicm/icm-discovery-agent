// Simulate exactly what VAPI sends to the save_progress webhook
async function main() {
  const url = 'https://babarnawaz.app.n8n.cloud/webhook/icm-session-save';

  // This is the exact format VAPI sends for a server tool call
  const vapiPayload = {
    message: {
      type: "tool-calls",
      toolCallList: [
        {
          id: "call_test_123",
          type: "function",
          function: {
            name: "save_progress",
            arguments: {
              current_topic: "facility_overview",
              customer_name: "Test Facility",
              email: "test@example.com"
            }
          }
        }
      ],
      call: {
        id: "test-call-id"
      }
    }
  };

  console.log('Sending VAPI-style request to:', url);
  console.log('Payload:', JSON.stringify(vapiPayload, null, 2));
  console.log();

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vapiPayload),
    });

    console.log('Status:', resp.status);
    console.log('Content-Type:', resp.headers.get('content-type'));

    const text = await resp.text();
    console.log('Response body:', text);

    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      console.log('\nParsed JSON:', JSON.stringify(json, null, 2));

      // Check if it matches VAPI expected format
      if (json.results && json.results[0] && json.results[0].toolCallId) {
        console.log('\n✅ VAPI format is CORRECT!');
        console.log('toolCallId:', json.results[0].toolCallId);
        console.log('result:', json.results[0].result);
      } else {
        console.log('\n❌ Response does NOT match VAPI format!');
        console.log('VAPI expects: { results: [{ toolCallId: "...", result: "..." }] }');
      }
    } catch {
      console.log('\n❌ Response is NOT valid JSON!');
    }
  } catch (e) {
    console.error('Request failed:', e.message);
  }
}

main();
