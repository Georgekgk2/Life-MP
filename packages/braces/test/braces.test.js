'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const braces = require('../index.js');
const { MAX_NESTING_DEPTH } = require('../lib/constants.js');

test('expands valid nested brace alternatives', () => {
  assert.deepEqual(braces.expand('{a,{b,c}}'), ['a', 'b', 'c']);
});

test('preserves brace expansion at the configured nesting limit', () => {
  let pattern = '{a,b}';
  for (let depth = 2; depth <= MAX_NESTING_DEPTH; depth += 1) {
    pattern = `{${pattern},value-${depth}}`;
  }

  const expanded = braces.expand(pattern);
  assert.equal(expanded.length, MAX_NESTING_DEPTH + 1);
  assert.ok(expanded.includes('a'));
  assert.ok(expanded.includes('b'));
  assert.ok(expanded.includes(`value-${MAX_NESTING_DEPTH}`));
});

test('returns over-deep patterns literally through compile and expand APIs', () => {
  const pattern = '{'.repeat(4500) + 'a' + '}'.repeat(4500);

  assert.equal(pattern.length, 9001);
  assert.deepEqual(braces(pattern), [pattern]);
  assert.deepEqual(braces(pattern, { expand: true }), [pattern]);
  assert.equal(braces.compile(pattern), pattern);
  assert.deepEqual(braces.expand(pattern), [pattern]);
});

test('bounds other recursively nested parser blocks as well', () => {
  const depth = MAX_NESTING_DEPTH + 1;
  const pattern = '('.repeat(depth) + 'x' + ')'.repeat(depth);

  assert.equal(braces.compile(pattern), pattern);
});
