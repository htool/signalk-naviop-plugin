'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { SWITCH_TITLES, panelSnapshot } = require('../lib/webapp-panel')

test('Loop S titles match loopse.xml switch captions', () => {
  assert.equal(SWITCH_TITLES[1], 'VHF auto follow')
  assert.equal(SWITCH_TITLES[2], 'Instrument display')
  assert.equal(SWITCH_TITLES[3], 'Starlink')
  assert.equal(SWITCH_TITLES[4], 'Internet')
  assert.equal(SWITCH_TITLES[5], 'Boiler')
  assert.equal(SWITCH_TITLES[6], 'Dehumidifier')
  assert.equal(SWITCH_TITLES[7], 'Reboot Teltonika')
  assert.equal(SWITCH_TITLES[8], 'Restart SignalK')
})

test('panelSnapshot uses boatnet-style paths and live state', () => {
  const snap = panelSnapshot({
    options: {
      naviop: {
        bank: 1,
        switches: {
          1: 'electrical.naviop.switches.1.state',
          2: 'electrical.switches.instrumentpanel.state',
          3: 'electrical.switches.starlink.state'
        }
      }
    },
    digiSwitch: {
      1: {
        switches: {
          1: { path: 'electrical.naviop.switches.1.state', state: 0 },
          2: { path: 'electrical.switches.instrumentpanel.state', state: 0 },
          3: { path: 'electrical.switches.starlink.state', state: 1 }
        }
      }
    }
  })
  assert.equal(snap.started, true)
  assert.equal(snap.switches.length, 3)
  assert.equal(snap.switches[0].title, 'VHF auto follow')
  assert.equal(snap.switches[0].state, 0)
  assert.equal(snap.switches[1].path, 'electrical.switches.instrumentpanel.state')
  assert.equal(snap.switches[2].state, 1)
  assert.equal(snap.switches[2].title, 'Starlink')
})

test('panelSnapshot maps online to on', () => {
  const snap = panelSnapshot({
    options: {
      naviop: {
        bank: 1,
        switches: { 4: 'network.providers.starlink.status' }
      }
    },
    digiSwitch: {
      1: {
        switches: {
          4: { path: 'network.providers.starlink.status', state: 'online' }
        }
      }
    }
  })
  assert.equal(snap.switches[0].title, 'Internet')
  assert.equal(snap.switches[0].state, 1)
})
