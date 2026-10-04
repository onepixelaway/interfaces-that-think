// Served at /eval/ by scripts/dev-server.py, on the editor's local origin, so it
// can read the key the editor saved. The key stays in the browser and is used by
// the same transport as the editor.
import { readSavedKey } from '../key-storage.js';
const run = document.querySelector('#run');
const stop = document.querySelector('#stop');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
status.textContent = 'Runner loaded';
let client;
let stopped = false;
document.querySelector('#save').onclick = async () => {
  try {
    const report = results.textContent;
    const response = await fetch('http://localhost:4176/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: report,
    });
    if (!response.ok) throw new Error('Could not save report');
    status.textContent = 'Saved ' + (await response.text());
  } catch (error) {
    status.textContent = error.message;
  }
};
stop.onclick = () => {
  stopped = true;
  client?.disconnect();
};
run.onclick = async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
  run.disabled = true;
  stop.disabled = false;
  stopped = false;
  const report = { date: new Date().toISOString(), cases: [] };
  try {
    if (!readSavedKey()) throw new Error('Connect the editor first to save a key.');
    const suite = document.querySelector('#suite').value;
    const cases = await fetch(suite === 'holdout' ? './holdout.json' : './cases.json').then(r =>
      r.json(),
    );
    for (const variant of document.querySelector('#variant').value === 'candidate'
      ? ['candidate']
      : ['baseline', 'candidate']) {
      const base = variant === 'baseline' ? './baseline/' : '../';
      let core;
      let transport;
      try {
        core = await import(base + 'compose-core.js?eval=' + Date.now());
        transport = await import(base + 'realtime.js?eval=' + Date.now());
      } catch (error) {
        if (variant === 'baseline') {
          report.missingBaseline = true;
          continue;
        }
        throw error;
      }
      client = new transport.RealtimeCompose(() => {});
      await client.connect(readSavedKey());
      for (const item of cases) {
        if (stopped) break;
        status.textContent = `${variant}: ${item.id}`;
        const started = performance.now();
        let firstVisibleMs = null;
        const row = { variant, ...item };
        try {
          row.raw = await client.request(item, (text, done) => {
            if (
              (done ? core.cleanCompletion : core.previewCompletion)(
                text,
                item.before,
                item.after,
              ) &&
              firstVisibleMs === null
            ) {
              firstVisibleMs = Math.round(performance.now() - started);
            }
          });
          row.suffix = core.cleanCompletion(row.raw, item.before, item.after);
          row.joined = item.before + row.suffix + item.after;
          row.outcome = row.suffix ? 'suggestion' : row.raw ? 'rejected' : 'abstained';
        } catch (error) {
          row.error = error.message;
        }
        row.firstVisibleMs = firstVisibleMs;
        row.totalMs = Math.round(performance.now() - started);
        report.cases.push(row);
        results.textContent = JSON.stringify(report, null, 2);
      }
      client.disconnect();
      if (stopped) break;
    }
    status.textContent = stopped
      ? 'Stopped'
      : report.missingBaseline
        ? 'Complete, without a baseline: eval/baseline/ is empty'
        : 'Complete';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    client?.disconnect();
    run.disabled = false;
    stop.disabled = true;
  }
};
