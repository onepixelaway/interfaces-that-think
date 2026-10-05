import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import * as compose from '../dist/compose-core.js';
import { createDiagnostics } from '../dist/diagnostics.js';

const DUMMY_KEY = 'sk-test-not-a-real-key';
const LEGACY_KEY = 'smart-writer.openai-api-key';
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));

// Execute the real entry points with a small DOM and fake transport. Imports are
// supplied below so the tests need neither a browser dependency nor network access.
function page({ evaluation = false, data = new Map(), blocked = false, connect } = {}) {
  const html = source(evaluation ? '../eval/index.html' : '../dist/index.html');
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
  const elements = new Map();
  const listeners = new Map();
  const writes = [];
  const reads = [];
  const clients = [];
  function element(id) {
    assert.ok(ids.has(id), `Missing element #${id}`);
    if (!elements.has(id)) {
      const events = new Map();
      elements.set(id, {
        value: '',
        innerText: '',
        innerHTML: '',
        textContent: '',
        dataset: {},
        hidden: true,
        disabled: false,
        open: false,
        addEventListener: (type, callback) => events.set(type, callback),
        dispatch: type => events.get(type)?.({ preventDefault() {} }),
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
          this.dispatch('close');
        },
        focus() {},
        contains: () => false,
      });
    }
    return elements.get(id);
  }
  const storage = {
    getItem(name) {
      reads.push(name);
      return data.get(name) ?? null;
    },
    setItem(name, value) {
      writes.push([name, value]);
      data.set(name, value);
    },
    removeItem(name) {
      if (blocked) throw new Error('Blocked');
      data.delete(name);
    },
  };
  class Client {
    ready = false;
    keys = [];
    constructor(onStatus) {
      this.onStatus = onStatus;
      clients.push(this);
    }
    async connect(key) {
      this.keys.push(key);
      this.onStatus('connecting');
      if (connect) await connect();
      this.ready = true;
      this.onStatus('ready');
    }
    disconnect() {
      this.ready = false;
      this.onStatus('disconnected');
    }
    cancel() {}
  }
  class Selection {
    cancel() {}
    update() {}
    hideControls() {}
  }
  const context = createContext({
    ...compose,
    createDiagnostics,
    RealtimeCompose: Client,
    SelectionRewrite: Selection,
    SelectionCombine: Selection,
    localStorage: storage,
    sessionStorage: storage,
    document: {
      getElementById: element,
      querySelector: selector => element(selector.slice(1)),
      querySelectorAll: () => [],
      addEventListener() {},
      createRange: () => ({ selectNodeContents() {}, collapse() {} }),
    },
    crypto: { randomUUID: () => 'test-page' },
    location: { hostname: 'localhost' },
    setTimeout,
    clearTimeout,
    performance,
    addEventListener: (type, callback) => listeners.set(type, callback),
    getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    fetch: async () => ({ json: async () => [] }),
    loadModule: async () => ({ ...compose, RealtimeCompose: Client }),
  });
  context.window = context;
  runInContext(source('../dist/key-storage.js').replace('export ', ''), context);
  if (evaluation) element('variant').value = 'candidate';
  const entry = source(evaluation ? '../eval/runner.js' : '../dist/app.js')
    .replace(/^import\s[\s\S]*?from\s+'[^']+';\n/gm, '')
    .replaceAll('import.meta.url', "'test-app.js'")
    .replaceAll('import(', 'loadModule(');
  runInContext(entry, context);
  return {
    element,
    context,
    clients,
    writes,
    reads,
    data,
    pagehide: () => listeners.get('pagehide')?.(),
    async submit() {
      element('api-key').value = DUMMY_KEY;
      element('key-form').onsubmit({ preventDefault() {} });
      await tick();
    },
  };
}

function noPersistedSecrets(p) {
  assert.ok(!p.reads.includes(LEGACY_KEY), 'must not read the legacy secret');
  assert.ok(
    !p.writes.some(([name, value]) => name === LEGACY_KEY || value.includes(DUMMY_KEY)),
    'must not write a primary key to localStorage or sessionStorage',
  );
}

test('startup deletes only the legacy key without loading or connecting with it', () => {
  const p = page({
    data: new Map([
      [LEGACY_KEY, DUMMY_KEY],
      ['unrelated', 'keep'],
    ]),
  });
  assert.equal(p.data.has(LEGACY_KEY), false);
  assert.equal(p.data.get('unrelated'), 'keep');
  assert.equal(p.clients[0].keys.length, 0);
  assert.equal(p.element('api-key').value, '');
  assert.equal(p.element('key-storage-warning').hidden, true);
  noPersistedSecrets(p);
});

test('connect, reopen settings, disconnect and reload never restore or persist a key', async () => {
  const p = page();
  await p.submit();
  assert.deepEqual(p.clients[0].keys, [DUMMY_KEY]);
  assert.equal(p.clients[0].ready, true);
  assert.equal(p.element('api-key').value, '');
  p.element('connect').onclick();
  assert.equal(p.element('api-key').value, '');
  p.element('disconnect').onclick();
  assert.equal(p.clients[0].ready, false);
  assert.equal(p.element('api-key').value, '');
  const reload = page({ data: p.data });
  assert.equal(reload.clients[0].keys.length, 0);
  assert.equal(reload.element('api-key').value, '');
  noPersistedSecrets(p);
  noPersistedSecrets(reload);
});

test('clear key and pagehide clear the field and disconnect', async () => {
  const p = page();
  await p.submit();
  p.element('connect').onclick();
  p.element('api-key').value = DUMMY_KEY;
  p.element('api-key').dispatch('input');
  assert.equal(p.element('forget-key').hidden, false);
  p.element('forget-key').onclick();
  assert.equal(p.element('api-key').value, '');
  assert.equal(p.element('forget-key').hidden, true);
  assert.equal(p.clients[0].ready, false);
  await p.submit();
  p.pagehide();
  assert.equal(p.element('api-key').value, '');
  assert.equal(p.clients[0].ready, false);
  noPersistedSecrets(p);
});

test('failed connections clear input and never save the rejected key', async () => {
  const p = page({
    connect: async () => {
      throw new Error('Rejected');
    },
  });
  await p.submit();
  assert.equal(p.element('api-key').value, '');
  assert.equal(p.element('key-submit').disabled, false);
  assert.equal(p.element('key-error').textContent, 'Rejected');
  noPersistedSecrets(p);
});

test('blocked legacy removal warns without preventing connection or clearing the field', async () => {
  const p = page({ blocked: true, data: new Map([[LEGACY_KEY, DUMMY_KEY]]) });
  assert.equal(p.element('key-storage-warning').hidden, false);
  await p.submit();
  assert.equal(p.clients[0].ready, true);
  p.element('connect').onclick();
  p.element('disconnect').onclick();
  assert.equal(p.element('api-key').value, '');
  assert.equal(p.element('key-storage-warning').hidden, false);
  noPersistedSecrets(p);
  // Some browsers throw when accessing localStorage itself.
  Object.defineProperty(p.context, 'localStorage', {
    get() {
      throw new Error('Blocked');
    },
  });
  assert.equal(runInContext('removeLegacyKey()', p.context), false);
});

test('disconnect during connection prevents a late result from persisting the key or closing the dialog', async () => {
  let reject;
  const p = page({
    connect: () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  });
  await p.submit();
  p.element('disconnect').onclick();
  reject(new Error('Connection cancelled'));
  await tick();
  assert.equal(p.element('api-key').value, '');
  assert.equal(p.element('key-submit').disabled, false);
  assert.equal(p.element('key-dialog').open, true);
  noPersistedSecrets(p);
});

test('evaluation deletes the legacy key and requires a new key for every run', async () => {
  const p = page({
    evaluation: true,
    data: new Map([
      [LEGACY_KEY, DUMMY_KEY],
      ['unrelated', 'keep'],
    ]),
  });
  assert.equal(p.data.has(LEGACY_KEY), false);
  await p.element('run').onclick();
  assert.equal(p.clients.length, 0);
  p.element('api-key').value = DUMMY_KEY;
  await p.element('run').onclick();
  assert.deepEqual(p.clients[0].keys, [DUMMY_KEY]);
  assert.equal(p.clients[0].ready, false);
  assert.equal(p.element('api-key').value, '');
  assert.equal(runInContext('runKey', p.context), '');
  await p.element('run').onclick();
  assert.equal(p.clients.length, 1);
  assert.equal(p.data.get('unrelated'), 'keep');
  noPersistedSecrets(p);
});

test('evaluation clears its key after failure, stop, and pagehide', async () => {
  const failed = page({
    evaluation: true,
    connect: async () => {
      throw new Error('Rejected');
    },
  });
  failed.element('api-key').value = DUMMY_KEY;
  await failed.element('run').onclick();
  assert.equal(runInContext('runKey', failed.context), '');
  assert.equal(failed.element('api-key').value, '');
  noPersistedSecrets(failed);
  for (const leave of [p => p.element('stop').onclick(), p => p.pagehide()]) {
    let finishFetch;
    const p = page({ evaluation: true });
    p.context.fetch = () =>
      new Promise(resolve => {
        finishFetch = resolve;
      });
    p.element('api-key').value = DUMMY_KEY;
    const running = p.element('run').onclick();
    leave(p);
    assert.equal(runInContext('runKey', p.context), '');
    finishFetch({ json: async () => [] });
    await running;
    assert.equal(p.clients.length, 0);
    assert.equal(p.element('api-key').value, '');
    noPersistedSecrets(p);
  }
});

test('evaluation shares only the in-memory run key across baseline and candidate', async () => {
  const p = page({ evaluation: true });
  p.element('variant').value = 'both';
  p.element('api-key').value = DUMMY_KEY;
  await p.element('run').onclick();
  assert.equal(p.clients.length, 2);
  for (const client of p.clients) {
    assert.deepEqual(client.keys, [DUMMY_KEY]);
    assert.equal(client.ready, false);
  }
  assert.equal(runInContext('runKey', p.context), '');
  noPersistedSecrets(p);
});

test('evaluation can run with blocked storage, warns, and reloads without a key', async () => {
  const p = page({ evaluation: true, blocked: true, data: new Map([[LEGACY_KEY, DUMMY_KEY]]) });
  assert.equal(p.element('key-storage-warning').hidden, false);
  p.element('api-key').value = DUMMY_KEY;
  await p.element('run').onclick();
  assert.deepEqual(p.clients[0].keys, [DUMMY_KEY]);
  const reload = page({ evaluation: true, blocked: true, data: p.data });
  assert.equal(reload.element('api-key').value, '');
  await reload.element('run').onclick();
  assert.equal(reload.clients.length, 0);
  noPersistedSecrets(p);
  noPersistedSecrets(reload);
});
