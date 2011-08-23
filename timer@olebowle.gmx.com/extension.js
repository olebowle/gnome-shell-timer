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

//TODO: notification loop, to notify user after end of timer, maybe play sound

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const Pango = imports.gi.Pango;
const St = imports.gi.St;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('gnome-shell');
const _ = Gettext.gettext;

let _configVersion = "0.1";
//[ <variable>, <config_category>, <actual_option>, <default_value> ]
let _configOptions = [
    ["_hours", "timer", "hours", 0],
    ["_minutes", "timer", "minutes", 10],
    ["_seconds", "timer", "seconds", 0],
    ["_showMessages", "ui", "show_messages", true],
    ["_showElapsed", "ui", "show_elapsed_time", false],
    ["_presets", "presets", "presets", {}],
];

function Indicator() {
    this._init.apply(this, arguments);
}

Indicator.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
        PanelMenu.Button.prototype._init.call(this, 0.0);

        //Set default values of options, and then override from config file
        this._parseConfig();
        this._timeSpent = 0;
        this._time = this._hours*3600 + this._minutes*60 + this._seconds;
        this._stopTimer = true;

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

        //Set Logo
        this._logo = new St.Icon({ icon_name: 'timer-applet',
                                 style_class: 'system-status-icon',
                                 icon_type: St.IconType.FULLCOLOR});
        this.actor.set_child(this._logo);

        //Toggle timer state button
        this._widget = new PopupMenu.PopupSwitchMenuItem(_("Run Timer"), false);
        this._widget.connect("toggled", Lang.bind(this, function() {
            this._stopTimer = !(this._stopTimer);
            this.actor.set_child(this._box);
            this._refreshTimer();
        }));
        this.menu.addMenuItem(this._widget);

        //Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        //Reset Timer Menu
        let item = new PopupMenu.PopupMenuItem(_("Reset Timer"));
        item.connect('activate', Lang.bind(this, this._resetTimer));
        this.menu.addMenuItem(item);

        //Restart Timer Menu
        item = new PopupMenu.PopupMenuItem(_("Restart Timer"));
        item.connect('activate', Lang.bind(this, function() {
            this._widget.setToggleState(true);
            this.actor.set_child(this._box);
            this._timeSpent = 0;
            this._stopTimer = false;
            this._refreshTimer();
        }));
        this.menu.addMenuItem(item);

        //Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        //check if there is at least one preset
        let showPresetMenu = false;
        for (let key in this._presets) {
            showPresetMenu = true;
            break;
        }

        if(showPresetMenu) {
            //Presets SubMenu
            this._presetsMenu = new PopupMenu.PopupSubMenuMenuItem("Presets");
            this._buildPresetsMenu();
            this.menu.addMenuItem(this._presetsMenu);
        }

        //Set Timer SubMenu
        this._timerMenu = new PopupMenu.PopupSubMenuMenuItem(_("Set Timer"));
        this._buildTimerMenu();
        this.menu.addMenuItem(this._timerMenu);

        //Options SubMenu
        this._optionsMenu = new PopupMenu.PopupSubMenuMenuItem(_("Options"));
        this._buildOptionsMenu();
        this.menu.addMenuItem(this._optionsMenu);

        //Start the timer
        this._refreshTimer();
    },

    //Add all available presets to Preset SubMenu
    _buildPresetsMenu: function() {
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
                this._timeSpent = 0;
                if(this._stopTimer) {
                    this._widget.setToggleState(true);
                    this.actor.set_child(this._box);
                    this._stopTimer = false;
                    this._refreshTimer();
                }
            }));
            this._presetsMenu.menu.addMenuItem(item);
        }
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
        this._hoursSlider.connect('drag-end', Lang.bind(this, function() {
            this._hours = Math.ceil(this._hoursSlider._value*23);
            this._hoursLabel.set_text(this._hours.toString() + "h");
            this._time = this._hours*3600 + this._minutes*60 + this._seconds;
            this._saveConfig();
        } ));
        this._timerMenu.menu.addMenuItem(this._hoursSlider);

        //Minutes
        item = new PopupMenu.PopupMenuItem(_("Minutes"), { reactive: false });
        this._minutesLabel = new St.Label({ text: this._minutes.toString() + "m" });
        item.addActor(this._minutesLabel);
        this._timerMenu.menu.addMenuItem(item);

        this._minutesSlider = new PopupMenu.PopupSliderMenuItem(this._minutes);
        this._minutesSlider._value = this._minutes / 59;
        this._minutesSlider.connect('drag-end', Lang.bind(this, function() {
            this._minutes = Math.ceil(this._minutesSlider._value*59);
            this._minutesLabel.set_text(this._minutes.toString() + "m");
            this._time = this._hours*3600 + this._minutes*60 + this._seconds;
            this._saveConfig();
        } ));
        this._timerMenu.menu.addMenuItem(this._minutesSlider);

        //Seconds
        item = new PopupMenu.PopupMenuItem(_("Seconds"), { reactive: false });
        this._secondsLabel = new St.Label({ text: this._seconds.toString() + "s" });
        item.addActor(this._secondsLabel);
        this._timerMenu.menu.addMenuItem(item);

        this._secondsSlider = new PopupMenu.PopupSliderMenuItem(this._seconds);
        this._secondsSlider._value = this._seconds / 59;
        this._secondsSlider.connect('drag-end', Lang.bind(this, function() {
            this._seconds = Math.ceil(this._secondsSlider._value*59);
            this._secondsLabel.set_text(this._seconds.toString() + "s");
            this._time = this._hours*3600 + this._minutes*60 + this._seconds;
            this._saveConfig();
        } ));
        this._timerMenu.menu.addMenuItem(this._secondsSlider);
    },

    //Add whatever options the timer needs to this submenu
    _buildOptionsMenu: function() {
        //Timer format Menu
        if(this._showElapsed)
            formatItem = new PopupMenu.PopupMenuItem(_("Show Remaining Time"));
        else
            formatItem = new PopupMenu.PopupMenuItem(_("Show Elapsed Time"));
        formatItem.connect('activate', Lang.bind(this, function() {
            if (this._showElapsed) {
                this._showElapsed = false;
                formatItem.label.set_text(_("Show Elapsed Time"));
            } else {
                this._showElapsed = true;
                formatItem.label.set_text(_("Show Remaining Time"));
            }
            this._saveConfig();
        }));
        this._optionsMenu.menu.addMenuItem(formatItem);

        //ShowMessages option toggle
        let item = new PopupMenu.PopupSwitchMenuItem(_("Show Notification Messages"), this._showMessages);
        item.connect("toggled", Lang.bind(this, function() {
            this._showMessages = !(this._showMessages);
            this._saveConfig();
        }));
        this._optionsMenu.menu.addMenuItem(item);
    },

    //Draw Pie
    _draw: function() {
        let [width, height] = this._pie.get_surface_size();
        let cr = this._pie.get_context();
        let xc = width / 2;
        let yc = height / 2;
        let pi = Math.PI;
        function arc(r, value, max, angle) {
            if(max == 0) return;
            let white = new Clutter.Color();
            white.from_string('#ccccccff');
            let dark = new Clutter.Color();
            dark.from_string('#474747ff');
            Clutter.cairo_set_source_color(cr, white);
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
        arc(11,this._timeSpent,this._time,-pi/2);
    },

    //Reset all counters and timers
    _resetTimer: function() {
        this._widget.setToggleState(false);
        this.actor.set_child(this._logo);
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
            this._notifyUser("Timer finished!");
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

        //Weird way to show 2-digit number, but js doesn't have a native padding function
        if (hours < 10)
            hours = "0" + hours.toString();
        else
            hours = hours.toString();

        if (minutes < 10)
            minutes = "0" + minutes.toString();
        else
            minutes = minutes.toString();

        if (seconds < 10)
            seconds = "0" + seconds.toString();
        else
            seconds = seconds.toString();

        if(hours != "00")
            label.set_text(hours + ":" + minutes + ":" + seconds);
        else
            label.set_text(minutes + ":" + seconds);
    },

    //Notify user of changes
    _notifyUser: function(text) {
        if(this._showMessages) {
            let source = new MessageTray.SystemNotificationSource();
            Main.messageTray.add(source);
            let notification = new MessageTray.Notification(source, text, null);
            notification.setTransient(true);
            source.notify(notification);
        }
    },

    _parseConfig: function() {
        let _configFile = GLib.get_user_config_dir() + "/gnome-shell-timer/gnome_shell_timer.json";
        //Set the default values
        for (let i = 0; i < _configOptions.length; i++)
            this[_configOptions[i][0]] = _configOptions[i][3];

        if (GLib.file_test(_configFile, GLib.FileTest.EXISTS)) {
            let filedata = null;

            try {
                filedata = GLib.file_get_contents(_configFile, null, 0);
                global.log("Timer: Using config file = " + _configFile);

                let jsondata = JSON.parse(filedata[1]);
                let parserVersion = null;
                if (jsondata.hasOwnProperty("version"))
                    parserVersion = jsondata.version;
                else
                    throw "Parser version not defined";

                for (let i = 0; i < _configOptions.length; i++) {
                    let option = _configOptions[i];
                    if (jsondata.hasOwnProperty(option[1]) && jsondata[option[1]].hasOwnProperty(option[2])) {
                        //The option "category" and the actual option is defined in config file,
                        //override it!
                        this[option[0]] = jsondata[option[1]][option[2]];
                    }
                }
            }
            catch (e) {
                global.logError("Timer: Error reading config file = " + e);
            }
            finally {
                filedata = null;
            }
        }
    },

    _saveConfig: function() {
        let _configDir = GLib.get_user_config_dir() + "/gnome-shell-timer";
        let _configFile = _configDir + "/gnome_shell_timer.json";
        let filedata = null;
        let jsondata = {};

        if (!GLib.file_test(_configDir, GLib.FileTest.EXISTS | GLib.FileTest.IS_DIR) &&
                GLib.mkdir_with_parents(_configDir, 0755) != 0) {
                    global.logError("Timer: Failed to create configuration directory. Path = " +
                            _configDir + ". Configuration will not be saved.");
                }

        try {
            jsondata["version"] = _configVersion;
            for (let i = 0; i < _configOptions.length; i++) {
                let option = _configOptions[i];
                //Insert the option "category", if it's undefined
                if (!jsondata.hasOwnProperty(option[1])) {
                    jsondata[option[1]] = {};
                }

                //Update the option key/value pairs
                jsondata[option[1]][option[2]] = this[option[0]];
            }
            filedata = JSON.stringify(jsondata, null, "  ");
            GLib.file_set_contents(_configFile, filedata, filedata.length);
        }
        catch (e) {
            global.logError("Timer: Error writing config file = " + e);
        }
        finally {
            jsondata = null;
            filedata = null;
        }
        global.log("Timer: Updated config file = " + _configFile);
    }
};

//Put your extension initialization code here
function main() {
    Main.StatusIconDispatcher.STANDARD_TRAY_ICON_IMPLEMENTATIONS['timer'] = 'timer';
    Main.Panel.STANDARD_TRAY_ICON_ORDER.unshift('timer');
    Main.Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['timer'] = Indicator;
}
