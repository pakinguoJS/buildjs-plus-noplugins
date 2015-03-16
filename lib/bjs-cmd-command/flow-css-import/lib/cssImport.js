/**
 * @description
 * 将css中的@import语句替换为相应的css文件内容
 * 1、不处理绝对路径，包括http(s):、file:、ftp:等开头
 * 2、处理"/xx"斜杠开头的，需要参数basePath作为基准路径
 * 3、正常处理"."或非1、2提到的路径，以搜索的当前css所在文件夹为相对路径，拼接找到的@import url的路径
 *
 * @author pakinguo
 */

var FS = require('fs');
var PATH = require('path');
var grunt = require('grunt');
var colors = require('colors');
var JSONNICE = require('json-nice');


var REG_IMPORT_URL = /@import\s+url\s*\(\s*['"](.*)['"]\s*\);/g;
var REG_ABSOlUTE_URL = /http(s){0, 1}|file|ftp/;
var REG_RELATIVE_URL_WITH_BASE = /^\//;


module.exports = function(fileObj, options) {
	if (options.rm) {
		return;
	}

	if (!options.output) {
		console.log('[Error]: '.red + 'options.output is required!');
		return;
	}

	return transfer(fileObj, options);
}


function transfer(fileObj, options) {
	// 更新map文件
	var json;
	var src = fileObj.src[0];
	if (FS.existsSync(options.output)) {
		json = require(options.output);
	} else {
		json = {};
	}

	json[src] = importUrlDeps(src);

	// 回写
	FS.writeFileSync(options.output, JSONNICE(json));

	// record father dependency
	var change = [src];
	for (var itm in json) {
		if (src in json[itm]) {
			change.push(itm);
		}
	}

	var ret = [];

	// all change
	change.forEach(function(file) {
		var deps = mapImportUrl(file, options);
		var content = grunt.file.read(file);
		var dest = PATH.join(fileObj.orig.dest, PATH.relative(fileObj.orig.cwd, file));

		deps.forEach(function(item) {
			if (!FS.existsSync(item.url)) {
				return;
			}
			content = content.replace(item.map, grunt.file.read(item.url));
		});

		grunt.file.write(dest, content);
		ret.push(dest.replace(/\\|\\\\/g, '/'));
	});

	// log
	// console.log('[Succ]: '.green + fileObj.dest + ' is created!'.green);
	// 
	ret.shift();
	return ret;
}



function importUrlDeps(src, options) {
	var record = {};
	findDeps(src);
	return record;

	function findDeps(path) {
		if (!FS.existsSync(path)) {
			return;
		}

		var matches = FS.readFileSync(path, 'utf8').match(REG_IMPORT_URL);

		if (matches && matches.length > 0) {
			var url, match;
			matches.forEach(function(_match) {
				url = match = _match;

				// get substr URL from "@import url('URL');"
				url = url.substring(url.indexOf('(') + 2, url.lastIndexOf(')') - 1);

				// exclude absolute path
				if (REG_ABSOlUTE_URL.test(url)) {
					return;
				}

				// if it's began with '/'
				if (REG_RELATIVE_URL_WITH_BASE.test(url)) {
					if (options.basePath) {
						// get full path
						url = PATH.join(options.basePath, url).replace(/\\|\\\\/g, '/');
					} else {
						return;
					}
				} else {
					// get full path relative to current css filepath
					url = PATH.join(PATH.dirname(path), url).replace(/\\|\\\\/g, '/');
				}

				// is it in cache? Avoid duplicate
				if (url in record) {
					return;
				} else {
					// recorded
					record[url] = 1;

					// find matches recursion
					findDeps(url);
				}
			})
		}
	}

}



/**
 * 查找css文件@import语句的深依赖列表
 * @param  {string} src	源文件路径
 * @param  {object} options 额外可选参数
 * @return {array}
 */
function mapImportUrl(src, options) {
	options ? null : options = {};
	var record = {
		hash: {},
		deps: []
	}

	record.hash[src] = 1;
	findDeepDeps(src);

	return record.deps;

	/**
	 * /
	 * @param  {string} path 	css file path
	 */
	function findDeepDeps(path) {
		if (!FS.existsSync(path)) {
			return;
		}

		var matches = FS.readFileSync(path, 'utf8').match(REG_IMPORT_URL);

		if (matches && matches.length > 0) {
			var url, match;
			matches.forEach(function(_match) {
				url = match = _match;

				// get substr URL from "@import url('URL');"
				url = url.substring(url.indexOf('(') + 2, url.lastIndexOf(')') - 1);

				// exclude absolute path
				if (REG_ABSOlUTE_URL.test(url)) {
					return;
				}

				// if it's began with '/'
				if (REG_RELATIVE_URL_WITH_BASE.test(url)) {
					if (options.basePath) {
						// get full path
						url = PATH.join(options.basePath, url);
					} else {
						return;
					}
				} else {
					// get full path relative to current css filepath
					url = PATH.join(PATH.dirname(path), url);
				}

				// is it in cache? Avoid duplicate
				if (url in record.hash) {
					return;
				} else {
					// recorded
					record.hash[url] = 1;
					record.deps.push({
						map: match,
						url: url
					});

					// find matches recursion
					findDeepDeps(url);
				}
			})

		}
	}

}