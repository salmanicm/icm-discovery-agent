import { writeFileSync } from 'fs';
const h = {
  'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM'
};

async function main() {
  const r = await fetch('https://babarnawaz.app.n8n.cloud/api/v1/workflows/iwi2iZ8mUFFNslnD', { headers: h });
  const wf = await r.json();

  const completeNodes = [
    'Extract Payload', 'Check Customer Folder', 
    'Check Folder Result', 'Folder Exists?', 'Create Customer Folder',
    'Merge Folder ID', 'Save Transcript File'
  ];

  let output = '';
  for (const name of completeNodes) {
    const node = wf.nodes.find(n => n.name === name);
    if (node) {
      output += `\n=== ${node.name} (${node.type}) ===\n`;
      output += JSON.stringify(node.parameters, null, 2) + '\n';
      if (node.credentials) output += 'Credentials: ' + JSON.stringify(node.credentials) + '\n';
    }
  }
  
  writeFileSync('node-dump.txt', output);
  console.log('Written to node-dump.txt');
}

main();
