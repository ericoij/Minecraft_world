const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');

const {
  ValidationError,
  createApp,
  parseSliders,
  sanitizeEntry,
  sliderDefinitions
} = require('../server');

const completeSliders = (overrides = {}) =>
  Object.fromEntries(sliderDefinitions.map(({ id }) => [id, overrides[id] ?? 5]));

const request = async (app, path, options) => {
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
    const body = await response.json();
    return { response, body };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
};

test('parseSliders returns numeric values for every configured slider', () => {
  const parsed = parseSliders(completeSliders({ mood: '7', anxiety: 2 }));

  assert.equal(Object.keys(parsed).length, sliderDefinitions.length);
  assert.equal(parsed.mood, 7);
  assert.equal(parsed.anxiety, 2);
});

test('parseSliders rejects missing and out-of-range slider values', () => {
  assert.throws(() => parseSliders({}), ValidationError);
  assert.throws(
    () => parseSliders(completeSliders({ mood: 11 })),
    /Overall Mood must be between 0 and 10/
  );
});

test('sanitizeEntry exposes only API-safe fields', () => {
  assert.deepEqual(
    sanitizeEntry({
      _id: 'entry-1',
      recordedAt: '2026-01-01T00:00:00.000Z',
      sliders: { mood: 8 },
      internal: 'hidden'
    }),
    {
      id: 'entry-1',
      recordedAt: '2026-01-01T00:00:00.000Z',
      sliders: { mood: 8 }
    }
  );
});

test('GET /api/sliders returns configured slider definitions', async () => {
  const fakeDb = { find: async () => [], insert: async () => undefined };
  const { response, body } = await request(createApp(fakeDb), '/api/sliders');

  assert.equal(response.status, 200);
  assert.equal(body.sliders.length, sliderDefinitions.length);
  assert.deepEqual(body.sliders[0], sliderDefinitions[0]);
});

test('GET /api/entries returns entries sorted by recordedAt and sanitized', async () => {
  const first = {
    _id: 'first',
    recordedAt: '2026-01-01T00:00:00.000Z',
    sliders: completeSliders(),
    secret: true
  };
  const second = {
    _id: 'second',
    recordedAt: '2026-01-02T00:00:00.000Z',
    sliders: completeSliders({ mood: 9 })
  };
  const fakeDb = { find: async () => [second, first], insert: async () => undefined };

  const { response, body } = await request(createApp(fakeDb), '/api/entries');

  assert.equal(response.status, 200);
  assert.deepEqual(
    body.map((entry) => entry.id),
    ['first', 'second']
  );
  assert.equal(body[0].secret, undefined);
});

test('POST /api/entries validates, stores, and returns a sanitized entry', async () => {
  let inserted;
  const fakeDb = {
    find: async () => [],
    insert: async (entry) => {
      inserted = entry;
      return { _id: 'new-entry', ...entry, privateField: 'hidden' };
    }
  };
  const sliders = completeSliders({ mood: '8' });

  const { response, body } = await request(createApp(fakeDb), '/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sliders, recordedAt: '2026-02-03T04:05:06Z' })
  });

  assert.equal(response.status, 201);
  assert.deepEqual(inserted, {
    sliders: completeSliders({ mood: 8 }),
    recordedAt: '2026-02-03T04:05:06.000Z'
  });
  assert.deepEqual(body, {
    id: 'new-entry',
    sliders: completeSliders({ mood: 8 }),
    recordedAt: '2026-02-03T04:05:06.000Z'
  });
});

test('POST /api/entries returns 400 for invalid request bodies', async () => {
  const fakeDb = { find: async () => [], insert: async () => undefined };
  const { response, body } = await request(createApp(fakeDb), '/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sliders: completeSliders(), recordedAt: 'not-a-date' })
  });

  assert.equal(response.status, 400);
  assert.deepEqual(body, { error: 'Invalid recordedAt timestamp' });
});
