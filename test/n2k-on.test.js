'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const n2kOn = require('../lib/n2k-on')

test('n2kOn maps online/offline and 1/0', () => {
  assert.equal(n2kOn('online'), 1)
  assert.equal(n2kOn('ONLINE'), 1)
  assert.equal(n2kOn('offline'), 0)
  assert.equal(n2kOn('Offline'), 0)
  assert.equal(n2kOn('on'), 1)
  assert.equal(n2kOn('off'), 0)
  assert.equal(n2kOn(1), 1)
  assert.equal(n2kOn(0), 0)
  assert.equal(n2kOn('1'), 1)
  assert.equal(n2kOn('0'), 0)
  assert.equal(n2kOn(true), 1)
  assert.equal(n2kOn(false), 0)
})
