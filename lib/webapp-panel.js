'use strict'

var n2kOn = require('./n2k-on')

// Loop S switch titles from DigitalSwitching/loopse.xml <ui><switches>.
var SWITCH_TITLES = {
  1: 'VHF auto follow',
  2: 'Instrument display',
  3: 'Starlink',
  4: 'Internet',
  5: 'Boiler',
  6: 'Dehumidifier',
  7: 'Reboot Teltonika',
  8: 'Restart SignalK'
}

function switchTitle (nr) {
  var key = parseInt(nr, 10)
  return SWITCH_TITLES[key] || ('Switch ' + nr)
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
  if (keys.length === 0) {
    keys = Object.keys(SWITCH_TITLES)
  }
  keys.sort(function (a, b) {
    return parseInt(a, 10) - parseInt(b, 10)
  })
  keys.forEach(function (nr) {
    var path = configured[nr]
    var stored = live[nr] || live[parseInt(nr, 10)]
    if (stored && stored.path) path = stored.path
    if (typeof path === 'string') path = path.toLowerCase()
    else path = ''
    var state = stored ? n2kOn(stored.state) : 0
    switches.push({
      nr: parseInt(nr, 10),
      title: switchTitle(nr),
      path: path,
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
  SWITCH_TITLES: SWITCH_TITLES,
  switchTitle: switchTitle,
  panelSnapshot: panelSnapshot
}
