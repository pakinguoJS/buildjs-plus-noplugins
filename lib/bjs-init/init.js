/**
 * @description 初始化项目目录结构，以生成bjs.config.js为唯一校验，若存在该配置文件，则不执行初始脚本
 *
 * @author pakinguo
 *
 */

var FS = require('fs');
var PATH = require('path');
var COLORS = require('colors');
var cwd = process.cwd();

var UTIL = require('bjs-util');


/**
 * 初始化入口
 * @param  {string} ctype [description]
 * @return {[type]}       [description]
 */
function init(ctype) {
	var confPath = PATH.join(cwd, 'bjs.conf.js');

	// record time
	UTIL.log();

	// if existed , exit!
	if (FS.existsSync(confPath)) {
		UTIL.log(true);
		process.stdout.write('\n  ' + '[Warning] '.red + 'bjs.conf.js'.green + ' is already existed!\n');
		return;
	}

	switch (ctype) {
		case 'cmd':
			initCmd(confPath);
			break;
		case 'amd':
			initAmd(confPath);
			break;
		case 'none':
			break;
		default:
			initCmd(confPath);
			break;
	}

	// print time
	UTIL.log(true);
}


function initCmd(confPath) {
	var conf = require(PATH.join(__dirname, 'lib/init-cmd.js'));

	// 初始化项目文件夹目录
	UTIL.mkdir(PATH.join(cwd, conf.catalogue.conf));
	UTIL.mkdir(PATH.join(cwd, conf.catalogue.lib));
	UTIL.mkdir(PATH.join(cwd, conf.catalogue.bjs));
	UTIL.mkdir(PATH.join(cwd, conf.catalogue.src[0]));
	UTIL.mkdir(PATH.join(cwd, conf.catalogue.src[1]));

	// 创建配置文件
	var output = '// set project module type\nbjs.set("ctype", "{ctype}");\n\n// set source path of modules\nbjs.set("src", "{src}");\n\n// set exclude module of pkg\nbjs.set("pkgExclude", {});';
	FS.writeFileSync(confPath, output.replace('{ctype}', conf.ctype).replace('{src}', './src'), 'utf8');
}

module.exports = init;