'use strict'

// e35e90e: 126208 already reads Pascal || camelCase. SimpleCan 1.23 CanDevice
// still uses fields.PGN and 1.23 toPgn on 60928. SK 2.x canboatjs 3 emits
// camelCase; an own-claim echo then looks like a NAME conflict and we leave 37.

function n2kCamelCompat (n2k, ownUnique) {
  if (!n2k || !n2k.fields) return n2k
  if (n2k.fields.PGN == null && n2k.fields.pgn != null) {
    n2k.fields.PGN = n2k.fields.pgn
  }
  if (n2k.pgn === 60928 && ownUnique != null) {
    var uid = n2k.fields.uniqueNumber != null
      ? n2k.fields.uniqueNumber
      : n2k.fields['Unique Number']
    if (uid == ownUnique) {
      n2k.src = 254
    }
  }
  return n2k
}

module.exports = n2kCamelCompat
