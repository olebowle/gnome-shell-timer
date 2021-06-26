#!/bin/bash

install() {
    $SUDO mkdir -p "$DEST"
    $SUDO cp -R "timer@olebowle.gmx.com" "$DEST"
    $SUDO cp -R "kitchen_timer.ogg" "$DEST/timer@olebowle.gmx.com/"

	cat org.gnome.shell.extensions.timer.gschema.xml.init | sed "s|__DEST__|${DEST}|" > org.gnome.shell.extensions.timer.gschema.xml
    $SUDO mkdir -p "$USR_SHARE/glib-2.0/schemas"
    $SUDO cp "org.gnome.shell.extensions.timer.gschema.xml" "$USR_SHARE/glib-2.0/schemas/"
    $SUDO glib-compile-schemas "$USR_SHARE/glib-2.0/schemas"
	#dconf write KEY VALUE
	#dconf write /org/gnome/shell/extensions/timer/sound-uri "'file:///home/steeve/.local/share/gnome-shell/extensions/timer@olebowle.gmx.com/kitchen_timer.ogg'"

    $SUDO mkdir -p "$USR_SHARE/icons/hicolor/scalable/apps"
    $SUDO cp "utilities-timer-symbolic.svg" "$USR_SHARE/icons/hicolor/scalable/apps/"
    $SUDO cp "gnome-shell-timer-config.svg" "$USR_SHARE/icons/hicolor/scalable/apps/"
    $SUDO gtk-update-icon-cache -q -t -f "$USR_SHARE/icons/hicolor"

    $SUDO mkdir -p "/usr/bin"
    $SUDO cp "gnome-shell-timer-config.py" "$DEST/timer@olebowle.gmx.com/gnome-shell-timer-config"
    $SUDO mkdir -p "$USR_SHARE/applications"
    $SUDO cp "gnome-shell-timer-config.desktop" "$USR_SHARE/applications/"
	dconf write /org/gnome/shell/extensions/timer/timer-config "'""$DEST/timer@olebowle.gmx.com/gnome-shell-timer-config""'"

    for lang in `locale -a | grep -o '^[[:alpha:]]\+_[[:alpha:]]\+'`; do
        if [ -d "po/$lang" ]; then
            $SUDO mkdir -p "$USR_SHARE/locale/$lang/LC_MESSAGES"
            $SUDO msgfmt -cv -o "$USR_SHARE/locale/$lang/LC_MESSAGES/gnome-shell-timer.mo" "po/$lang/gnome-shell-timer.po"
        fi
    done
    echo "timer-extension successfully installed"
    echo "Press Alt+F2 and type 'r' to refresh"
}

uninstall() {
    $SUDO rm -R "$DEST/timer@olebowle.gmx.com"
    $SUDO rm "$USR_SHARE/glib-2.0/schemas/org.gnome.shell.extensions.timer.gschema.xml"
    $SUDO glib-compile-schemas "$USR_SHARE/glib-2.0/schemas"
    dconf reset -f /org/gnome/shell/extensions/timer/

    $SUDO rm "$USR_SHARE/icons/hicolor/scalable/apps/utilities-timer-symbolic.svg"
    $SUDO rm "$USR_SHARE/icons/hicolor/scalable/apps/gnome-shell-timer-config.svg"
    $SUDO gtk-update-icon-cache -q -t -f "$USR_SHARE/icons/hicolor"

    $SUDO rm "$USR_SHARE/timer@olebowle.gmx.com/gnome-shell-timer-config"
    $SUDO rm "$USR_SHARE/applications/gnome-shell-timer-config.desktop"

    $SUDO find "$USR_SHARE/locale/" -type f -name "gnome-shell-timer.mo" -exec rm {} \;
    echo "timer-extension successfully uninstalled"
    echo "Press Alt+F2 and type 'r' to refresh"
}

if [ $# -lt 1 -o $# -gt 2 ] || [ $1 = "help" ]; then
    echo "Usage:"
    echo " $0 install [local] - Install timer-extension"
    echo " $0 uninstall [local] - Uninstall timer-extension"
    echo " $0 help - Show this help"
    exit 0
fi

SUDO="sudo"
if [ "$2" == "local" ]; then
	USR_SHARE=~/.local/share
	SUDO=""
else
	USR_SHARE=/usr/share
fi

DEST="$USR_SHARE/gnome-shell/extensions"

if [ $1 == "install" ]; then
    install
fi

if [ $1 == "uninstall" ]; then
    uninstall
fi
