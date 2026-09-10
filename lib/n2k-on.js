'use strict'

function n2kOn (value) {
  if (value === true || value === 1) return 1
  if (value === false || value === 0) return 0
  if (typeof value === 'string') {
    var s = value.trim().toLowerCase()
    if (s === '1' || s === 'on' || s === 'online' || s === 'true') return 1
    if (s === '0' || s === 'off' || s === 'offline' || s === 'false') return 0
  }
  var n = parseInt(value, 10)
  return n ? 1 : 0
}

module.exports = n2kOn
