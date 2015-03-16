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
var CWD = process.cwd();

module.exports = function(fileObj, options) {
	newVersion(fileObj, options);
}



/**
 * /
 * @param  {[type]} src     [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
function newVersion(fileObj, options) {
	var src = fileObj.src[0];
	// 排除已经标记过版本号的文件
	if (/@v/.test(src)) {
		return;
	}

	if (!options.base) {
		process.stdout.write('[Error]: '.red + 'options.base is required!');
		return;
	}

	if (!options.mbase) {
		process.stdout.write('[Error]: '.red + 'options.mbase is required!');
		return;
	}

	var version;
	if (options.md5) {
		version = 'md5';
	} else {
		version = FS.statSync(src).mtime.getTime() / 1000;
	}

	// 提取当前更改的文件路径，并过滤为模块中需要被替换的匹配字符串
	// 这里只提取到模块id，不带后缀，如：xx/js/index.js => xx/js/index
	var _src = fileObj.orig.src[0].replace(/\\|\\\\/g, '/');
	var pattern = _src.substring(_src.indexOf('/') + 1, _src.lastIndexOf('.'));

	// .png .jpg .gif .bmp
	if (/\.(png|jpg|gif|bmp)$/.test(src)) {
		disposeImg(src, pattern, options, version);
	} else if (/\.(css|js)$/.test(src)) {
		disposeText(options, src);
	} else if (/\.(html|htm|tpl)/.test(src)) {
		disposeSelf(src, options);
	}
}



/**
 * /
 * @param  {[type]}   path     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 *
 * @description
 * 遍历所有文件进行版本号替换
 */
function traverse(path, callback) {
	if (!FS.existsSync(path)) {
		return;
	}
	var ll = FS.readdirSync(path);
	ll.forEach(function(file) {
		var _file = PATH.join(path, file).replace(/\\|\\\\/g, '/');
		if (FS.existsSync(_file) && FS.statSync(_file).isDirectory()) {
			traverse(_file, callback);
		} else {
			/\.(html|htm|js|css|tpl)$/.test(_file) ? callback(_file) : null;
		}
	});
}


/**
 * /
 * @param  {[type]} src     [description]
 * @param  {[type]} pattern [description]
 * @param  {[type]} options [description]
 * @param  {[type]} version [description]
 * @return {[type]}         [description]
 *
 * @description
 * 图片类型只影响到引用它的其他文件，故其处理逻辑只需要遍历需要遍历的文件夹，匹配影响到的对应的文件
 */
function disposeImg(src, pattern, options, version) {
	// 先生成带版本号的新文件
	var dest = PATH.join(PATH.dirname(src), PATH.basename(src, PATH.extname(src)) + '@v' + version + PATH.extname(src)).replace(/\\|\\\\/g, '/');
	grunt.file.copy(src, dest);

	// 遍历dest所有文件，引用到对应的图片需要
	traverse(options.base, inner);
	options.view ? traverse(options.view, inner) : null;

	function inner(file) {
		var mark = false;
		var content = FS.readFileSync(file, 'utf8');
		var matches = content.match(/(src=["']*[^\s"']+\.(png|jpg|gif|bmp)["']*)|(url\(["']*[^\s"'\)]+\.(png|jpg|gif|bmp)["']*\))/g);

		if (matches && matches.length > 0) {
			matches = unique(matches);
			matches.forEach(function(item) {
				var rpath = item.replace(/src=|url\(|\)|["']/g, '');
				var tmp = rpath;

				// 如果是./和../的相对路径，需要合成绝对路径
				if (/^\./.test(rpath)) {
					tmp = PATH.join(PATH.dirname(file), rpath).replace(/\\|\\\\/g, '/');
				}

				// 模式匹配，校验变更的文件xx/xx.png与遍历的文件yy/xx[@v..].png是否一致，如果不是，则返回
				if (src !== tmp && src.substring(0, src.lastIndexOf('.')) !== tmp.substring(0, tmp.indexOf('@v'))) {
					return;
				}

				// 若存在过滤过的匹配，则做回写操作
				if (new RegExp((pattern + '(.|@v[a-zA-Z0-9]+)').replace(/\.|\//g, '\\$&')).test(tmp)) {
					content = content.replace(new RegExp(rpath.replace(/\.|\/|\$|\{|\}/g, '\\$&'), 'g'), PATH.dirname(rpath) + '/' + PATH.basename(src, PATH.extname(src)) + '@v' + version + PATH.extname(rpath));
					mark = true; // 标记需要回写
				}
			})
		}
		if (mark) {
			FS.writeFileSync(file, content, 'utf8');
		}
	}
}



/**
 * /
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 *
 * @description
 * 处理配置文件中的js和css版本号
 */
function disposeText(options, a) {
	if (!options.mbase) {
		process.stdout.write('[Error]: '.red + 'options.mbase is required!');
		return;
	}

	if (!options.conf) {
		process.stdout.write('[Error]: '.red + 'options.conf is required!');
		return;
	}

	if (!FS.existsSync(options.mbase) || !FS.existsSync(options.conf)) {
		return;
	}

	var content = FS.readFileSync(options.conf, 'utf8');
	if (!/\{\{(js|css)version\}\}/.test(content)) {
		return;
	}

	var jsversion = [];
	var cssversion = [];

	inner(options.mbase);

	// 回写配置文件
	FS.writeFileSync(options.conf, content.replace(/['"]\{\{jsversion\}\}['"]/, JSON.stringify(jsversion)).replace(/['"]\{\{cssversion\}\}['"]/, JSON.stringify(cssversion)), 'utf8')

	// 处理view层更新配置文件版本号
	disposeView(options.mbase);
	options.view && FS.existsSync(options.view) ? disposeView(options.view) : null;

	function inner(path) {
		var ll = FS.readdirSync(path);
		ll.forEach(function(f) {
			var file = PATH.join(path, f).replace(/\\|\\\\/g, '/');
			var stat = FS.statSync(file);
			if (stat.isDirectory()) {
				inner(file);
			} else {
				var tmp = PATH.relative(options.mbase, file).replace(/\\|\\\\/g, '/');
				// push js & css module version for seajs map
				jsversion.push([tmp, tmp + '?' + stat.mtime.getTime() / 1000]);
				if (/\.css$/.test(file)) {
					cssversion.push([tmp, tmp + '?' + stat.mtime.getTime() / 1000]);
				}
			}
		})
	}

	function disposeView(path) {
		var ll = FS.readdirSync(path);
		var tmp;
		ll.forEach(function(f) {
			var file = PATH.join(path, f).replace(/\\|\\\\/g, '/');
			var stat = FS.statSync(file);
			if (stat.isDirectory()) {
				disposeView(file);
			} else if (/\.(html|htm|tpl)$/.test(file)) {
				disposeSelf(file, options);
			}
		})
	}
}


/**
 * /
 * @param  {[type]} src     [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 *
 * @description
 *
 */
function disposeSelf(src, options) {
	var content = FS.readFileSync(src, 'utf8');
	var pattern = /src=["'][^\s"']+\.js\?*[0-9A-Za-z]*["']*|href=["'][^\s"']+\.css\?*[0-9A-Za-z]*["']*|src=["']*[^\s"']+\.(png|jpg|gif|bmp)["']*|url\(["']{0,1}[^\s"'\)]+\.(png|jpg|gif|bmp)["']{0,1}\)/g;
	var replacePattern = /href=|src=|['",;]|url\(|\)/g;

	// 常规处理
	var matches = content.match(pattern);
	var mark;
	if (matches && matches.length > 0) {
		matches = unique(matches);
		matches.forEach(function(item) {
			var rpath = item.replace(replacePattern, '');
			// 保留需要替换的原始字符串
			var tmp = rpath;
			var ext = PATH.extname(rpath);

			if (/\?/.test(ext)) {
				ext = ext.substring(0, ext.indexOf('?'));
				tmp = tmp.substring(0, tmp.indexOf('?'));
			}

			if (/^\./.test(tmp)) {
				// 如果是./和../开头的相对路径，需要跟当前文件所在文件夹合成绝对路径
				tmp = PATH.join(PATH.dirname(src), tmp).replace(/\\|\\\\/g, '/');
			} else if (/^\//.test(tmp)) {
				// 如果是以/开头的相对路径，则需要跟当前编译的目录的上一层目录进行合并路径（一般lib用此方式的路径）
				tmp = PATH.join(CWD, '..' + tmp).replace(/\\|\\\\/g, '/');
			} else {
				tmp = PATH.join(options.mbase, tmp).replace(/\\|\\\\/g, '/');
			}

			// 分别跟options.base和options.mbase进行合并路径，若存在，则继续处理，不存在则返回
			if (!FS.existsSync(tmp)) {
				return;
			}

			// 若存在文件，则读取其最后修改时间为版本号
			mark = true;
			var version = options.md5 ? 'md5' : FS.statSync(tmp).mtime.getTime() / 1000;

			// 如果是图片类型，则用@vxx新文件版本号来替换
			if (/\.(png|jpg|gif|bmp)$/.test(rpath)) {
				var basename = PATH.basename(tmp, ext);
				if (/@v/.test(basename)) {
					basename = basename.substring(0, basename.indexOf('@v'));
				}
				content = content.replace(new RegExp(rpath.replace(/\.|\//g, '\\$&'), 'g'), PATH.dirname(rpath) + '/' + basename + '@v' + version + ext);
			} else {
				// 如果是css和js类型，则用?xx请求带版本号来替换
				content = content.replace(new RegExp(rpath.replace(/\.|\/|\?/g, '\\$&'), 'g'), PATH.dirname(rpath) + '/' + PATH.basename(tmp, ext) + ext + '?' + version);
			}
		})
	}

	if (mark) {
		FS.writeFileSync(src, content, 'utf8');
	}
}


/**
 * /
 * @param  {array} ary 需要去重的数组
 * @return {array}     [description]
 */
function unique(ary) {
	var t = {},
		o = [];
	ary.forEach(function(i) {
		if (!(i in t)) {
			t[i] = 1;
			o.push(i);
		}
	});
	return o;
}