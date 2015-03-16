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
var colors = require('colors');
var JSONNICE = require('json-nice');


var REG_DEFINE_DEPS = /define\((.*)\],(\s)*function/;
var REG_MOD_DEFINE_DEPS = /\[[a-zA-Z0-9._\-'"&\/,\s]+\]/;

var REG_ABSOLUTE_PATH = /^(http(s){0,1}:|file:)/;
var REG_RELATIVE_PATH = /^([\.]+|[^\/])/;
var REG_RELATIVE_DOT = /^\./;


module.exports = function(fileObj, options) {
	if (!options || !options.base) {
		console.log('[Error]: '.red + 'options.base is required!');
		return;
	}

	if (!options.dest) {
		console.log('[Error]: '.red + 'options.dest is required!');
		return;
	}

	if (!options.output) {
		console.log('[Error]: '.red + 'options.output is required!');
		return;
	}

	options.ignore ? null : options.ignore = {};

	return processDeps(fileObj.src[0], options);
}



function processDeps(src, options) {
	// make sure deps-map.json file is existed
	FS.existsSync(options.output) ? null : grunt.file.write(options.output, '{}');

	// read exsited mapped source
	var json = require(options.output);

	// current file's deep deps
	var files = mapDeps(src, options);

	// 记录此模块的变更会影响到的其他依赖的模块
	var changes = [];

	var m = files.src;
	if (!(m in json)) {
		json[m] = {
			// _: {},
			deps: files.list
		}
	}

	// 先对比旧的依赖，看是否有减少的模块
	for (var itm in json[m].deps) {
		if (!(itm in files.list)) {
			// 先移除本身的依赖
			delete json[m].deps[itm];
			// 再更新子依赖的父级依赖
			// if (itm in json) {
			// 	delete json[itm]['_'][m];
			// }
		}
	}

	// 再更新依赖，同时更新被依赖的子模块的父级依赖
	for (itm in files.list) {
		json[m].deps[itm] = 1;

		if (!(itm in json)) {
			json[itm] = {
				// _: {},
				deps: {}
			}
		}
		// json[itm]['_'][m] = 1;
	}

	// 最后遍历映射表，把m模块的父级依赖的模块标记出来
	for (itm in json) {
		m in json[itm]['deps'] ? changes.push(itm) : null;
	}

	grunt.file.write(options.output, JSONNICE(json));

	// add itself
	changes.unshift(m);

	return changes;
}



/**
 * @param  {string} src	源文件路径
 * @param  {object} options 额外可选参数
 * @return {array}
 */
function mapDeps(src, options) {
	var files = {};

	findDeps(src);

	return {
		src: src,
		list: files
	};

	/**
	 * /
	 * @param  {string} path source file
	 * @description
	 * 对transport后的cmd进行合并压缩
	 * 1、先匹配define('', [], function
	 * 2、再取出匹配中的'[]'
	 * 3、匹配模块的完整路径
	 * 4、递归匹配
	 * 5、输出依赖列表
	 */
	function findDeps(path) {
		var content = grunt.file.read(path);
		var matches = content.match(REG_DEFINE_DEPS);

		// match module id & dependencies
		if (matches && matches.length > 0) {
			var item = matches[0];
			// map each module dependencies
			var deps = item.match(REG_MOD_DEFINE_DEPS);

			if (deps && deps.length > 0) {
				// split dependencies array
				deps = deps[0].substring(1, deps[0].length - 1).replace(/[\s'"]/g, '').split(',');
				deps.forEach(function(mod) {
					// first exclude from ignore
					if (mod in options.ignore) {
						return;
					}

					// exclude absolute path & not relatived path
					if (REG_ABSOLUTE_PATH.test(mod)) {
						return;
					} else if (!REG_RELATIVE_PATH.test(mod)) {
						return;
					} else {
						// module id begin with '.' or '..'
						if (REG_RELATIVE_DOT.test(mod)) {
							mod = PATH.join(PATH.dirname(path), mod);
						} else {
							// id begin with 'xx/x'
							mod = PATH.join(options.base, mod);
						}

						// replace '\\' to '/'
						mod = mod.replace(/\\|\\\\/g, '/');

						// make sure is '.js' postfix
						/\.js$/.test(mod) ? null : mod += '.js';

						// exit while mod isn't existed
						if (!FS.existsSync(mod)) {
							return;
						}

						if (mod in files) {
							return;
						} else {
							files[mod] = 1;
							// files.list.push(mod);
							/\.js$/.test(mod) ? findDeps(mod) : null;
						}
					}
				});
			}

		}
	}
}