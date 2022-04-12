# Emulate Naviop AT30

The aim of the plugin is to make the Naviop panel on the Navico MFD work with SignalK.

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

### loops.xml

You can make changes to this file to e.g. rename the fuse names. Adding your own pictograms should also be easy. You can then upload only the loops.xml for changes.

### Plugin

The plugin with emulate an AT30 Digital Switching Gateway device which is neccesary for the MFD to work.
Enter your SignalK device address,  the intended Naviop device address and your MFD address in the config and set the bank instance number.

## What the plugin does
The plugin will listen for switch commands (126208) from the MFD, send the state change to SignalK (electrical.switches.banks.x.y.state) and send out an update (127501) from Naviop t
o the MFD.

## Todo
 - Make Device address config work (now hardcoded)
 - Where to land fuse state/defails info in SignalK?
 - Read switch status from MFD on startup (MFD remembers state)
 - Add details for fuse state (load info etc)
 - More details on how/what to change to loops.xml
