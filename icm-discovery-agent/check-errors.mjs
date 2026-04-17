import { writeFileSync } from 'fs';
const h = {
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM',
  'Content-Type': 'application/json'
};
const WF_ID = 'iwi2iZ8mUFFNslnD';

async function main() {
  // Get the Email Respondent node details & fix it
  const r = await fetch(`https://babarnawaz.app.n8n.cloud/api/v1/workflows/${WF_ID}`, { headers: h });
  const wf = await r.json();

  const emailNode = wf.nodes.find(n => n.name === 'Email Respondent');
  const emailSI = wf.nodes.find(n => n.name === 'Email SI Manager');
  const saveSheet = wf.nodes.find(n => n.name === 'Save to Sheet');

  writeFileSync('email-nodes.json', JSON.stringify({
    emailRespondent: emailNode?.parameters,
    emailRespondentCredentials: emailNode?.credentials,
    emailSIManager: emailSI?.parameters,
    emailSIManagerCredentials: emailSI?.credentials,
    saveToSheet: saveSheet?.parameters,
  }, null, 2));
  
  console.log('Written to email-nodes.json');
  
  // Also check execution 3119 (Save test)
  const r2 = await fetch('https://babarnawaz.app.n8n.cloud/api/v1/executions/3119?includeData=true', { headers: h });
  const d2 = await r2.json();
  console.log('\nExecution 3119 (Save test):');
  const runData = d2.data?.resultData?.runData;
  if (runData) {
    for (const [nodeName, runs] of Object.entries(runData)) {
      for (const run of runs) {
        if (run.error) {
          console.log(`❌ "${nodeName}":`, run.error.message?.substring(0, 200));
        } else {
          console.log(`✅ "${nodeName}"`);
        }
      }
    }
  }
  if (d2.data?.resultData?.error) {
    console.log('TOP ERROR:', d2.data.resultData.error.message?.substring(0, 300));
  }
}

main();
