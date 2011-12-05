//A simple timer for Gnome-shell, based on
//the original timer-applet https://launchpad.net/timer-applet
//https://github.com/codito/gnome-shell-pomodoro
//https://github.com/paradoxxxzero/gnome-shell-system-monitor-applet (drawPie)
//Copyright (C) 2011 Ole Ernst
//
//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.
//
//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//GNU General Public License for more details.
//
//You should have received a copy of the GNU General Public License
//along with this program.  If not, see <http://www.gnu.org/licenses/>.

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const ModalDialog = imports.ui.modalDialog;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('gnome-shell-timer');
const Util = imports.misc.util;
const _ = Gettext.gettext;

const Format = imports.misc.format;

function getSettings(schema) {
    if (Gio.Settings.list_schemas().indexOf(schema) == -1)
        throw _("Schema \"%s\" not found.").format(schema);
    return new Gio.Settings({ schema: schema });
}

function Indicator() {
    this._init.apply(this, arguments);
}

Indicator.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
        PanelMenu.Button.prototype._init.call(this, 0.0);
        String.prototype.format = Format.format;

        // Load settings
        this._settings = getSettings('org.gnome.shell.extensions.timer');

        let load_time = Lang.bind(this, function() {
            this._hours = this._settings.get_int('manual-hours');
            this._minutes = this._settings.get_int('manual-minutes');
            this._seconds = this._settings.get_int('manual-seconds');
            this._time = this._hours*3600 + this._minutes*60 + this._seconds;
        });

        let load_settings = Lang.bind(this, function() {
            this._showNotifications = this._settings.get_boolean('ui-notification');
            this._showPersistentNotifications = this._settings.get_boolean('ui-persistent');
            this._showElapsed = this._settings.get_boolean('ui-elapsed');
            this._timer.visible = this._settings.get_boolean('ui-time');
            this._pie.visible= this._settings.get_boolean('ui-chart');
            this._darkColor = this._settings.get_string('ui-dark-color');
            this._lightColor = this._settings.get_string('ui-light-color');
            this._presets = this._settings.get_value('presets').deep_unpack();
        });

        // Watch settings for changes
        this._settings.connect('changed::manual-hours', load_time);
        this._settings.connect('changed::manual-minutes', load_time);
        this._settings.connect('changed::manual-seconds', load_time);
        this._settings.connect('changed::ui-notification', load_settings);
        this._settings.connect('changed::ui-persistent', load_settings);
        this._settings.connect('changed::ui-elapsed', load_settings);
        this._settings.connect('changed::ui-time', load_settings);
        this._settings.connect('changed::ui-chart', load_settings);
        this._settings.connect('changed::ui-dark-color', load_settings);
        this._settings.connect('changed::ui-light-color', load_settings);
        this._settings.connect('changed::presets', load_settings);

        //Set Box
        this._box = new St.BoxLayout({ name: 'panelStatusMenu' });
        //Set Pie
        this._pie = new St.DrawingArea({ reactive: false});
        this._pie.set_width(30);
        this._pie.set_height(25);
        this._pie.connect('repaint', Lang.bind(this, this._draw));
        this._box.add(this._pie, { y_align: St.Align.MIDDLE, y_fill: false });
        //Set default menu
        this._timer = new St.Label();
        this._box.add(this._timer, { y_align: St.Align.MIDDLE, y_fill: false });

        this._timeSpent = 0;
        this._stopTimer = true;
        this._issuer = 'setTimer';
        load_time();
        load_settings();

        //Set Logo
        this._logo = new St.Icon({ icon_name: 'utilities-timer',
                                 style_class: 'system-status-icon',
                                 icon_type: St.IconType.SYMBOLIC});
        this.actor.add_actor(this._logo);

        //Toggle timer state button
        this._widget = new PopupMenu.PopupSwitchMenuItem(_("Run Timer"), false);
        this._widget.connect("toggled", Lang.bind(this, function() {
            this._stopTimer = !(this._stopTimer);
            this.actor.remove_actor(this._logo);
            this.actor.add_actor(this._box);
            this._refreshTimer();
        }));
        this.menu.addMenuItem(this._widget);

        //Reset Timer Menu
        let item = new PopupMenu.PopupMenuItem(_("Reset Timer"));
        item.connect('activate', Lang.bind(this, this._resetTimer));
        this.menu.addMenuItem(item);

        //Restart Timer Menu
        item = new PopupMenu.PopupMenuItem(_("Restart Timer"));
        item.connect('activate', Lang.bind(this, function() {
            this._timeSpent = 0;
            this._restartTimer();
        }));
        this.menu.addMenuItem(item);

        //Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        for (let ke in this._presets) {
        //introduce a new variable see:
        //https://mail.gnome.org/archives/gnome-shell-list/2011-August/msg00105.html
                let key = ke;
                let item = new PopupMenu.PopupMenuItem(_(key));
                let label = new St.Label();
                this._formatLabel(label, this._presets[key]);
                item.addActor(label);
                item.connect('activate', Lang.bind(this, function() {
                    this._time = this._presets[key];
                    this._issuer = key;
                    this._restartTimer();
                }));
                this.menu.addMenuItem(item);
        }

        //Separator only if there are presets
        for (let key in this._presets) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            break;
        }

        //Set Timer SubMenu
        this._timerMenu = new PopupMenu.PopupSubMenuMenuItem(_("Set Timer"));
        this._buildTimerMenu();
        this.menu.addMenuItem(this._timerMenu);

        item = new PopupMenu.PopupMenuItem(_("Preferences..."));
        item.connect('activate', function () {
            Util.spawn(['gnome-shell-timer-config']);
        });
        this.menu.addMenuItem(item);

        //Create persistent message modal dialog
        this._persistentMessageDialog = new ModalDialog.ModalDialog();
        this._persistentMessageLabel = new St.Label({ style_class: 'persistent-message-label',
        text: _("Timer finished!") });
        this._persistentMessageDialog.contentLayout.add(this._persistentMessageLabel, { x_fill: true, y_fill: true });
        this._persistentMessageDialog.setButtons([{ label: _("Close"),
            action: Lang.bind(this, function(param) { this._persistentMessageDialog.close(); }),
            key:    Clutter.Escape
        }]);

        //Start the timer
        this._refreshTimer();
    },

    //Add sliders SubMenu to manually set the timer
    _buildTimerMenu: function() {
        //Hours
        let item = new PopupMenu.PopupMenuItem(_("Hours"), { reactive: false });
        this._hoursLabel = new St.Label({ text: this._hours.toString() + "h" });
        item.addActor(this._hoursLabel);
        this._timerMenu.menu.addMenuItem(item);

        this._hoursSlider = new PopupMenu.PopupSliderMenuItem(this._hours);
        this._hoursSlider._value = this._hours / 23;
        this._hoursSlider.connect('value-changed', Lang.bind(this, function() {
            this._hours = Math.ceil(this._hoursSlider._value*23);
            this._hoursLabel.set_text(this._hours.toString() + "h");
            this._time = this._hours*3600 + this._minutes*60 + this._seconds;
            this._issuer = 'setTimer';
        } ));
        this._timerMenu.menu.addMenuItem(this._hoursSlider);

        //Minutes
        item = new PopupMenu.PopupMenuItem(_("Minutes"), { reactive: false });
        this._minutesLabel = new St.Label({ text: this._minutes.toString() + "m" });
        item.addActor(this._minutesLabel);
        this._timerMenu.menu.addMenuItem(item);

        this._minutesSlider = new PopupMenu.PopupSliderMenuItem(this._minutes);
        this._minutesSlider._value = this._minutes / 59;
        this._minutesSlider.connect('value-changed', Lang.bind(this, function() {
            this._minutes = Math.ceil(this._minutesSlider._value*59);
            this._minutesLabel.set_text(this._minutes.toString() + "m");
            this._time = this._hours*3600 + this._minutes*60 + this._seconds;
            this._issuer = 'setTimer';
        } ));
        this._timerMenu.menu.addMenuItem(this._minutesSlider);

        //Seconds
        item = new PopupMenu.PopupMenuItem(_("Seconds"), { reactive: false });
        this._secondsLabel = new St.Label({ text: this._seconds.toString() + "s" });
        item.addActor(this._secondsLabel);
        this._timerMenu.menu.addMenuItem(item);

        this._secondsSlider = new PopupMenu.PopupSliderMenuItem(this._seconds);
        this._secondsSlider._value = this._seconds / 59;
        this._secondsSlider.connect('value-changed', Lang.bind(this, function() {
            this._seconds = Math.ceil(this._secondsSlider._value*59);
            this._secondsLabel.set_text(this._seconds.toString() + "s");
            this._time = this._hours*3600 + this._minutes*60 + this._seconds;
            this._issuer = 'setTimer';
        } ));
        this._timerMenu.menu.addMenuItem(this._secondsSlider);
    },

    //Draw Pie
    _draw: function() {
        let [width, height] = this._pie.get_surface_size();
        let cr = this._pie.get_context();
        let xc = width / 2;
        let yc = height / 2;
        let pi = Math.PI;
        function arc(r, value, max, angle, lightColor, darkColor) {
            if(max == 0) return;
            let light = new Clutter.Color();
            light.from_string(lightColor);
            let dark = new Clutter.Color();
            dark.from_string(darkColor);
            Clutter.cairo_set_source_color(cr, light);
            cr.arc(xc, yc, r, 0, 2*pi);
            cr.fill();
            Clutter.cairo_set_source_color(cr, dark);
            let new_angle = angle + (value * 2 * pi / max);
            cr.setLineWidth(1.3);
            cr.arc(xc, yc, r, angle, new_angle);
            cr.lineTo(xc,yc);
            cr.closePath();
            cr.fill();
        }
        /*let background = new Clutter.Color();
        background.from_string('#0000ffff');
        Clutter.cairo_set_source_color(cr, background);
        cr.rectangle(0, 0, width, height);
        cr.fill();*/
        arc(8,this._timeSpent,this._time,-pi/2, this._lightColor, this._darkColor);
    },

    //Reset all counters and timers
    _restartTimer: function() {
        if(this._stopTimer) {
            this._widget.setToggleState(true);
            this.actor.remove_actor(this._logo);
            this.actor.add_actor(this._box);
            this._stopTimer = false;
            this._refreshTimer();
        }
    },

    //Reset all counters and timers
    _resetTimer: function() {
        this._widget.setToggleState(false);
        this.actor.remove_actor(this._box);
        this.actor.add_actor(this._logo);
        this._stopTimer = true;
        this._timeSpent = 0;
    },

    //Increment timeSpent and call function to update ui_timer
    _refreshTimer: function() {
        if (this._stopTimer == false) {
            this._pie.queue_repaint();
            this._timeSpent += 1;
            Mainloop.timeout_add_seconds(1, Lang.bind(this, this._refreshTimer));
        }

        if(this._timeSpent && this._time <= this._timeSpent) {
            this._resetTimer();
            if(this._issuer == 'setTimer')
                this._notifyUser(_("Timer finished!"));
            else {
                this._notifyUser(_("Preset \"%s\" finished!").format(this._issuer));
            }
        }
        if(this._showElapsed)
            this._formatLabel(this._timer, this._timeSpent);
        else
            this._formatLabel(this._timer, this._time - this._timeSpent);
    },

    //Update timer_ui
    _formatLabel: function(label, seconds) {
        let hours = parseInt(seconds / 3600);
        seconds -= hours * 3600;
        let minutes = parseInt(seconds / 60);
        seconds -= minutes * 60;

        if(hours)
            label.set_text("%02d:%02d:%02d".format(hours,minutes,seconds));
        else
            label.set_text("%02d:%02d".format(minutes,seconds));
    },

    //Notify user of changes
    _notifyUser: function(text) {
        if(this._showNotifications) {
            let source = new MessageTray.SystemNotificationSource();
            Main.messageTray.add(source);
            let notification = new MessageTray.Notification(source, text, null);
            notification.setTransient(true);
            source.notify(notification);
        }
        if(this._showPersistentNotifications) {
            this._persistentMessageLabel.set_text(text);
            this._persistentMessageDialog.open();
        }
    }
};

let indicator;

function init() {
}

function enable() {
    indicator = new Indicator();
    Main.panel.addToStatusArea('indicator', indicator);
}

function disable() {
    indicator.destroy();
}
