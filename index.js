const id = "signalk-naviop-plugin";
const debug = require('debug')(id)
const util = require('util')
const SimpleCan = require('@canboat/canboatjs').SimpleCan
const axios = require('axios')



var plugin = {}
var intervalid
var n2kOn = require('./lib/n2k-on')
var naviop127501Fields = require('./lib/pgn-127501')
var n2kCamelCompat = require('./lib/n2k-camel-compat')
var webappPanel = require('./lib/webapp-panel')
var NAVIOP_UNIQUE_NUMBER = 1060571

module.exports = function(app, options) {
  "use strict"
  var plugin = {}
  plugin.id = id
  plugin.name = "Naviop digital switching"
  plugin.description = "Signal K plugin to connect Naviop panel to SignalK"

  var unsubscribes = []
  var mfdFound = false
  var runtime = {
    options: null,
    digiSwitch: null,
    bankNr: 1,
    putSwitch: null
  }

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
    runtime.options = options
    runtime.bankNr = (options.naviop && options.naviop.bank) || 1

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
        'Unique Number': NAVIOP_UNIQUE_NUMBER,
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
    app.prependListener('N2KAnalyzerOut', function (n2k) {
      n2kCamelCompat(n2k, NAVIOP_UNIQUE_NUMBER)
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

    var shellies = []

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
      // Healthy fuse = On. Loop S treats 127501 Off as blown (red keys).
      digiSwitch[bankNr].fuses[fuseNr] = {path: path, state: 1}
      localSubscription.subscribe.push({path: path})
    }

    runtime.digiSwitch = digiSwitch
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
            handleUpdate(u)
          }
        });
      }
    );

    function handleUpdate (data) {
      var source = data['$source']
      var i
      var path
      var state
      if (!data.values) {
        return
      }
      for (i = 0; i < data.values.length; i++) {
        path = data.values[i].path
        if (typeof path === 'string') {
          path = path.toLowerCase()
        }
        state = n2kOn(data.values[i].value)
        app.debug('path: %s  state: %s  source: %s', path, state, source)
        updatePathState(path, state, source)
      }
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
        app.debug('PUT switch path %s -> %s', path, state)
        sendPutRequest(path, state)
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

    function updatePathState(path, state, source) {
      // app.debug('updatePathState: %s to %d (source: %s)', path, state, source)
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
              if (source == "signalk-shelly") {
                shellies.push(path)
                app.debug('shellies: %s', JSON.stringify(shellies))
              }
            }
          }
        }
      }
    }

    function sendPutRequest (path, state) {
      path = 'http://localhost:3000/signalk/v1/api/vessels/self/' + path.replaceAll('.', '/')
      app.debug('sendPutRequest: path: %s  state: %s', path, state)
      const res = axios.put(path, {
        "value": state
      })
    }

    runtime.putSwitch = function (nr, state) {
      var key = String(nr)
      if (!digiSwitch[bankNr] || !digiSwitch[bankNr].switches[key]) {
        throw new Error('unknown switch ' + nr)
      }
      updateSwitchState(bankNr, key, n2kOn(state))
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

    // Loop S switch keys <load> FuseCh on 127501 (Indicator n = FuseCh n).
    // All-Off 127501 looks like a dead bank (every key red). All-On looks
    // like every circuit is on (every key blue). Switch channels carry
    // on/off; fuse-only channels stay On when healthy.
    function fuseOk (fuseNr) {
      var fuse = digiSwitch[bankNr].fuses[fuseNr]
      if (!fuse) return 1
      return n2kOn(fuse.state)
    }

    function swOn (switchNr) {
      var sw = digiSwitch[bankNr].switches[switchNr]
      if (!sw) return 0
      return n2kOn(sw.state)
    }
   
    function sendUpdate () {
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
      var pgn501 = naviop127501Fields(swOn, fuseOk, bankNr)
      pgn501.dst = (typeof mfdAddress != 'undefined' ? mfdAddress : 255)
      simpleCan.sendPGN(pgn501)

      for (var sw = 1; sw <= 8; sw++) {
        var connId = sw - 1
        var st = swOn(sw)
        var pgn = util.format(
          '%s,3,127500,%s,255,8,ff,%s,%s,00,00,ff,ff,ff',
          (new Date()).toISOString(),
          deviceAddress,
          padd(connId.toString(16), 2),
          padd(st.toString(16), 2)
        )
        simpleCan.sendPGN(pgn)
      }
      /*
      simpleCan.sendPGN({
        pgn: 127500,
        dst: mfdAddress
      })
      */
    }
    
    intervalid = setInterval(sendUpdate, 1000) // State update every second

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
        if (n2k.fields['Manufacturer Code'] == 'Navico' || n2k.fields.manufacturerCode == 'Navico') {
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
            if (typeof mfdAddress == 'undefined' || !mfdFound) {
              mfdAddress = n2k.src
              mfdFound = true
              app.debug('MFD found on address %d', mfdAddress)
            }
            if (n2k.fields.PGN == 127500 || n2k.fields.pgn == 127500) {
              app.debug('n2k.fields: %j', n2k.fields)
              var list = n2k.fields.list || []
              var connectionId
              var state
              for (var i = 0; i < list.length; i++) {
                var param = list[i].Parameter !== undefined ? list[i].Parameter : list[i].parameter
                var value = list[i].Value !== undefined ? list[i].Value : list[i].value
                if (param == 2) connectionId = value
                if (param == 3) state = value
              }
              if (connectionId === undefined && list[0]) {
                connectionId = list[0].Value !== undefined ? list[0].Value : list[0].value
              }
              if (state === undefined && list[1]) {
                state = list[1].Value !== undefined ? list[1].Value : list[1].value
              }
              var instance = parseInt(connectionId, 10) + 1
              state = parseInt(state, 10)
              app.debug('instance: %s state: %s', instance, state)
              var bankNr = 1
              app.debug('Digital switching command 126208 Instance %d -> %d]', instance, state)
              if (!isNaN(instance) && !isNaN(state)) {
                updateSwitchState(bankNr, instance, state)
              } else {
                app.debug('Ignoring 126208/127500 with unparsed connection/state')
              }
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
    runtime.options = null
    runtime.digiSwitch = null
    runtime.putSwitch = null
    app.debug("Stopped")
  }

  function sendJson (res, body, status) {
    res.statusCode = status || 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }

  function readJson (req) {
    return new Promise(function (resolve, reject) {
      var parsed = req.body
      var hasParsed =
        parsed &&
        typeof parsed === 'object' &&
        !Buffer.isBuffer(parsed) &&
        Object.keys(parsed).length > 0
      if (hasParsed || req.readableEnded) {
        resolve(hasParsed ? parsed : {})
        return
      }
      var raw = ''
      req.on('data', function (c) {
        raw += c
        if (raw.length > 1e6) reject(new Error('body too large'))
      })
      req.on('end', function () {
        if (!raw) {
          resolve(parsed && typeof parsed === 'object' && !Buffer.isBuffer(parsed) ? parsed : {})
          return
        }
        try {
          resolve(JSON.parse(raw))
        } catch (err) {
          reject(err)
        }
      })
      req.on('error', reject)
    })
  }

  function handleStatus (req, res) {
    sendJson(res, webappPanel.panelSnapshot(runtime))
  }

  function handlePutSwitch (req, res) {
    var nr = parseInt(req.params.nr, 10)
    if (isNaN(nr) || nr < 1 || nr > 8) {
      sendJson(res, { error: 'unknown switch' }, 400)
      return
    }
    if (!runtime.putSwitch) {
      sendJson(res, { error: 'plugin not started' }, 409)
      return
    }
    readJson(req).then(function (body) {
      var state = n2kOn(body && body.value)
      runtime.putSwitch(nr, state)
      sendJson(res, { ok: true, nr: nr, state: state })
    }).catch(function (err) {
      sendJson(res, { error: err.message }, 400)
    })
  }

  plugin.signalKApiRoutes = function (router) {
    router.get('/signalk-naviop-plugin/status', handleStatus)
    return router
  }

  plugin.registerWithRouter = function (router) {
    router.get('/status', handleStatus)
    var write = router.access ? router.access('readwrite') : router
    write.put('/switches/:nr', handlePutSwitch)
  }

  return plugin;
};
