/**
 * @description
 * 对transport后的cmd文件进行解析，查找其子依赖和父依赖（对应缓存）
 * 并记录该文件的最后修改时间
 *
 *
 * @author pakinguo
 */

var grunt = require('grunt');
var colors = require('colors');

module.exports = singleCopy;

function singleCopy(fileObj, options) {
	try {
		grunt.file.copy(fileObj.src[0], fileObj.dest);
		return true;
	} catch (e) {
		return false;
	}

	// log
	// console.log('[Succ]: '.green + fileObj.dest + ' is copyed!');
}