var PATH = require('path');
var FS = require('fs');


/**
 * /
 * @param  {[string]} dest 项目路径
 * @return {[type]}      [description]
 *
 * @description
 * 遍历项目文件夹，找到原始文件，根据此文件再次遍历所在文件夹
 * 算法复杂度Ο(n²)
 */
module.exports = function(dest) {
	inner(dest);

	function inner(path) {
		if (!FS.existsSync(path)) {
			return;
		}

		var ll = FS.readdirSync(path);
		ll.forEach(function(file) {
			var fullPath = PATH.join(path, file).replace(/\\|\\\\/g, '/');
			if (!FS.existsSync(fullPath)) {
				return;
			}
			// 判断是否存在不带版本号的源文件，不存在则删除
			if (fullPath.indexOf('@v') > -1) {
				var _src = path + '/' + file.substring(0, file.indexOf('@v')) + PATH.extname(file);
				!FS.existsSync(_src) ? FS.unlinkSync(fullPath) : null;
				return;
			}
			// 
			if (FS.statSync(fullPath).isDirectory()) {
				inner(fullPath);
			} else {
				clear(fullPath, path);
			}
		});
	}

	function clear(src, cwd) {
		var _src = {
			dir: PATH.dirname(src),
			name: PATH.basename(src, PATH.extname(src)),
			ext: PATH.extname(src)
		};

		// 生成匹配正则和保留的最新版本号文件
		var pattern = new RegExp((_src.dir + '/' + _src.name + '@v[0-9a-zA-Z]+' + _src.ext).replace(/\.|\//g, '\\$&'));
		var keep = _src.dir + '/' + _src.name + '@v' + FS.statSync(src).mtime.getTime() / 1000 + _src.ext;

		var ll = FS.readdirSync(cwd);
		ll.forEach(function(file) {
			var fullPath = PATH.join(cwd, file).replace(/\\|\\\\/g, '/');
			if (FS.statSync(fullPath).isFile() && pattern.test(fullPath)) {
				if (keep !== fullPath) {
					FS.unlinkSync(fullPath);
				}
			}
		});
	}
}