# Emulate Naviop AT30

The aim of the plugin is to make the Naviop panel on the Navico MFD work with SignalK.

## Requirements

Currently the plugin requires a 'can0' interface to have canboatjs start a second device on the N2K bus.
The plugin will not work using an Actisense type of interface.

## Setup

### Configuration tool

Download the [Loop Configurator Tool](https://downloads.bandg.com/software/index.html?r=2818) from the B&G website.
It contains a ZIP file with the configuration WebApp.
Read the help section to see how to use it.

It allows you to download a file called update.zip.
Unzip that file and it will show:
 - DigitalSwitching directory with pictograms
 - loops.xml with the config
 - update file
 
You can ftp these files to your Vulcan/Zeus per instruction.

Once you've rebooted the Vulcan (the update file allows you to do this remotely - also handy afterwards) you show see the Naviop panel.

#### loops.xml

You can make changes to this file to e.g. rename the fuse names. Adding your own pictograms should also be easy. You can then upload only the loops.xml for changes.

### Plugin

The plugin with emulate an AT30 Digital Switching Gateway device which is neccesary for the MFD to work.
You can set the paths for the different switches/fuses in the plugin config.

For the Victron Cerbos you may need to add a data connection (canbus) and use that canbus interface.


#### What the plugin does
The plugin will listen for switch commands (126208) from the MFD, send the state change to SignalK (electrical.naviop.(switches|fuses).$instance.state) and send out an update (127501) from Naviop to the MFD.
Due to non-standard usage of the 127501 PGN it doesn't work well with the standard electrical.switches.bank. setup.
Ignore the standard paths SignalK produces for this bank.

Focus now is on the switches. The fuse states haven't been well defined yet.

[Demo video](https://youtu.be/h9i_ZxPWVRw)

## Todo
 - Where to land fuse state/defails info in SignalK?
 - Add details for fuse state (load info etc)
 - More details on how/what to change to loops.xml
