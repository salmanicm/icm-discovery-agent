// Get detailed VAPI tool config for save_progress
async function main() {
  const VAPI_KEY = '12b9bbd8-c4f5-4ff7-8157-ccf3feaf9cac';
  const toolId = '3539afb1-dc03-4fbe-b973-e7f23b8d5e97'; // save_progress

  const resp = await fetch(`https://api.vapi.ai/tool/${toolId}`, {
    headers: { 'Authorization': `Bearer ${VAPI_KEY}` }
  });
  const tool = await resp.json();
  console.log(JSON.stringify(tool, null, 2));
}

main().catch(e => console.error(e));
