'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const naviop127501Fields = require('../lib/pgn-127501')

function swMap (on) {
  return function swOn (n) { return on[n] || 0 }
}

function fuseMap (ok) {
  return function fuseOk (n) { return ok[n] == null ? 1 : ok[n] }
}

test('missing fuses stay On; off switches stay Off', () => {
  var f = naviop127501Fields(swMap({}), fuseMap({}), 1)
  assert.equal(f.pgn, 127501)
  assert.equal(f.Instance, 1)
  assert.equal(f.Indicator1, 0)
  assert.equal(f.Indicator2, 0)
  assert.equal(f.Indicator3, 0)
  assert.equal(f.Indicator4, 1)
  assert.equal(f.Indicator5, 0)
  assert.equal(f.Indicator6, 1)
  assert.equal(f.Indicator7, 0)
  assert.equal(f.Indicator8, 1)
})

test('Starlink S3 is Indicator5 and Internet S4 is Indicator7', () => {
  var f = naviop127501Fields(swMap({ 3: 1, 4: 1 }), fuseMap({}), 1)
  assert.equal(f.Indicator5, 1)
  assert.equal(f.Indicator7, 1)
  assert.equal(f.Indicator1, 0)
  assert.equal(f.Indicator4, 1)
})
