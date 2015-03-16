/**
 * @description
 * 对transport后的cmd文件进行解析，查找其子依赖和父依赖（对应缓存）
 * 并记录该文件的最后修改时间
 *
 *
 * @author pakinguo
 */

var FS = require('fs');
var PATH = require('path');
var grunt = require('grunt');

module.exports = function(fileObj, options) {
	var src = fileObj.src[0];

	if (!FS.existsSync(src)) {
		return;
	}

	if (options.pattern.test(src)) {
		// e.g. : xx/test/view/index.tpl -> dest/test/index.tpl
		grunt.file.copy(src, PATH.join(options.dest, PATH.basename(PATH.dirname(PATH.dirname(src))), PATH.basename(src)));
	}
}