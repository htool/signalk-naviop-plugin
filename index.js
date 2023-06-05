const id = "signalk-naviop-plugin";
const debug = require('debug')(id)
const util = require('util')
const SimpleCan = require('@canboat/canboatjs').SimpleCan


var plugin = {}
var intervalid;

module.exports = function(app, options) {
  "use strict"
  var plugin = {}
  plugin.id = id
  plugin.name = "Naviop digital switching"
  plugin.description = "Signal K plugin to connect Naviop panel to SignalK"

  var unsubscribes = []
  var mfdFound = false

  var schema = {
    type: "object",
    title: "Naviop",
    description: 
    "Naviop settings",
    properties: {
	    naviopAddress: {
	      type: 'number',
	      title: 'Naviop emulation address'
	    },
      candevice: {
        title: "Override CAN device to bind on. Will try to auto detect by default.",
        type: "string",
        default: ''
      },
      naviop: {
        title: 'Bank configuration',
        properties: {
          bank: {
	          type: 'number',
	          title: 'Bank number',
            description: 'The bank number can be used to avoid interferring with an existing bank number',
	          default: 1
	        },
	        switches: {
	          title: 'Switches',
	          properties: {
			        1: {
			          type: 'string',
			          title: 'Switch 1 (connected to Fuse 1)',
			          default: 'electrical.naviop.switches.1.state'
			        },
			        2: {
			          type: 'string',
			          title: 'Switch 2 (connected to Fuse 3)',
			          default: 'electrical.naviop.switches.2.state'
			        },
			        3: {
			          type: 'string',
			          title: 'Switch 3 (connected to Fuse 5)',
			          default: 'electrical.naviop.switches.3.state'
			        },
			        4: {
			          type: 'string',
			          title: 'Switch 4 (connected to Fuse 7)',
			          default: 'electrical.naviop.switches.4.state'
			        },
			        5: {
			          type: 'string',
			          title: 'Switch 5 (connected to Fuse 2)',
			          default: 'electrical.naviop.switches.5.state'
			        },
			        6: {
			          type: 'string',
			          title: 'Switch 6 (connected to Fuse 9)',
			          default: 'electrical.naviop.switches.6.state'
			        },
			        7: {
			          type: 'string',
			          title: 'Switch 7 (connected to Fuse 13)',
			          default: 'electrical.naviop.switches.7.state'
			        },
			        8: {
			          type: 'string',
			          title: 'Switch 8 (connected to Fuse 14)',
			          default: 'electrical.naviop.switches.8.state'
			        }
			      }
			    },
			    fuses: {
			      title: 'Fuses',
			      properties: {
			        1: {
			          type: 'string',
			          title: 'Fuse 1',
			          default: 'electrical.naviop.fuses.1.state'
			        },
			        2: {
			          type: 'string',
			          title: 'Fuse 2',
			          default: 'electrical.naviop.fuses.2.state'
			        },
			        3: {
			          type: 'string',
			          title: 'Fuse 3',
			          default: 'electrical.naviop.fuses.3.state'
			        },
			        4: {
			          type: 'string',
			          title: 'Fuse 4',
			          default: 'electrical.naviop.fuses.4.state'
			        },
			        5: {
			          type: 'string',
			          title: 'Fuse 5',
			          default: 'electrical.naviop.fuses.5.state'
			        },
			        6: {
			          type: 'string',
			          title: 'Fuse 6',
			          default: 'electrical.naviop.fuses.6.state'
			        },
			        7: {
			          type: 'string',
			          title: 'Fuse 7',
			          default: 'electrical.naviop.fuses.7.state'
	            },
			        8: {
			          type: 'string',
			          title: 'Fuse 8',
			          default: 'electrical.naviop.fuses.8.state'
			        }
			      }
			    }
			  }
	    }
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
    
    const naviopAddress = options.naviopAddress || 29


    var deviceAddress
    var canDevice

    if (typeof options.candevice != 'undefined' && options.candevice != "") {
      canDevice = options.candevice
      app.debug('Using configured canDevice: %s', canDevice)
    } else {
      // app.debug('%j', app.config.settings.pipedProviders)
      app.debug('Trying to detect canDevice')
      app.config.settings.pipedProviders.forEach(provider => {
        if (provider.enabled == true) {
          provider.pipeElements.forEach(element => {
            if (element.type == 'providers/canbus' && typeof deviceAddress == 'undefined') {
              app.debug('Found provider/canbus')
              if (typeof element.options.canDevice != 'undefined') {
	              app.debug('element.options.canDevice: %s', element.options.canDevice)
                canDevice = element.options.canDevice
              }
            }
          })
        }
      })
    }

    const simpleCan = new SimpleCan({
      app,
      canDevice: canDevice,
      preferredAddress: naviopAddress,
      transmitPGNs: [ 130580, 127500, 127501, 127502 ],
      addressClaim: {
        'Unique Number': 1060571,
        'Manufacturer Code': 'Navico',
        'Device Function': 140,
        'Device Class': 'Electrical Distribution',
        'Reserved1': 0,
        'Device Instance Lower': 0,
        'Device Instance Upper': 0,
        'System Instance': 0,
        'Industry Group': 'Marine'
      },
      productInfo: {
        'NMEA 2000 Version': 2100,
        'Product Code': 4616,
        'Model ID': 'AT30 Digital Switching Gateway',
        'Software Version Code': '0.1.00.00',
        'Model Version': '',
        'Model Serial Code': '104864089',
        'Certification Level': 2,
        'Load Equivalency': 1
      }
    })
    simpleCan.start()
    app.setPluginStatus(`Connected to ${canDevice}`)
    app.debug('simpleCan.candevice.address: %j', simpleCan.candevice.address)
    deviceAddress = simpleCan.candevice.address

    var digiSwitch = {}
    var bankNr = options.naviop.bank
    digiSwitch[bankNr] = {}
    digiSwitch[bankNr].switches = {}
    digiSwitch[bankNr].fuses = {}

    app.debug('bankNr: %d', bankNr)

    var localSubscription = {
      context: '*', // Get data for all contexts
      subscribe: [
      ]
    }


    for (var [switchNr, path] of Object.entries(options.naviop.switches)) {
      path = path.toLowerCase()
      digiSwitch[bankNr].switches[switchNr] = {path: path, state: 0}
      localSubscription.subscribe.push({path: path})
    }
    for (var [fuseNr, path] of Object.entries(options.naviop.fuses)) {
      path = path.toLowerCase()
      digiSwitch[bankNr].fuses[fuseNr] = {path: path, state: 0}
      localSubscription.subscribe.push({path: path})
    }

    app.debug('digiSwitch: %j', digiSwitch)
    app.debug('localSubscription: %j', localSubscription)

    app.subscriptionmanager.subscribe(
      localSubscription,
      unsubscribes,
      subscriptionError => {
        app.error('Error:' + subscriptionError);
      },
      delta => {
        delta.updates.forEach(u => {
          if (typeof u.values != 'undefined') {
            handleUpdate(u.values)
          }
        });
      }
    );

    function handleUpdate (data) {
      var path = data[0]['path']
      var state = data[0]['value']
      app.debug('path: %s  state: %s', path, state)
      if (typeof state == 'string') {
        if (state == '1' || state.toLowerCase() == 'on' || state.toLowerCase() == 'online' || state.toLowerCase() == 'true') {
          state = 1
        } else if (state == '0' || state.toLowerCase() == 'off' || state.toLowerCase() == 'offline' || state.toLowerCase() == 'false') {
          state = 0
        }
      }
      app.debug(`handleUpdate: ${path} -> ${state}`)
      updatePathState(path, state)
    }

    function updateSwitchState(bankNr, instance, state) {
      app.debug('digiSwitch: %s', JSON.stringify(digiSwitch))
      if (digiSwitch[bankNr].switches[instance].state != state) {
        app.debug('Updating digiSwitch[%d].switches[%d].state to %d', bankNr, instance, state)
        digiSwitch[bankNr].switches[instance].state = state
        var path = digiSwitch[bankNr].switches[instance].path
        var values = []
        values.push({path: path, value: state})
        pushDelta(app, values)
      }
    }

    function updateFuseState(bankNr, instance, state) {
      app.debug('digiSwitch: %s', JSON.stringify(digiSwitch))
      if (digiSwitch[bankNr].fuses[instance].state != state) {
        app.debug('Updating digiSwitch[%d].fuses[%d].state to %d', bankNr, instance, state)
        digiSwitch[bankNr].fuses[instance].state = state
        var path = digiSwitch[bankNr].fuses[instance].path
        var values = []
        values.push({path: path, value: state})
        app.debug('values: %j', values)
        pushDelta(app, values)
      }
    }

    function updatePathState(path, state) {
      app.debug('updatePathState: %s to %d', path, state)
      for (const [device, deviceObject] of Object.entries(digiSwitch[bankNr])) {
        // app.debug(`Checking ${device} deviceObject: %j`, deviceObject)
        for (const [instance, instanceObject] of Object.entries(deviceObject)) {
          // app.debug(`Checking ${device} ${instance}: %j`, instanceObject)
          // app.debug(`Checking ${instanceObject.path} == ${path} ?`)
          if (instanceObject.path == path) {
            app.debug('updatePathState: %s in %j', path, instanceObject)
            if (typeof (instanceObject.state) == 'undefined' || instanceObject.state != state) {
              app.debug('State change path %s -> %s', path, state)
              instanceObject.state = state
              sendUpdate()
            }
          }
        }
      }
    }

    function pushDelta(app, values) {
      var update = {
        updates: [
          { 
            values: values
          }
        ]
      }
      app.debug('update: %j', update)
      app.handleMessage(plugin.id, update)
      return
    }

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
      if (!mfdFound) {
        return
      }

      var bankNr = 1

      /*
      4 bytes to encode Relay and Fuse status:
       00  00  00  00   00  00  00  00   00  00  00  00   00  00  00  00
       F1  R2  R5  R1   F3  R4  F2  R3   F6  F5  F4  R6   F8  F7  R8  R7
       F4  R2  R5  R1   F8  R4  F6  R3   F12 F11 F10 R6   F16 F15 R8  R7

      For relay:
       00 = off
       01 = on
       10 = problem
       11 = unknown

      Not used now - keeping to standard on/off

      //app.debug('digiSwitch: %s', JSON.stringify(digiSwitch))
      var binaryStatus = 0
      binaryStatus = parseInt(digiSwitch[bankNr].fuses[4].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[3]) // First fuse, then relay
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[2].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[2].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[5].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[1].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[1].state)
      binaryStatus = binaryStatus << 1

      binaryStatus += parseInt(digiSwitch[bankNr].fuses[8].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[7].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[4].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[6].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[5].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[3].state)
      binaryStatus = binaryStatus << 1

      binaryStatus += parseInt(digiSwitch[bankNr].fuses[12].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[11].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[10].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[9].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[6].state)
      binaryStatus = binaryStatus << 1

      binaryStatus += parseInt(digiSwitch[bankNr].fuses[16].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[15].state)
      binaryStatus = binaryStatus << 2
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[14].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[8].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].fuses[13].state)
      binaryStatus = binaryStatus << 1
      binaryStatus += parseInt(digiSwitch[bankNr].switches[7].state)

      var bin64 = binaryStatus.toString(2).padStart(32, '0')
      var hex64 = binaryStatus.toString(16).padStart(8, '0')
      var hex = hex64[0] + hex64[1] + ',' + hex64[2] + hex64[3] + ',' + hex64[4] + hex64[5] + ',' + hex64[6] + hex64[7]
      // app.debug('bin64: ' + bin64 + ' hex64: ' + hex64 + ' hex: ' + hex)
      
      var PGN127501 = "%s,3,127501,%s,255,8,01," + hex + ",00,ff,ff"
      var pgn = util.format(PGN127501, (new Date()).toISOString(), deviceAddress)
      // app.debug('PGN 127501: ' + pgn)
      // simpleCan.sendPGN(pgn)

      */
      simpleCan.sendPGN({
        pgn: 127501,
        dst: mfdAddress,
        'Instance': bankNr,
        'Indicator1': digiSwitch[bankNr].switches[1].state,
        'Indicator2': digiSwitch[bankNr].switches[5].state,
        'Indicator3': digiSwitch[bankNr].switches[2].state,
        'Indicator4': digiSwitch[bankNr].fuses[1].state,
        'Indicator5': digiSwitch[bankNr].switches[3].state,
        'Indicator6': digiSwitch[bankNr].fuses[2].state, 
        'Indicator7': digiSwitch[bankNr].switches[4].state,
        'Indicator8': digiSwitch[bankNr].fuses[3].state,
        'Indicator9': digiSwitch[bankNr].switches[6].state,
        'Indicator10': digiSwitch[bankNr].fuses[4].state,
        'Indicator11': digiSwitch[bankNr].fuses[5].state,
        'Indicator12': digiSwitch[bankNr].fuses[6].state,
        'Indicator13': digiSwitch[bankNr].switches[7].state,
        'Indicator14': digiSwitch[bankNr].switches[8].state,
        'Indicator15': digiSwitch[bankNr].fuses[7].state,
        'Indicator16': digiSwitch[bankNr].fuses[8].state
      })

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
        var pgn = util.format(PGN, (new Date()).toISOString(), deviceAddress)
        // app.debug('PGN 127501: ' + pgn)
        simpleCan.sendPGN(pgn)
      })
      /*
      simpleCan.sendPGN({
        pgn: 127500,
        dst: mfdAddress
      })
      */
    }
    
    setInterval(sendUpdate, 1000) // State update every second

    function sendN2k(msgs) {
      app.debug("n2k_msg: " + msgs)
      msgs.map(function(msg) { app.emit('nmea2000out', msg)})
    }

    
    app.on('N2KAnalyzerOut', (n2k) => {
      // Detect MFD
      // 2023-03-08-09:26:22.492,2,65280,0,255,8,13,99,04,05,00,00,02,00
      if (!mfdFound && n2k.pgn === 65280 && n2k.dst == 255) {
    		app.debug('Received MFD PGN 65280: %j', n2k)
    		app.debug('Received MFD PGN 65280 fields: %j', n2k.fields)
        if (n2k.fields['Manufacturer Code'] == 'Navico') {
    		  app.debug('Found MFD: %d', n2k.src)
          mfdAddress = n2k.src
          mfdFound = true
        }
      } else if ( n2k.pgn === 126208 && (n2k.dst === simpleCan.candevice.address || n2k.dst == 255)) {
    		app.debug('Received packet msg: %j', n2k)
        switch (n2k.pgn) {
          case 126208:
            // Digital switching command from MFD
            // app.debug('Digital switching command 126208 [%d -> %d]: %s', msg.pgn.src, msg.pgn.dst, PGN)
            if (typeof mfdAddress == 'undefined') {
              mfdAddress = n2k.src
              app.debug('MFD found on address %d', mfdAddress)
            }
            if (n2k.fields.PGN == 127500) {
              app.debug('n2k.fields.list: %j', n2k.fields.list)
              var instance = n2k.fields.list[0].Value + 1
              var state = n2k.fields.list[1].Value
              app.debug(`instance: ${instance} state: ${state}`)
              var bankNr = 1
              app.debug('Digital switching command 126208 Instance %d -> %d]', parseInt(instance), parseInt(state))
              updateSwitchState(bankNr, instance, state)
              app.debug('Switch states: %s', JSON.stringify(digiSwitch))
            }
            break
          default:
            if (msg.pgn.dst == simpleCan.candevice.address) {
              app.debug('Received unknown packet: src: %d  pgn: %d', msg.pgn.src, msg.pgn.pgn, buf2hex(msg.data).join('.'))
            }
            break
        }
      }
    })
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
