'use strict'

var n2kOn = require('./n2k-on')

function switchSpec (value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      path: typeof value.path === 'string' ? value.path.toLowerCase() : '',
      webappLabel: typeof value.webappLabel === 'string' ? value.webappLabel.trim() : ''
    }
  }
  if (typeof value === 'string') {
    return { path: value.toLowerCase(), webappLabel: '' }
  }
  return { path: '', webappLabel: '' }
}

function switchTitle (nr, spec) {
  if (spec && spec.webappLabel) return spec.webappLabel
  return 'Switch ' + nr
}

function switchConfigSchema (n, fuseNr) {
  return {
    type: 'object',
    title: 'Switch ' + n + ' (connected to Fuse ' + fuseNr + ')',
    properties: {
      path: {
        type: 'string',
        title: 'Path',
        default: 'electrical.naviop.switches.' + n + '.state'
      },
      webappLabel: {
        type: 'string',
        title: 'Webapp label'
      }
    }
  }
}

function panelSnapshot (runtime) {
  var options = (runtime && runtime.options) || {}
  var naviop = options.naviop || {}
  var bankNr = naviop.bank != null ? naviop.bank : 1
  var configured = naviop.switches || {}
  var liveBank = runtime && runtime.digiSwitch && runtime.digiSwitch[bankNr]
  var live = (liveBank && liveBank.switches) || {}
  var switches = []
  var keys = Object.keys(configured)
  keys.sort(function (a, b) {
    return parseInt(a, 10) - parseInt(b, 10)
  })
  keys.forEach(function (nr) {
    var spec = switchSpec(configured[nr])
    var stored = live[nr] || live[parseInt(nr, 10)]
    if (stored && stored.path) spec.path = stored.path
    if (stored && stored.webappLabel && !spec.webappLabel) {
      spec.webappLabel = stored.webappLabel
    }
    var state = stored ? n2kOn(stored.state) : 0
    switches.push({
      nr: parseInt(nr, 10),
      title: switchTitle(nr, spec),
      path: spec.path,
      state: state
    })
  })
  return {
    started: !!(runtime && runtime.options),
    bank: bankNr,
    switches: switches
  }
}

module.exports = {
  switchSpec: switchSpec,
  switchTitle: switchTitle,
  switchConfigSchema: switchConfigSchema,
  panelSnapshot: panelSnapshot
}
