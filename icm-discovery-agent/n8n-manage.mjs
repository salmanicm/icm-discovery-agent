import https from 'https';

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGYwNjQ2ZC01MjA0LTRjYjgtOWNlZS1hMTZjMTBiZmRjNjkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWIwZTVjMDgtMjQ3NC00NzVhLThhMjEtYjFhMDFlMmZjMGE5IiwiaWF0IjoxNzczMzEzNzM0fQ.hHLXDFHfbMvNPs8GTZekHNpWm9dpT7H5n6vELq5A8yM';

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'babarnawaz.app.n8n.cloud',
      path: '/api/v1' + path,
      headers: { 'X-N8N-API-KEY': KEY },
    };
    https.get(opts, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

function apiPost(path) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'babarnawaz.app.n8n.cloud',
      path: '/api/v1' + path,
      method: 'POST',
      headers: { 'X-N8N-API-KEY': KEY, 'Content-Type': 'application/json' },
    };
    const req = https.request(opts, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
}

const action = process.argv[2] || 'status';

(async () => {
  if (action === 'status') {
    const data = await apiGet('/workflows');
    data.data.filter(w => w.name.includes('iCM')).forEach(w => {
      console.log(w.active ? '✅' : '❌', w.name, `(${w.id})`);
    });
  } else if (action === 'activate') {
    const wfId = process.argv[3];
    if (!wfId) { console.log('Need workflow ID'); process.exit(1); }
    console.log(`Activating ${wfId}...`);
    const res = await apiPost(`/workflows/${wfId}/activate`);
    console.log(`Status: ${res.status}, Active: ${res.body.active}`);
  }
  process.exit(0);
})();
