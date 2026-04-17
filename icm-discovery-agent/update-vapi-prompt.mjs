#!/usr/bin/env node
// update-vapi-prompt.mjs — Adds resume-with-transcript capability to the Vapi assistant

const VAPI_KEY = '12b9bbd8-c4f5-4ff7-8157-ccf3feaf9cac';
const ASSISTANT_ID = 'db015b68-4aed-4f2b-b0dc-d9e614209ed6';

const RESUME_ADDITION = `

## SESSION RESUME WITH PREVIOUS TRANSCRIPT

If the call metadata contains resumeSession set to true AND a previousTranscript field with actual conversation text:

1. Read the previousTranscript carefully before your first response. This contains the EXACT conversation from the customer's prior session.
2. Identify which departments and topics were already discussed by analyzing the transcript content.
3. DO NOT repeat any questions that were already asked and answered in the previous transcript.
4. Greet the customer warmly: 'Welcome back, [firstName]! I am glad you are back. I have everything from our last conversation right here.'
5. Briefly summarize what was covered: 'Last time we discussed [list specific topics from the transcript]. You shared some really helpful details about [mention one specific thing they said].'
6. Continue from the NEXT uncovered department or topic — skip directly to it.
7. Use information already gathered — reference their previous answers naturally. For example: 'You mentioned earlier that your intake team uses [system name] — so let us move on to how billing works.'
8. If the previous transcript shows the conversation ended mid-topic, resume that exact topic and ask the remaining questions.
9. IMPORTANT: Never tell the customer you are reading a transcript. Make it feel like a natural continuation, as if you remember the conversation personally.
10. The previousTranscript uses the format 'Agent: ...' and 'Customer: ...' for each speaker turn.
`;

async function main() {
  console.log('Fetching current assistant...');
  const getResp = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    headers: { 'Authorization': `Bearer ${VAPI_KEY}` }
  });
  
  if (!getResp.ok) {
    console.error('Fetch failed:', getResp.status, await getResp.text());
    return;
  }
  
  const assistant = await getResp.json();
  const currentPrompt = assistant.model.messages[0].content;
  
  // Check if already updated
  if (currentPrompt.includes('SESSION RESUME WITH PREVIOUS TRANSCRIPT')) {
    console.log('✅ Already updated! Resume transcript instructions are present.');
    return;
  }
  
  console.log('Current prompt length:', currentPrompt.length);
  const updatedPrompt = currentPrompt + RESUME_ADDITION;
  console.log('Updated prompt length:', updatedPrompt.length);
  
  console.log('Updating assistant...');
  const patchResp = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: {
        ...assistant.model,
        messages: [{ role: 'system', content: updatedPrompt }]
      }
    })
  });
  
  if (patchResp.ok) {
    console.log('✅ Vapi assistant prompt updated successfully!');
    console.log('   Resume-with-transcript capability added.');
  } else {
    const err = await patchResp.text();
    console.error('❌ Update failed:', patchResp.status, err);
  }
}

main().catch(err => console.error('Error:', err));
