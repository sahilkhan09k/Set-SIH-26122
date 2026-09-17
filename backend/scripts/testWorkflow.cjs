const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

async function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function run() {
  console.log('--- 1. Clear database ---');
  await req({ hostname: 'localhost', port: 5000, path: '/api/schedule/activities', method: 'DELETE' });
  await req({ hostname: 'localhost', port: 5000, path: '/api/reports/clear', method: 'DELETE' });

  console.log('--- 2. Upload XER schedule ---');
  const xerPath = path.resolve(__dirname, '../../demo_files/Refinery_Phase2_Schedule.xer');
  const xerData = fs.readFileSync(xerPath);
  const boundary = crypto.randomBytes(16).toString('hex');
  const h1 = Buffer.from([
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="Refinery_Phase2_Schedule.xer"',
    'Content-Type: application/octet-stream',
    '',
    ''
  ].join('\r\n'));
  const f1 = Buffer.from(`\r\n--${boundary}--\r\n`);
  const xerBody = Buffer.concat([h1, xerData, f1]);
  const xerRes = await req({
    hostname: 'localhost', port: 5000, path: '/api/schedule/upload', method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': xerBody.length }
  }, xerBody);
  console.log('XER imported:', xerRes.data);

  console.log('--- 3. Upload & Process DPR Excel ---');
  const xlsxPath = path.resolve(__dirname, '../../demo_files/Supervisor_DPR_Today.xlsx');
  const xlsxData = fs.readFileSync(xlsxPath);
  const b2 = crypto.randomBytes(16).toString('hex');
  const h2 = Buffer.from([
    `--${b2}`,
    'Content-Disposition: form-data; name="file"; filename="Supervisor_DPR_Today.xlsx"',
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '',
    ''
  ].join('\r\n'));
  const f2 = Buffer.from(`\r\n--${b2}--\r\n`);
  const xlsxBody = Buffer.concat([h2, xlsxData, f2]);
  const upRes = await req({
    hostname: 'localhost', port: 5000, path: '/api/reports/upload', method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${b2}`, 'Content-Length': xlsxBody.length }
  }, xlsxBody);
  console.log('Uploaded doc:', upRes.data);

  const procRes = await req({
    hostname: 'localhost', port: 5000, path: '/api/reports/process', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ document_id: upRes.data.document_id }));
  console.log('Processed:', procRes.data);

  console.log('--- 4. Verify completed activities in schedule ---');
  const acts = await req({ hostname: 'localhost', port: 5000, path: '/api/schedule/activities', method: 'GET' });
  const completed = acts.data.filter(a => a.status === 'COMPLETE');
  console.log('Completed count:', completed.length);
  completed.forEach(a => console.log('  ✓', a.activityCode, '|', a.name, '| Start:', a.actualStart?.slice(0,10), '| Finish:', a.actualFinish?.slice(0,10)));

  console.log('--- 5. Test approving a NEEDS_REVIEW match ---');
  const matches = await req({ hostname: 'localhost', port: 5000, path: '/api/matches', method: 'GET' });
  const needsReview = matches.data.find(m => m.decision === 'NEEDS_REVIEW');
  if (needsReview) {
    console.log('Approving match:', needsReview.id, needsReview.scheduleActivity.activityCode);
    const appRes = await req({
      hostname: 'localhost', port: 5000, path: `/api/matches/${needsReview.id}/approve`, method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ reason: 'Planner confirmed field progress.' }));
    console.log('Approve result:', appRes.data);

    const actsAfter = await req({ hostname: 'localhost', port: 5000, path: '/api/schedule/activities', method: 'GET' });
    const newlyCompleted = actsAfter.data.find(a => a.id === needsReview.scheduleActivityId);
    console.log('Newly completed status:', newlyCompleted?.status, '| Finished:', newlyCompleted?.actualFinish?.slice(0,10));
  }

  console.log('--- 6. Test Time Agent Query: "What works where completed today" ---');
  const timeRes = await req({
    hostname: 'localhost', port: 5000, path: '/api/time-agent', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ message: 'What works where completed today' }));
  console.log('\n================ TIME AGENT RESPONSE ================\n');
  console.log(timeRes.data.reply);
  console.log('\n====================================================\n');
}

run().catch(console.error);
