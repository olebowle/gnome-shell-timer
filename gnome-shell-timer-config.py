#!/usr/bin/env python2
# -*- coding: utf-8 -*-
# -*- Mode: Python; py-indent-offset: 4 -*-
# vim: tabstop=4 shiftwidth=4 expandtab

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

# Author: Ole Ernst aka olebowle
# based upon system-monitor-applet-config.py from Florian Mounier aka paradoxxxzero

"""
timer-applet-config
Tool for editing timer-applet preference as
an alternative of dconf-editor

"""

import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, Gio, Gdk, GLib

import os.path
import gettext
from gettext import gettext as _
gettext.textdomain('gnome-shell-timer')

main_window = None

def color_to_hex(color):
    return "#%02x%02x%02x%02x" % (
        color.red * 255,
        color.green * 255,
        color.blue * 255,
        color.alpha * 255)

def hex_to_color(hexstr):
    return Gdk.RGBA(
        int(hexstr[1:3], 16) / 255.,
        int(hexstr[3:5], 16) / 255.,
        int(hexstr[5:7], 16) / 255.,
        int(hexstr[7:9], 16) / 255. if len(hexstr) == 9 else 1) \
        if (len(hexstr) != 4 & len(hexstr) != 5) else Gdk.RGBA(
        int(hexstr[1], 16) / 15.,
        int(hexstr[2], 16) / 15.,
        int(hexstr[3], 16) / 15.,
        int(hexstr[4], 16) / 15. if len(hexstr) == 5 else 1)

class ColorSelect:
    def __init__(self, name):
        self.label = Gtk.Label(_('{} Chart Color: '.format(name)))
        self.picker = Gtk.ColorButton()
        self.actor = Gtk.HBox()
        self.actor.add(self.label)
        self.actor.add(self.picker)
        self.picker.set_use_alpha(True)

    def set_value(self, value):
        self.picker.set_rgba(hex_to_color(value))


class IntSelect:
    def __init__(self, name):
        self.label = Gtk.Label(name + ": ")
        self.spin = Gtk.SpinButton()
        self.actor = Gtk.HBox()
        self.actor.add(self.label)
        self.actor.add(self.spin)
        self.spin.set_numeric(True)

    def set_args(self, minv, maxv, incre, page):
        self.spin.set_range(minv, maxv)
        self.spin.set_increments(incre, page)

    def set_value(self, value):
        self.spin.set_value(value)


def set_boolean(check, schema, name):
    schema.set_boolean(name, check.get_active())

def set_int(spin, schema, name):
    schema.set_int(name, spin.get_value_as_int())
    return False

def set_color(color, schema, name):
    schema.set_string(name, color_to_hex(color.get_rgba()))

def set_string(combo, schema, name, _slist):
    schema.set_string(name,  _slist[combo.get_active()])

def set_presets(store, schema):
    presets = {}
    for key in store:
        presets[key[0]] = key[1]
    schema.set_value('presets', GLib.Variant('a{si}', presets))

def delete_row(data, treeview, store, schema):
    model, row = treeview.get_selection().get_selected()
    store.remove(row)
    set_presets(store, schema)

def add_row(data, store, schema):
    store.append(("<unnamed>", 0))
    set_presets(store, schema)

def edited_name(cell, path, new_text, treeview, store, schema):
    model, rows = treeview.get_selection().get_selected()
    store[rows][0] = new_text
    set_presets(store, schema)

def edited_duration(cell, path, new_text, treeview, store, schema):
    model, rows = treeview.get_selection().get_selected()
    store[rows][1] = int(new_text)
    set_presets(store, schema)

class SettingFrame:
    def __init__(self, name, schema):
        self.schema = schema
        self.label = Gtk.Label(name)
        self.frame = Gtk.Frame()
        self.frame.set_border_width(10)
        self.vbox = Gtk.VBox(spacing=20)
        self.hbox0 = Gtk.HBox(spacing=20)
        self.hbox1 = Gtk.HBox(spacing=20)
        self.hbox2 = Gtk.HBox(spacing=20)
        self.hbox3 = Gtk.HBox(spacing=20)
        self.frame.add(self.vbox)
        self.vbox.pack_start(self.hbox0, True, False, 0)
        self.vbox.pack_start(self.hbox1, True, False, 0)
        self.vbox.pack_start(self.hbox2, True, False, 0)
        self.vbox.pack_start(self.hbox3, True, False, 0)

    def add(self, key):
        sections = key.split('-')
        if sections[0] == 'presets':
            store = Gtk.ListStore(str, int)
            presets = self.schema.get_value(key)
            for key in presets.keys():
                store.append([key, presets[key]])
            treeView = Gtk.TreeView(store)
            treeView.set_rules_hint(True)
            cellrenderer = Gtk.CellRendererText()
            cellrenderer.set_property('editable', True)
            column = Gtk.TreeViewColumn(_("Name"), cellrenderer, text=0)
            cellrenderer.connect('edited', edited_name, treeView, store, self.schema)
            column.set_sort_column_id(0)    
            treeView.append_column(column)
            cellrenderer = Gtk.CellRendererText()
            cellrenderer.set_property('editable', True)
            column = Gtk.TreeViewColumn(_("Duration in Seconds"), cellrenderer, text=1)
            cellrenderer.connect('edited', edited_duration, treeView, store, self.schema)
            column.set_sort_column_id(1)
            treeView.append_column(column)
            self.hbox0.add(treeView)

            item = Gtk.Button(label=_('Add'))
            self.hbox1.add(item)
            item.connect('clicked', add_row, store, self.schema)

            item = Gtk.Button(label=_('Delete selected'))
            self.hbox1.add(item)
            item.connect('clicked', delete_row, treeView, store, self.schema)

        elif sections[1] == 'hours':
            self.hbox0.add(Gtk.Label(_('Set default timer values:')))
            item = IntSelect(_('Hours'))
            item.set_args(0, 23, 1, 10)
            item.set_value(self.schema.get_int(key))
            self.hbox1.add(item.actor)
            item.spin.connect('output', set_int, self.schema, key)
        elif sections[1] == 'minutes':
            item = IntSelect(_('Minutes'))
            item.set_args(0, 59, 1, 10)
            item.set_value(self.schema.get_int(key))
            self.hbox2.add(item.actor)
            item.spin.connect('output', set_int, self.schema, key)
        elif sections[1] == 'seconds':
            item = IntSelect(_('Seconds'))
            item.set_args(0, 59, 1, 10)
            item.set_value(self.schema.get_int(key))
            self.hbox3.add(item.actor)
            item.spin.connect('output', set_int, self.schema, key)
        elif sections[1] == 'notification':
            item = Gtk.CheckButton(label=_('Show Notification'))
            item.set_active(self.schema.get_boolean(key))
            self.hbox0.add(item)
            item.connect('toggled', set_boolean, self.schema, key)
        elif sections[1] == 'persistent':
            item = Gtk.CheckButton(label=_('Show Persistent Notification'))
            item.set_active(self.schema.get_boolean(key))
            self.hbox0.add(item)
            item.connect('toggled', set_boolean, self.schema, key)
        elif sections[1] == 'elapsed':
            item = Gtk.CheckButton(label=_('Show Elapsed Time'))
            item.set_active(self.schema.get_boolean(key))
            self.hbox2.add(item)
            item.connect('toggled', set_boolean, self.schema, key)
        elif sections[1] == 'time':
            item = Gtk.CheckButton(label=_('Show Time'))
            item.set_active(self.schema.get_boolean(key))
            self.hbox1.add(item)
            item.connect('toggled', set_boolean, self.schema, key)
        elif sections[1] == 'chart':
            item = Gtk.CheckButton(label=_('Show Chart'))
            item.set_active(self.schema.get_boolean(key))
            self.hbox1.add(item)
            item.connect('toggled', set_boolean, self.schema, key)
        elif len(sections) == 3 and sections[2] == 'color':
            item = ColorSelect(_(sections[1].capitalize()))
            item.set_value(self.schema.get_string(key))
            self.hbox3.pack_end(item.actor, True, False, 0)
            item.picker.connect('color-set', set_color, self.schema, key)
        elif key == "sound-enable":
            item = Gtk.CheckButton(label=_('Enable sound'))
            item.set_active(self.schema.get_boolean(key))
            self.hbox1.add(item)
            item.connect('toggled', set_boolean, self.schema, key)
        elif key == "sound-loop":
            item = Gtk.CheckButton(label=_('Loop sound'))
            item.set_active(self.schema.get_boolean(key))
            self.hbox1.add(item)
            item.connect('toggled', set_boolean, self.schema, key)
        elif key == "sound-uri":
            item = Gtk.Button(label=_('Select sound file'))
            self.hbox2.add(item)
            label = Gtk.Label(label=_("Current sound file : ")+str(os.path.basename(self.schema.get_string(key))))
            self.hbox3.add(label)
            item.connect('clicked', self.on_file_clicked, label)
   
    def on_file_clicked(self, widget, label):
        dialog = Gtk.FileChooserDialog(_("Please choose a file"), main_window,
            Gtk.FileChooserAction.OPEN,
            (Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL,
             Gtk.STOCK_OPEN, Gtk.ResponseType.OK))
             
        filter_sound = Gtk.FileFilter()
        filter_sound.set_name(_("Audio file"))
        filter_sound.add_mime_type("audio/*")
        dialog.add_filter(filter_sound)

        filter_any = Gtk.FileFilter()
        filter_any.set_name(_("Any files"))
        filter_any.add_pattern("*")
        dialog.add_filter(filter_any)

        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            self.schema.set_string("sound-uri", dialog.get_uri())
            label.set_text(_("Current sound file : ")+str(os.path.basename(self.schema.get_string("sound-uri"))))
        elif response == Gtk.ResponseType.CANCEL:
            pass

        dialog.destroy()

class App:
    setting_items = ('manual', 'ui', 'presets', 'sound')

    def __init__(self):
        self.schema = Gio.Settings('org.gnome.shell.extensions.timer')
        keys = self.schema.keys()
        self.window = Gtk.Window(title=_('Timer Applet Configurator'))
        self.window.connect('destroy', Gtk.main_quit)
        self.window.set_border_width(10)
        global main_window
        main_window = self.window
        self.items = []
        self.settings = {}
        for setting in self.setting_items:
            self.settings[setting] = SettingFrame(
                _(setting.capitalize()), self.schema)

        self.main_vbox = Gtk.VBox(spacing=10)
        self.window.add(self.main_vbox)
        for key in keys:
            sections = key.split('-')
            if sections[0] in self.setting_items:
                self.settings[sections[0]].add(key)

        self.notebook = Gtk.Notebook()
        for setting in self.setting_items:
            self.notebook.append_page(
                self.settings[setting].frame, self.settings[setting].label)
        self.main_vbox.pack_start(self.notebook, True, True, 0)
        self.window.set_resizable(False)
        self.window.show_all()


def main():
    App()
    Gtk.main()

if __name__ == '__main__':
    main()
