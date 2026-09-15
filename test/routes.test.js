'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

test('package.json advertises a webapp with icon', () => {
  const pkg = require('../package.json')
  assert.ok(pkg.keywords.includes('signalk-webapp'))
  assert.equal(pkg.signalk.appIcon, 'icon.png')
  assert.equal(pkg.signalk.displayName, 'Naviop')
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'icon.png')), true)
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'logo.png')), true)
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'HandsetCond.ttf')), true)
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'public', 'index.html')), true)
})

test('index.js exposes status GET and switch GET on the readonly API', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8')
  assert.match(src, /plugin\.signalKApiRoutes/)
  assert.match(src, /router\.get\('\/signalk-naviop-plugin\/status'/)
  assert.match(src, /router\.get\('\/signalk-naviop-plugin\/switches\/:nr\/:state'/)
  assert.match(src, /plugin\.registerWithRouter/)
  assert.match(src, /write\.put\('\/switches\/:nr'/)
})
