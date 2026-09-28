'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  switchSpec,
  switchTitle,
  parseSwitchList,
  parseFuseList,
  switchesSchema,
  fusesSchema,
  panelSnapshot
} = require('../lib/webapp-panel')

test('webappLabel is optional; empty falls back to Switch N', () => {
  assert.deepEqual(switchSpec('electrical.switches.starlink.state', 3), {
    nr: 3,
    path: 'electrical.switches.starlink.state',
    webappLabel: '',
    booleanPath: false
  })
  assert.deepEqual(
    switchSpec(
      {
        path: 'electrical.switches.starlink.state',
        webappLabel: 'Starlink',
        booleanPath: true
      },
      3
    ),
    {
      nr: 3,
      path: 'electrical.switches.starlink.state',
      webappLabel: 'Starlink',
      booleanPath: true
    }
  )
  assert.equal(switchTitle(3, { webappLabel: '' }), 'Switch 3')
  assert.equal(switchTitle(3, { webappLabel: 'Starlink' }), 'Starlink')
})

test('schema uses arrays without switch/fuse number fields', () => {
  assert.equal(switchesSchema().type, 'array')
  assert.equal(fusesSchema().type, 'array')
  assert.equal(switchesSchema().items.properties.switch, undefined)
  assert.equal(switchesSchema().items.properties.path.type, 'string')
  assert.equal(switchesSchema().items.properties.booleanPath.type, 'boolean')
  assert.equal(fusesSchema().items.properties.fuse, undefined)
  assert.equal(fusesSchema().items.properties.path.type, 'string')
})

test('pathValue writes 0/1 or true/false', () => {
  const { pathValue } = require('../lib/webapp-panel')
  assert.equal(pathValue(1, false), 1)
  assert.equal(pathValue(0, false), 0)
  assert.equal(pathValue(1, true), true)
  assert.equal(pathValue(0, true), false)
})

test('parseSwitchList uses list position as channel and accepts legacy objects', () => {
  const fromArray = parseSwitchList([
    { path: 'c.state', webappLabel: 'Starlink' },
    { path: 'a.state', webappLabel: 'VHF' }
  ])
  assert.deepEqual(
    fromArray.map((s) => ({ nr: s.nr, label: s.webappLabel })),
    [
      { nr: 1, label: 'Starlink' },
      { nr: 2, label: 'VHF' }
    ]
  )
  const fromObject = parseSwitchList({
    2: { path: 'b.state' },
    1: 'a.state'
  })
  assert.deepEqual(
    fromObject.map((s) => s.nr),
    [1, 2]
  )
})

test('parseFuseList uses list position as channel', () => {
  const fromArray = parseFuseList([
    { path: 'electrical.naviop.fuses.2.state' },
    { path: 'network.providers.starlink.status' }
  ])
  assert.deepEqual(
    fromArray.map((f) => ({ nr: f.nr, path: f.path })),
    [
      { nr: 1, path: 'electrical.naviop.fuses.2.state' },
      { nr: 2, path: 'network.providers.starlink.status' }
    ]
  )
})

test('panelSnapshot uses array order for channel and webapp', () => {
  const snap = panelSnapshot({
    options: {
      naviop: {
        bank: 1,
        switches: [
          { path: 'electrical.switches.starlink.state', webappLabel: 'Starlink' },
          { path: 'electrical.naviop.switches.1.state', webappLabel: 'VHF auto follow' },
          { path: 'electrical.switches.instrumentpanel.state' }
        ]
      }
    },
    digiSwitch: {
      1: {
        switches: {
          1: { path: 'electrical.switches.starlink.state', state: 1 },
          2: { path: 'electrical.naviop.switches.1.state', state: 0 },
          3: { path: 'electrical.switches.instrumentpanel.state', state: 0 }
        }
      }
    }
  })
  assert.equal(snap.started, true)
  assert.deepEqual(
    snap.switches.map((s) => ({ nr: s.nr, title: s.title, state: s.state })),
    [
      { nr: 1, title: 'Starlink', state: 1 },
      { nr: 2, title: 'VHF auto follow', state: 0 },
      { nr: 3, title: 'Switch 3', state: 0 }
    ]
  )
})

test('panelSnapshot maps online to on', () => {
  const snap = panelSnapshot({
    options: {
      naviop: {
        bank: 1,
        switches: [
          { path: 'network.providers.starlink.status', webappLabel: 'Internet' }
        ]
      }
    },
    digiSwitch: {
      1: {
        switches: {
          1: { path: 'network.providers.starlink.status', state: 'online' }
        }
      }
    }
  })
  assert.equal(snap.switches[0].title, 'Internet')
  assert.equal(snap.switches[0].nr, 1)
  assert.equal(snap.switches[0].state, 1)
})
