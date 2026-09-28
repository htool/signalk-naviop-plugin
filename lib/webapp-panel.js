'use strict'

var n2kOn = require('./n2k-on')

function asPath (value) {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function asLabel (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function asBoolean (value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function asChannel (value) {
  var n = parseInt(value, 10)
  if (!isNaN(n) && n >= 1 && n <= 8) return n
  return null
}

function pathValue (state, booleanPath) {
  var on = n2kOn(state) === 1
  if (booleanPath) return on
  return on ? 1 : 0
}

function switchSpec (value, channelNr) {
  var nr = asChannel(channelNr)
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      nr: nr,
      path: asPath(value.path),
      webappLabel: asLabel(value.webappLabel),
      booleanPath: asBoolean(value.booleanPath)
    }
  }
  if (typeof value === 'string') {
    return { nr: nr, path: asPath(value), webappLabel: '', booleanPath: false }
  }
  return { nr: nr, path: '', webappLabel: '', booleanPath: false }
}

function fuseSpec (value, channelNr) {
  var nr = asChannel(channelNr)
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      nr: nr,
      path: asPath(value.path != null ? value.path : value)
    }
  }
  if (typeof value === 'string') {
    return { nr: nr, path: asPath(value) }
  }
  return { nr: nr, path: '' }
}

function switchTitle (nr, spec) {
  if (spec && spec.webappLabel) return spec.webappLabel
  return 'Switch ' + nr
}

function parseSwitchList (raw) {
  var list = []
  if (Array.isArray(raw)) {
    raw.forEach(function (item, index) {
      if (index >= 8) return
      var spec = switchSpec(item, index + 1)
      if (spec.nr != null) list.push(spec)
    })
    return list
  }
  if (raw && typeof raw === 'object') {
    Object.keys(raw)
      .sort(function (a, b) {
        return parseInt(a, 10) - parseInt(b, 10)
      })
      .forEach(function (key) {
        var spec = switchSpec(raw[key], key)
        if (spec.nr != null) list.push(spec)
      })
  }
  return list
}

function parseFuseList (raw) {
  var list = []
  if (Array.isArray(raw)) {
    raw.forEach(function (item, index) {
      if (index >= 8) return
      var spec = fuseSpec(item, index + 1)
      if (spec.nr != null) list.push(spec)
    })
    return list
  }
  if (raw && typeof raw === 'object') {
    Object.keys(raw)
      .sort(function (a, b) {
        return parseInt(a, 10) - parseInt(b, 10)
      })
      .forEach(function (key) {
        var spec = fuseSpec(raw[key], key)
        if (spec.nr != null) list.push(spec)
      })
  }
  return list
}

function switchItemSchema () {
  return {
    type: 'object',
    title: 'Switch',
    properties: {
      path: {
        type: 'string',
        title: 'Path',
        default: 'electrical.naviop.switches.1.state'
      },
      webappLabel: {
        type: 'string',
        title: 'Webapp label'
      },
      booleanPath: {
        type: 'boolean',
        title: 'Use true/false',
        description: 'Write true/false to the Signal K path instead of 0/1.',
        default: false
      }
    }
  }
}

function fuseItemSchema () {
  return {
    type: 'object',
    title: 'Fuse',
    properties: {
      path: {
        type: 'string',
        title: 'Path',
        default: 'electrical.naviop.fuses.1.state'
      }
    }
  }
}

function defaultSwitchItems () {
  return [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) {
    return {
      path: 'electrical.naviop.switches.' + n + '.state',
      webappLabel: '',
      booleanPath: false
    }
  })
}

function defaultFuseItems () {
  return [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) {
    return {
      path: 'electrical.naviop.fuses.' + n + '.state'
    }
  })
}

function switchesSchema () {
  return {
    type: 'array',
    title: 'Switches',
    description:
      'List order is both the Naviop channel (1st = switch 1) and the webapp order. Use up/down to reorder.',
    items: switchItemSchema(),
    default: defaultSwitchItems(),
    maxItems: 8
  }
}

function fusesSchema () {
  return {
    type: 'array',
    title: 'Fuses',
    description:
      'List order is the Naviop fuse channel (1st = fuse 1). Use up/down to reorder.',
    items: fuseItemSchema(),
    default: defaultFuseItems(),
    maxItems: 8
  }
}

function panelSnapshot (runtime) {
  var options = (runtime && runtime.options) || {}
  var naviop = options.naviop || {}
  var bankNr = naviop.bank != null ? naviop.bank : 1
  var configured = parseSwitchList(naviop.switches)
  var liveBank = runtime && runtime.digiSwitch && runtime.digiSwitch[bankNr]
  var live = (liveBank && liveBank.switches) || {}
  var switches = []
  configured.forEach(function (spec) {
    var stored = live[spec.nr] || live[String(spec.nr)]
    if (stored && stored.path) spec.path = stored.path
    if (stored && stored.webappLabel && !spec.webappLabel) {
      spec.webappLabel = stored.webappLabel
    }
    var state = stored ? n2kOn(stored.state) : 0
    switches.push({
      nr: spec.nr,
      title: switchTitle(spec.nr, spec),
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
  fuseSpec: fuseSpec,
  switchTitle: switchTitle,
  pathValue: pathValue,
  parseSwitchList: parseSwitchList,
  parseFuseList: parseFuseList,
  switchItemSchema: switchItemSchema,
  fuseItemSchema: fuseItemSchema,
  switchesSchema: switchesSchema,
  fusesSchema: fusesSchema,
  defaultSwitchItems: defaultSwitchItems,
  defaultFuseItems: defaultFuseItems,
  panelSnapshot: panelSnapshot
}
