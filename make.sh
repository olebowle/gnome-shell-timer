#!/bin/bash

install() {
    sudo mkdir -p "/usr/share/gnome-shell/extensions"
    sudo cp -R "timer@olebowle.gmx.com" "/usr/share/gnome-shell/extensions/"

    sudo mkdir -p "/usr/share/glib-2.0/schemas"
    sudo cp "org.gnome.shell.extensions.timer.gschema.xml" "/usr/share/glib-2.0/schemas/"
    sudo glib-compile-schemas "/usr/share/glib-2.0/schemas"

    sudo mkdir -p "/usr/share/icons/hicolor/scalable/apps"
    sudo cp "utilities-timer-symbolic.svg" "/usr/share/icons/hicolor/scalable/apps/"
    sudo cp "gnome-shell-timer-config.svg" "/usr/share/icons/hicolor/scalable/apps/"
    sudo gtk-update-icon-cache -q -t -f "/usr/share/icons/hicolor"

    sudo mkdir -p "/usr/bin"
    sudo cp "gnome-shell-timer-config.py" "/usr/bin/gnome-shell-timer-config"
    sudo mkdir -p "/usr/share/applications"
    sudo cp "gnome-shell-timer-config.desktop" "/usr/share/applications/"

    for lang in `locale -a | grep '^[[:alpha:]]\+_[[:alpha:]]\+$'`; do
        if [ -d "po/$lang" ]; then
            sudo mkdir -p "/usr/share/locale/$lang/LC_MESSAGES"
            sudo msgfmt -cv -o "/usr/share/locale/$lang/LC_MESSAGES/gnome-shell-timer.mo" "po/$lang/gnome-shell-timer.po"
        fi
    done
    echo "timer-extension successfully installed"
    echo "Press Alt+F2 and type 'r' to refresh"
}

uninstall() {
    sudo rm -R "/usr/share/gnome-shell/extensions/timer@olebowle.gmx.com"
    sudo rm "/usr/share/glib-2.0/schemas/org.gnome.shell.extensions.timer.gschema.xml"
    sudo glib-compile-schemas "/usr/share/glib-2.0/schemas"
    dconf reset -f /org/gnome/shell/extensions/timer/

    sudo rm "/usr/share/icons/hicolor/scalable/apps/utilities-timer-symbolic.svg"
    sudo rm "/usr/share/icons/hicolor/scalable/apps/gnome-shell-timer-config.svg"
    sudo gtk-update-icon-cache -q -t -f "/usr/share/icons/hicolor"

    sudo rm "/usr/bin/gnome-shell-timer-config"
    sudo rm "/usr/share/applications/gnome-shell-timer-config.desktop"

    sudo find "/usr/share/locale/" -type f -name "gnome-shell-timer.mo" -exec rm {} \;
    echo "timer-extension successfully uninstalled"
    echo "Press Alt+F2 and type 'r' to refresh"
}

if [ $# -ne "1" ] || [ $1 = "help" ]; then
    echo "Usage:"
    echo " $0 install - Install timer-extension"
    echo " $0 uninstall - Uninstall timer-extension"
    echo " $0 help - Show this help"
    exit 0
fi

if [ $1 = "install" ]; then
    install
fi

if [ $1 = "uninstall" ]; then
    uninstall
fi
