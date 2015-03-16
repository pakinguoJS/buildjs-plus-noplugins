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
var UTIL = require('../../../bjs-util/util.js');
var grunt = require('grunt');
var colors = require('colors');
var JSONNICE = require('json-nice');


module.exports = function(fileObj, options) {
	if(!options.output){
		console.log('[Error]: '.red + 'options.output is required!');
		return;
	}

	// 不存在则创建
	if (!FS.existsSync(options.output)) {
		grunt.file.write(options.output, '{}');
	}

	var json = require(options.output);
	var src = fileObj.src[0];

	// 如果是删除操作，需要从options中获取对应的dest、src
	if(options.rm){
		UTIL.rm(options.dest);
		delete json[options.src.replace(/\\|\\\\/g, '/')];
		grunt.file.write(options.output, JSONNICE(json));
		return;
	}

	// 新增或者更新，先判断是否存在于缓存中，如果存在，则判断时间是否一致，不一致更新，返回true，一致返回false，表明不需要下一步操作
	var mtime = FS.statSync(src).mtime.getTime();
	if (src in json) {
		if (mtime !== json[src]) {
			json[src] = mtime;
			grunt.file.write(options.output, JSONNICE(json));
			return true;
		} else {
			return false;
		}
	} else {
		json[src] = mtime;
		grunt.file.write(options.output, JSONNICE(json));
		return true;
	}
}