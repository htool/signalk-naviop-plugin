'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  switchSpec,
  switchTitle,
  switchConfigSchema,
  panelSnapshot
} = require('../lib/webapp-panel')

test('webappLabel is optional; empty falls back to Switch N', () => {
  assert.deepEqual(switchSpec('electrical.switches.starlink.state'), {
    path: 'electrical.switches.starlink.state',
    webappLabel: ''
  })
  assert.deepEqual(
    switchSpec({ path: 'electrical.switches.starlink.state', webappLabel: 'Starlink' }),
    { path: 'electrical.switches.starlink.state', webappLabel: 'Starlink' }
  )
  assert.equal(switchTitle(3, { webappLabel: '' }), 'Switch 3')
  assert.equal(switchTitle(3, { webappLabel: 'Starlink' }), 'Starlink')
  assert.equal(switchConfigSchema(1, 1).properties.webappLabel.title, 'Webapp label')
})

test('panelSnapshot uses webappLabel from config', () => {
  const snap = panelSnapshot({
    options: {
      naviop: {
        bank: 1,
        switches: {
          1: { path: 'electrical.naviop.switches.1.state', webappLabel: 'VHF auto follow' },
          2: { path: 'electrical.switches.instrumentpanel.state' },
          3: 'electrical.switches.starlink.state'
        }
      }
    },
    digiSwitch: {
      1: {
        switches: {
          1: { path: 'electrical.naviop.switches.1.state', state: 0, webappLabel: 'VHF auto follow' },
          2: { path: 'electrical.switches.instrumentpanel.state', state: 0 },
          3: { path: 'electrical.switches.starlink.state', state: 1 }
        }
      }
    }
  })
  assert.equal(snap.started, true)
  assert.equal(snap.switches.length, 3)
  assert.equal(snap.switches[0].title, 'VHF auto follow')
  assert.equal(snap.switches[1].title, 'Switch 2')
  assert.equal(snap.switches[1].path, 'electrical.switches.instrumentpanel.state')
  assert.equal(snap.switches[2].title, 'Switch 3')
  assert.equal(snap.switches[2].state, 1)
})

test('panelSnapshot maps online to on', () => {
  const snap = panelSnapshot({
    options: {
      naviop: {
        bank: 1,
        switches: {
          4: { path: 'network.providers.starlink.status', webappLabel: 'Internet' }
        }
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
