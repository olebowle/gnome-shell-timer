# Timer extension for gnome-shell
- Provides a countdown timer in the gnome-shell top panel
- User adjustable timer presets for common tasks
- Manually adjustable timer

# Installation
## Archlinux
Get from [AUR](https://aur.archlinux.org/packages.php?ID=52047)

## Debian
Get from [Debian Packages](http://packages.debian.org/sid/gnome-shell-timer)

## Direct from source
- Get Source

    * [Master branch | Gnome-shell 3.2](https://github.com/olebowle/gnome-shell-timer/zipball/master)
    * [Gnome-3.0 branch | Gnome-shell 3.0.x](https://github.com/olebowle/gnome-shell-timer/zipball/gnome-3.0)

- Extract *timer@olebowle.gmx.com* directory to *~/.local/share/gnome-shell/extensions/*
- Move utilities-timer-symbolic.svg to /usr/share/icons/hicolor/scalable/apps
- Update the system's icon cache: *gtk-update-icon-cache --force --quiet /usr/share/icons/hicolor*
- Enable the extension using gnome-tweak-tool (Shell Extensions -> Timer Extension) or via following commandline:
  -      gsettings get org.gnome.shell enabled-extensions
  -      gsettings set org.gnome.shell enabled-extensions [\<value from get above\>, timer@olebowle.gmx.com]
- Press *Alt + F2*, and *r* in command to restart gnome-shell

# Configuration
Some of the default settings can be overridden in with *$XDG_CONFIG_HOME/gnome-shell-timer/gnome_shell_timer.json* 
(usually *~/.config/gnome-shell-timer/gnome_shell_timer.json*) file. Please refer the [wiki](https://github.com/olebowle/gnome-shell-timer/wiki/Configuration).

# License
See [COPYING](https://github.com/olebowle/gnome-shell-timer/blob/master/COPYING) for details.

# Thanks
- Contributors: [gnome-shell-pomodoro](https://github.com/codito/gnome-shell-pomodoro/contributors) which was a nice starting point for this extension (code and documentation)
- Contributors: [gnome-shell-system-monitor-applet](https://github.com/paradoxxxzero/gnome-shell-system-monitor-applet/contributors) - pie diagram
- [Timer Applet](https://launchpad.net/timer-applet) - original idea
