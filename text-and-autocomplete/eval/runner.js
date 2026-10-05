// The evaluation page accepts its own key; it never loads an editor credential.
import { removeLegacyKey } from '../key-storage.js';
const keyInput = document.querySelector('#api-key');
const cleanLegacyKey = () => {
  document.querySelector('#key-storage-warning').hidden = removeLegacyKey();
};
cleanLegacyKey();
const run = document.querySelector('#run');
const stop = document.querySelector('#stop');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
status.textContent = 'Runner loaded';
let client;
let runKey = '';
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
  runKey = '';
  client?.disconnect();
  keyInput.value = '';
  cleanLegacyKey();
};
window.addEventListener('pagehide', () => stop.onclick());
run.onclick = async () => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return;
  runKey = keyInput.value.trim();
  keyInput.value = '';
  keyInput.disabled = true;
  run.disabled = true;
  stop.disabled = false;
  stopped = false;
  const report = { date: new Date().toISOString(), cases: [] };
  try {
    if (!runKey.startsWith('sk-') || runKey.length < 20)
      throw new Error('Enter an OpenAI API key for this run.');
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
      if (stopped) break;
      client = new transport.RealtimeCompose(() => {});
      await client.connect(runKey);
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
    runKey = '';
    keyInput.value = '';
    keyInput.disabled = false;
    client?.disconnect();
    run.disabled = false;
    stop.disabled = true;
  }
};
