'use strict'

// 127501 JSON fields from 8c2a283: Loop S FuseCh = Indicator n.
// Switch channels carry on/off; missing/healthy fuses stay On (not red).

function naviop127501Fields (swOn, fuseOk, bankNr) {
  return {
    pgn: 127501,
    Instance: bankNr,
    Indicator1: swOn(1),
    Indicator2: swOn(5),
    Indicator3: swOn(2),
    Indicator4: fuseOk(1),
    Indicator5: swOn(3),
    Indicator6: fuseOk(2),
    Indicator7: swOn(4),
    Indicator8: fuseOk(3),
    Indicator9: swOn(6),
    Indicator10: fuseOk(4),
    Indicator11: fuseOk(5),
    Indicator12: fuseOk(6),
    Indicator13: swOn(7),
    Indicator14: swOn(8),
    Indicator15: fuseOk(7),
    Indicator16: fuseOk(8)
  }
}

module.exports = naviop127501Fields
