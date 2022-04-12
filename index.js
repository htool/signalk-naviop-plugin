const id = "signalk-naviop-plugin";
const debug = require('debug')(id)

// AddressClaim PGN
const addressClaim = {
  pgn: 60928,
  dst: 255,
  "Unique Number": 1060571,
  "Manufacturer Code": 275,
  "Device Function": 140,
  "Device Class": 30,
  "Reserved1": 0,
  "Device Instance Lower": 0,
  "Device Instance Upper": 0,
  "System Instance": 0,
  "Industry Group": 4
  // "Reserved2": 2
}

// Product info PGN
const productInfo = {
  pgn: 126996,
  dst: 255,
  "NMEA 2000 Version": 2100,
  "Product Code": 4616,
  "Model ID": "AT30 Digital Switching Gateway",
  "Software Version Code": "0.1.00.00",
  "Model Version": "",
  "Model Serial Code": "104864089",
  "Certification Level": 2,
  "Load Equivalency": 1
}

const defaultTransmitPGNs = [
  60928,
  59904,
  59392,
  59904,
  126720,
  127500,
  127501,
  127502 ]

var digiSwitch = {
  bank: 1,
  relay: {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0,
    8: 0
  },
  fuse: {
    1: 0,
    2: 1,
    3: 2,
    4: 3,
    5: 0,
    6: 1,
    7: 2,
    8: 3
  }
}

var plugin = {}
var intervalid;

module.exports = function(app, options) {
  "use strict"
  var plugin = {}
  plugin.id = id
  plugin.name = "Naviop digital switching"
  plugin.description = "Signal K plugin to connect Naviop panel to SignalK"

  var unsubscribes = []

  let localSubscription = {
    context: '*', // Get data for all contexts
    subscribe: [
      {
        "path":   "electrical.switches.bank." + digiSwitch.bank + ".*"
      }
    ]
  }

  var schema = {
    type: "object",
    title: "Naviop",
    description: 
    "Naviop settings",
    properties: {
	    signalkAddress: {
	      type: 'number',
	      title: 'SignalK address'
	    },
	    naviopAddress: {
	      type: 'number',
	      title: 'Naviop emulation address'
	    },
	    bank: {
	      type: 'number',
	      title: 'Bank instance number'
	    },
    }
  } 

  plugin.schema = function() {
    return schema
  }

  plugin.start = function(options, restartPlugin) {

    var mfdAddress
    app.debug('Starting plugin');
    app.debug('Options: %j', JSON.stringify(options));

    // Load device specific init info
    app.debug('Emulate: Naviop AT30 Digital Switching Gateway');
    
    const signalkAddress = options.signalkAddress
    const deviceAddress = options.naviopAddress
    module.exports.deviceAddress = deviceAddress

    app.debug('naviopAddress: %j', deviceAddress)
    app.debug('SignalK address: %j', signalkAddress)

    app.subscriptionmanager.subscribe(
      localSubscription,
      unsubscribes,
      subscriptionError => {
        app.error('Error:' + subscriptionError);
      },
      delta => {
        delta.updates.forEach(u => {
          handleUpdate(u.values)
        });
      }
    );

    function handleUpdate (data) {
      // Set switch statuses
      var path = data[0]['path']
      if (path.split('.')[5] == 'state') {
        var instance = parseInt(path.split('.')[4])
        if (instance < 9) {
          var state = parseInt(data[0]['value'])
          // digiSwitch.relay[instance] = state
          // app.debug('path %s, instance %d, state %s', path, instance, state)
        }
      }
    }

    function pushDelta(app, path, value) {
      app.handleMessage(plugin.id, {
        updates: [
          {
            values: [
              {
                path: path,
                value: value
              }
            ]
          }
        ]
      })
      return
    }


    require('./canboatjs')
    require('./canboatjs/lib/canbus')
    const canDevice = require('./canboatjs/lib/canbus').canDevice
    const canbus = new (require('./canboatjs').canbus)({})
    const util = require('util')
    
    // Generic functions
    function buf2hex(buffer) { // buffer is an ArrayBuffer
      return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2));
    }
    
    function padd(n, p, c)
    {
      var pad_char = typeof c !== 'undefined' ? c : '0';
      var pad = new Array(1 + p).join(pad_char);
      return (pad + n).slice(-pad.length);
    }
   
    function sendUpdate () {
      /*
      4 bytes to encode Relay and Fuse status:
       00 00 00 00  00 00 00 00  00 00 00 00  00 00 00 00
       F1 R2 R5 R1  F3 R4 F2 R3  F6 F5 F4 R6  F8 F7 R8 R7

      For relay:
       00 = off
       01 = on
       10 = problem
       11 = unknown

      */

      var binaryStatus = 0
      binaryStatus = parseInt(digiSwitch.fuse[1])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[2])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[5])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[1])
      binaryStatus = binaryStatus << 2

      binaryStatus += parseInt(digiSwitch.fuse[3])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[4])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.fuse[2])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[3])
      binaryStatus = binaryStatus << 2

      binaryStatus += parseInt(digiSwitch.fuse[6])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.fuse[5])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.fuse[4])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[6])
      binaryStatus = binaryStatus << 2

      binaryStatus += parseInt(digiSwitch.fuse[8])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.fuse[7])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[8])
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch.relay[7])

      var bin64 = binaryStatus.toString(2).padStart(32, '0')
      var hex64 = binaryStatus.toString(16).padStart(8, '0')
      var hex = hex64[0] + hex64[1] + ',' + hex64[2] + hex64[3] + ',' + hex64[4] + hex64[5] + ',' + hex64[6] + hex64[7]
      // app.debug('bin64: ' + bin64 + ' hex64: ' + hex64 + ' hex: ' + hex)
      
      var PGN127501 = "%s,3,127501,%s,%s,8,01," + hex + ",00,ff,ff"
      var pgn = util.format(PGN127501, (new Date()).toISOString(), canbus.candevice.address, signalkAddress)
      // app.debug('pgn: %s', pgn)
      canbus.sendPGN(pgn)

      var PNG127500 = [
        "%s,3,127500,%s,255,8,ff,00,00,00,00,ff,ff,ff",
        "%s,3,127500,%s,255,8,ff,01,00,00,00,ff,ff,ff",
        "%s,3,127500,%s,255,8,ff,02,00,00,00,ff,ff,ff",
        "%s,3,127500,%s,255,8,ff,03,00,00,00,ff,ff,ff",
        "%s,3,127500,%s,255,8,ff,04,00,00,00,ff,ff,ff",
        "%s,3,127500,%s,255,8,ff,05,00,00,00,ff,ff,ff",
        "%s,3,127500,%s,255,8,ff,06,00,00,00,ff,ff,ff",
        "%s,3,127500,%s,255,8,ff,07,00,00,00,ff,ff,ff" ]
      PNG127500.forEach (function (PGN) {
        var pgn = util.format(PGN, (new Date()).toISOString(), canbus.candevice.address)
        // app.debug('pgn: %s', pgn)
        canbus.sendPGN(pgn)
      })
    }
    
    setInterval(sendUpdate, 1000) // State update every second
    
    function mainLoop () {
    	while (canbus.readableLength > 0) {
    	//app.debug('canbus.readableLength: %i', canbus.readableLength)
        var msg = canbus.read()
    		// app.debug('Received packet msg: %j', msg)
    	  // app.debug('msg.pgn.src %i != canbus.candevice.address %i?', msg.pgn.src, canbus.candevice.address)
        if ( msg.pgn.dst == canbus.candevice.address || msg.pgn.dst == 255) {
          msg.pgn.fields = {};
          switch (msg.pgn.pgn) {
            case 59904:
              var PGN = msg.data[2] * 256 * 256 + msg.data[1] * 256 + msg.data[0];
              // app.debug('ISO request: %j', msg);
              // app.debug('ISO request from %d to %d Data PGN: %i', msg.pgn.src, msg.pgn.dst, PGN);
              msg.pgn.fields.PGN = PGN;
              canbus.candevice.n2kMessage(msg.pgn);
              break
            case 126208:
              // Digital switching command from MFD
              var pgn = buf2hex(msg.data)
              var PGN = pgn.join(',')
              // app.debug('Digital switching command 126208 [%d -> %d]: %s', msg.pgn.src, msg.pgn.dst, PGN)
              if (typeof mfdAddress == 'undefined') {
                mfdAddress = msg.pgn.src
                app.debug('MFD found on address %d', mfdAddress)
              }
              if (PGN.match(/.1,02,0.,03,0.,ff,ff,ff/)) {
                var instance = parseInt(pgn[2]) + 1
                var state = parseInt(pgn[4])
                digiSwitch.relay[instance] = state
                pushDelta(app, "electrical.switches.bank." + digiSwitch.bank + "." + instance + ".state", state)
                app.debug('Digital switching command 126208 Instance %d -> %d]', parseInt(instance), parseInt(state))
                app.debug('Switch states: %s', JSON.stringify(digiSwitch))
              }
              break
            default:
              if (msg.pgn.dst == canbus.candevice.address) {
                app.debug('Received unknown packet: src: %d  pgn: %d', msg.pgn.src, msg.pgn.pgn, buf2hex(msg.data).join('.'))
              }
              break
          }
        }
    	}
      setTimeout(mainLoop, 50)
    }
    
    // Wait for cansend
    function waitForSend () {
      if (canbus.candevice.cansend) {
        mainLoop()
        return
      }
      setTimeout (waitForSend, 500)
    }
    
    waitForSend()

  }

  plugin.stop = function() {
    app.debug("Stopping")
    unsubscribes.forEach(f => f());
    unsubscribes = [];
    clearInterval(intervalid);
    app.debug("Stopped")
  }

  return plugin;
};

module.exports.defaultTransmitPGNs = defaultTransmitPGNs
module.exports.addressClaim = addressClaim
module.exports.productInfo = productInfo
module.exports.app = "app"
module.exports.options = "options"
