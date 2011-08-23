# Timer extension for gnome-shell
- Provides a countdown timer in the gnome-shell top panel
- User adjustable timer presets for common tasks
- Manually adjustable timer

# Installation
## Archlinux
AUR to come, when this has been adequately tested

## Direct from source
- Get Source
    * [Unstable - Master branch](https://github.com/olebowle/gnome-shell-extension-timer/zipball/master)
- Extract *timer@olebowle.gmx.com* directory to *~/.local/share/gnome-shell/extensions/*
- Put timer-applet.svg to /usr/share/icons/<yourCurrentTheme>/scalable/status (at least I put it there - is there a place independent of themes?)
- Press *Alt + F2*, and *r* in command to restart gnome-shell

# Configuration
Some of the default settings can be overridden in with *$XDG_CONFIG_HOME/gnome-shell-timer/gnome_shell_timer.json* 
(usually *~/.config/gnome-shell-timer/gnome_shell_timer.json*) file. Please refer the [wiki](https://github.com/olebowle/gnome-shell-timer/wiki/Configuration).

# License
See COPYING for details.

# Thanks
- Contributors: [gnome-shell-pomodoro](https://github.com/codito/gnome-shell-pomodoro/contributors) which was a nice starting point for this extension (code and documentation)
- Contributors: [gnome-shell-system-monitor-applet](https://github.com/paradoxxxzero/gnome-shell-system-monitor-applet/contributors) - pie diagram
- [Timer Applet](https://launchpad.net/timer-applet) - original idea
