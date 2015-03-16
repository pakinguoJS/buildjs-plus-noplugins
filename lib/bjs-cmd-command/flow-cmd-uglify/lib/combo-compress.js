/**
 * @description
 * 对transport后的cmd文件进行解析，按单一文件进行合并压缩（需要查找深度依赖）
 * transport后的cmd文件格式为define ('id', [...] , function(){})
 * 其中[...]为其依赖，根据此数组查找对应的文件进行合并压缩
 *
 * !注意：
 * 1、只合并以../或./或xx/module开头的模块id
 * 2、提供ignore对象，合并时也忽略此对象提供的模块id
 * 3、提供alias对象，对简写的模块id进行完整替换
 *
 * @author pakinguo
 */

var FS = require('fs');
var PATH = require('path');
var grunt = require('grunt');
var colors = require('colors');
var Uglifyjs = require('uglify-js');


// 匹配的模块id、依赖列表的正则
// 
// var REG_REQUIRE = /require(\s)*\((\s)*[a-zA-Z0-9._\-'"&\/,\s]+(\s)*\)/g;
// var REG_REQUIREASYNC_ARRAY = /require\.async(\s)*\((\s)*\[[a-zA-Z0-9._\-'"&\/,\s]+\](\s)*(,(\s)*function(\s)*\(|\))/g;
// var REG_REQUIREASYNC_STR = /require\.async(\s)*\((\s)*('[a-zA-Z0-9._\-&\/,\s]+'|"[a-zA-Z0-9._\-&\/,\s]+")(\s)*\)/g;


var REG_DEFINE_DEPS = /define\((.*)\],(\s)*function/;
var REG_MOD_DEFINE_DEPS = /\[[a-zA-Z0-9._\-'"&\/,\s]+\]/;


var REG_ABSOLUTE_PATH = /^(http(s){0,1}:|file:)/;
var REG_RELATIVE_PATH = /^([\.]+|[^\/])/;
var REG_RELATIVE_DOT = /^\./;


module.exports = transfer;


function transfer(fileObj, options) {
	if (!options || !options.base) {
		console.log('[Error]: '.red + 'options.base is required!');
		return;
	}

	options.ignore ? null : options.ignore = {};

	grunt.file.write(fileObj.dest, Uglifyjs.minify(mapDeps(fileObj.src[0], options)).code);

	// console.log('[Succ]: created file '.green + fileObj.dest);
}


/**
 * @param  {string} src	源文件路径
 * @param  {object} options 额外可选参数
 * @return {array}
 */
function mapDeps(src, options) {
	var files = {
		hash: {},
		list: []
	};

	findDeps(src);

	files.list.unshift(src);

	return files.list;

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
						if(!FS.existsSync(mod)){
							return;
						}

						if (mod in files.hash) {
							return;
						} else {
							files.hash[mod] = 1;
							files.list.push(mod);
							/\.js$/.test(mod) ? findDeps(mod) : null;
						}
					}
				});
			}

		}
	}
}