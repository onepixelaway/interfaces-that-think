import test from 'node:test';
import assert from 'node:assert/strict';
import { FEATURES, FeatureSwitches } from '../dist/features.js';

class MemoryStorage {
  constructor(entries = {}) {
    this.data = new Map(Object.entries(entries));
  }
  getItem(key) {
    return this.data.get(key) ?? null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
}
const KEY = 'reading-long-form.features';
function idea(id, on, log) {
  return {
    id,
    label: id,
    on,
    start(context) {
      log.push(`start ${id} ${context.name}`);
      return () => log.push(`stop ${id}`);
    },
  };
}

test('every registered idea has a unique id, a label, and a start function', () => {
  assert.equal(new Set(FEATURES.map(feature => feature.id)).size, FEATURES.length);
  for (const feature of FEATURES) {
    assert.equal(typeof feature.id, 'string');
    assert.equal(typeof feature.label, 'string');
    assert.equal(typeof feature.start, 'function');
  }
});

test('ideas start from their defaults, and saved choices override them', () => {
  const log = [];
  const features = [idea('a', true, log), idea('b', false, log), idea('c', true, log)];
  const storage = new MemoryStorage({ [KEY]: JSON.stringify({ b: true, c: false }) });
  const switches = new FeatureSwitches(features, { name: 'ctx' }, { storage });
  switches.startAll();
  assert.deepEqual(log, ['start a ctx', 'start b ctx']);
  assert.deepEqual(
    features.map(feature => switches.isOn(feature.id)),
    [true, true, false],
  );
});

test('switching an idea starts or stops it once and remembers the choice', () => {
  const log = [];
  const storage = new MemoryStorage();
  const switches = new FeatureSwitches([idea('a', false, log)], { name: 'ctx' }, { storage });
  switches.startAll();
  assert.equal(switches.set('a', true), true);
  assert.equal(switches.set('a', true), true);
  assert.equal(switches.set('a', false), false);
  assert.deepEqual(log, ['start a ctx', 'stop a']);
  assert.deepEqual(JSON.parse(storage.getItem(KEY)), { a: false });
  assert.equal(switches.set('missing', true), false);
});

test('an idea that fails to start stays off and is reported; failed stops are reported too', () => {
  const errors = [];
  const switches = new FeatureSwitches(
    [
      {
        id: 'broken',
        label: 'Broken',
        start() {
          throw new Error('nope');
        },
      },
      {
        id: 'messy',
        label: 'Messy',
        start: () => () => {
          throw new Error('cleanup');
        },
      },
      { id: 'plain', label: 'Plain', start() {} },
    ],
    {},
    { onError: (feature, error) => errors.push([feature.id, error.message]) },
  );
  assert.equal(switches.set('broken', true), false);
  assert.equal(switches.set('messy', true), true);
  assert.equal(switches.set('messy', false), false);
  assert.equal(switches.set('plain', true), true);
  assert.equal(switches.set('plain', false), false);
  assert.deepEqual(errors, [
    ['broken', 'nope'],
    ['messy', 'cleanup'],
  ]);
});

test('blocked or corrupt storage never stops the switches from working', () => {
  const blocked = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  const log = [];
  const switches = new FeatureSwitches(
    [idea('a', true, log)],
    { name: 'ctx' },
    { storage: blocked },
  );
  switches.startAll();
  assert.equal(switches.set('a', false), false);
  const corrupt = new MemoryStorage({ [KEY]: '{not json' });
  const again = new FeatureSwitches([idea('a', true, log)], { name: 'ctx' }, { storage: corrupt });
  again.startAll();
  assert.equal(again.isOn('a'), true);
});

test('turning on an idea turns off the ideas it cannot run with, in either direction', () => {
  const log = [];
  const storage = new MemoryStorage();
  const features = [
    idea('fade', true, log),
    { ...idea('collapse', false, log), excludes: ['fade'] },
    idea('other', true, log),
  ];
  const switches = new FeatureSwitches(features, { name: 'ctx' }, { storage });
  switches.startAll();
  assert.equal(switches.set('collapse', true), true);
  assert.equal(switches.isOn('fade'), false);
  assert.equal(switches.isOn('other'), true);
  assert.equal(switches.set('fade', true), true);
  assert.equal(switches.isOn('collapse'), false);
  assert.deepEqual(JSON.parse(storage.getItem(KEY)), { fade: true, collapse: false });
  assert.deepEqual(log, [
    'start fade ctx',
    'start other ctx',
    'stop fade',
    'start collapse ctx',
    'stop collapse',
    'start fade ctx',
  ]);
});

test('an idea with a parent runs only while the parent is on, and keeps its choice', () => {
  const log = [];
  const storage = new MemoryStorage();
  const features = [
    idea('collapse', false, log),
    { ...idea('summary', true, log), parent: 'collapse' },
  ];
  const switches = new FeatureSwitches(features, { name: 'ctx' }, { storage });
  switches.startAll();
  assert.equal(switches.isOn('summary'), false);
  assert.equal(switches.available('summary'), false);
  assert.equal(switches.wants('summary'), true);
  assert.equal(switches.set('summary', true), false);
  switches.set('collapse', true);
  assert.equal(switches.isOn('summary'), true);
  switches.set('collapse', false);
  assert.equal(switches.isOn('summary'), false);
  assert.equal(switches.wants('summary'), true);
  switches.set('collapse', true);
  switches.set('summary', false);
  switches.set('collapse', false);
  switches.set('collapse', true);
  assert.equal(switches.isOn('summary'), false);
  assert.deepEqual(log, [
    'start collapse ctx',
    'start summary ctx',
    'stop summary',
    'stop collapse',
    'start collapse ctx',
    'start summary ctx',
    'stop summary',
    'stop collapse',
    'start collapse ctx',
  ]);
});

test('turning a parent off by a conflict stops its children too', () => {
  const log = [];
  const features = [
    idea('fade', false, log),
    { ...idea('collapse', true, log), excludes: ['fade'] },
    { ...idea('summary', true, log), parent: 'collapse' },
  ];
  const switches = new FeatureSwitches(features, { name: 'ctx' });
  switches.startAll();
  switches.set('fade', true);
  assert.deepEqual(
    ['fade', 'collapse', 'summary'].map(id => switches.isOn(id)),
    [true, false, false],
  );
  assert.deepEqual(log.slice(-3), ['stop summary', 'stop collapse', 'start fade ctx']);
});
