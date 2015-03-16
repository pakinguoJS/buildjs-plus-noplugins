/**
 *
 *
 */

'use strict';

var FS = require('fs');
var PATH = require('path');
var colors = require('colors');

var bjs = {};


/**
 * 路由
 * @return {[type]} [description]
 */
bjs.run = function() {
	// read config & exec
	var cwd = process.cwd();
	var confPath = PATH.join(cwd, 'bjs.conf.js');
	if (FS.existsSync(confPath)) {
		eval(FS.readFileSync(confPath, 'utf8'));
	}

	var argvs = process.argv;
	switch (argvs[2]) {
		case 'init':
			logParam() ? require('lib/bjs-init/init.js')(argvs[3]) : null;
			break;
		case 'watch':
			logConf() ? require(PATH.join(__dirname, 'lib', FS.readFileSync(PATH.join(__dirname, 'lib', 'config.conf'), 'utf8'))).watch(bjs) : null;
			break;
		case 'stop':
			logConf() ? require(PATH.join(__dirname, 'lib', FS.readFileSync(PATH.join(__dirname, 'lib', 'config.conf'), 'utf8'))).unwatch() : null;
			break;
		case 'clear':
			logConf() ? require(PATH.join(__dirname, 'lib', FS.readFileSync(PATH.join(__dirname, 'lib', 'config.conf'), 'utf8'))).clear() : null;
			break;
		case 'change':
			logParam() ? bjs.change(argvs[3]) : null;
			break;
		case 'xgettext':
			logParam() ? require(PATH.join(__dirname, 'lib/bjs-cmd-command/flow-i18n/task.js')).xgettext(argvs[3], bjs.config) : null;
			break;
		case 'gettext':
			logParam() ? require(PATH.join(__dirname, 'lib/bjs-cmd-command/flow-i18n/task.js')).gettext(argvs[3], bjs.config) : null;
			break;
	}

	function logConf() {
		if (!FS.existsSync(confPath)) {
			console.log('[Error]: '.red + 'bjs.conf.js is required!');
			return false;
		} else {
			return true
		}
	}

	function logParam() {
		if (!argvs[3]) {
			console.log('[Error]: '.red + 'lang parameters are required!');
			return false;
		}else{
			return true;
		}
	}
}


/**
 * 配置
 * @param {string} key 配置项键值
 * @param {string||object} value 配置项的值
 */
bjs.set = function(key, value) {
		if (typeof key === 'object') {
			for (var itm in key) {
				if (!(itm in bjs.config)) {
					return;
				}
				bjs.config[itm] = key[itm];
			}
		} else {
			if (!(key in bjs.config)) {
				return;
			}
			bjs.config[key] = value;
		}
	}
	// 配置项
bjs.config = {

	// 项目采用的模块加载类型，仅支持cmd、amd、none（目前仅完成cmd）
	ctype: 'cmd',

	// 项目模块源路径
	src: './src',

	// 项目模块默认部署路径
	dst: '../resource/src',

	// 默认部署的路径，即是dst的父级目录
	dist: '../resource',

	// tpl输出的路径，适合smarty
	view: '../views/src',

	// cmd配置文件路径
	conf: './conf/conf.js',

	// 忽略第三方库文件
	ignore: './lib',

	// 忽略指定的合并压缩的过程的模块
	mignore: {
		js: {},
		css: {}
	},

	// 是否使用smarty，如果是，则调用flow-filter重定义view层tpl的路径
	smarty: true,

	// css是否需要合并
	cssImport: true,

	// css是否需要压缩
	cssMinify: true,

	// js是否需要uglify
	uglify: false,

	// i18n
	i18n: {
		po: './_bjs_/i18n/i18n.{lang}.po',
		src: './src',
		msrc: '../resource/src',
		mdst: '../resource/{lang}',
		vsrc: '../views/src',
		vdst: '../views/{lang}'
	},

	// plugins
	plugins: false,

	// open version, timestamp default
	version: false,

	// use md5 instead of timestamp version
	md5: false
}



/**
 * /
 * @param  {[type]} type [description]
 * @return {[type]}      [description]
 * @description
 * change compiler type for project building
 */
bjs.change = function(type) {
	switch (type) {
		case 'cmd':
		case 'amd':
		case 'non':
			FS.writeFileSync(PATH.join(__dirname, 'config.conf'), 'bjs.' + type + '.complier.js', 'utf8');
			break;
		default:
			break;
	}
}



bjs.help = function() {
	console.log('help');
}



module.exports = bjs;