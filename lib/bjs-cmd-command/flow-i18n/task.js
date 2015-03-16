'use strict';


var PATH = require('path');
var colors = require('colors');
var UTIL = require('../../bjs-util/util.js');

var task = require(PATH.join(__dirname, 'lib/i18n.js'));
var cwd = process.cwd();

module.exports = {
	xgettext: function(lang, conf) {
		if (arguments.length < 2) {
			console.log('[Error]: '.red + 'lang is required!');
			return;
		}
		UTIL.log();
		lang = lang.split(',');
		var src = /^\./.test(conf.i18n.src) ? PATH.join(cwd, conf.i18n.src) : conf.i18n.src;
		var mdst = /^\./.test(conf.i18n.mdst) ? PATH.join(cwd, conf.i18n.mdst) : conf.i18n.mdst;
		var po = /^\./.test(conf.i18n.po) ? PATH.join(cwd, conf.i18n.po) : conf.i18n.po;
		lang.forEach(function(itm) {
			task.xgettext(src, PATH.dirname(po), po.replace('{lang}', itm), po.replace('{lang}', itm));
			UTIL.logc();
		});
		UTIL.log(true);
	},


	gettext: function(lang, conf) {
		if (arguments.length < 2) {
			console.log('[Error]: '.red + 'lang is required!');
			return;
		}
		UTIL.log();
		lang = lang.split(',');
		var msrc = /^\./.test(conf.i18n.msrc) ? PATH.join(cwd, conf.i18n.msrc) : conf.i18n.msrc;
		var mdst = /^\./.test(conf.i18n.mdst) ? PATH.join(cwd, conf.i18n.mdst) : conf.i18n.mdst;
		var po = /^\./.test(conf.i18n.po) ? PATH.join(cwd, conf.i18n.po) : conf.i18n.po;
		var vsrc = conf.i18n.vsrc && /^\./.test(conf.i18n.vsrc) ? PATH.join(cwd, conf.i18n.vsrc) : conf.i18n.vsrc;
		var vdst = conf.i18n.vsrc && /^\./.test(conf.i18n.vdst) ? PATH.join(cwd, conf.i18n.vdst) : conf.i18n.vdst;
		lang.forEach(function(itm) {
			task.gettext(po.replace('{lang}', itm), msrc, mdst.replace('{lang}', itm));
			conf.i18n.vsrc ? task.gettext(po.replace('{lang}', itm), vsrc, vdst.replace('{lang}', itm)) : null;
			UTIL.logc();
		});
		UTIL.log(true);
	}

}