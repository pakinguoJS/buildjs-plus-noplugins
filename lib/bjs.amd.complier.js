/**
 *
 *
 */

'use strict';

var PATH = require('path');
var FS = require('fs');
var UTIL = require('bjs-util');
var CWD = process.cwd();

var watcher = require(PATH.join(__dirname, 'bjs-watch/lib/watch.js'));


/**
 *
 * @param  {[type]} conf [description]
 * @return {[type]}      [description]
 */
function watchChokidar(conf) {
	// 需要忽略几种类型的文件：
	// 1、以.开头的隐藏文件
	// 2、bjs.conf.js文件
	// 3、bjs项目记录的相关文件夹 _bjs_
	watcher.watchA(CWD, function(type, path) {
		// 先将路径配置为grunt.file接收的数据格式
		var _cwd = PATH.join(CWD, conf.src); // 模块源路径
		var _dst = PATH.join(CWD, conf.dst); // 模块部署路径
		var dest = PATH.join(CWD, conf.dest); // 项目文件部署路径

		// 预处理：过滤错误的监听
		if (type === 400) {
			return;
		}

		// step 1: 更新文件列表的最后修改时间，确保不是由chokidar开启监听时产生的变更，如果源文件是删除操作，这里也会同步到目标文件
		var STEP1 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-record/task.js'));
		var ret = STEP1({
			files: [{
				src: path
			}]
		}, {
			// 参数对应的是flow-record提供的需要处理的配置参数，参看flow-record/lib/all.js
			output: PATH.join(CWD, '_bjs_/mtime.json'),
			src: path,
			dest: PATH.join(dest, PATH.relative(CWD, path)),
			rm: type === 301 || type === 302
		});


		// 如果文件无变更，则不做任何操作
		if (!ret) {
			return;
		}


		// step 2: copy
		if (!FS.statSync(path).isFile()) {
			return;
		}

		if (!(conf.filter && /\.tpl$/.test(path))) { // 除去tpl的copy
			var STEP2 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-copy/task.js'));
			STEP2({
				files: [{
					expand: true,
					cwd: CWD,
					src: PATH.relative(CWD, path),
					dest: dest
				}]
			});
		}


		// step 3: plugins actions
		var STEP3;
		var file;
		if (conf.plugins && conf.plugins.length > 0) {
			conf.plugins.forEach(function(item) {
				STEP3 = require(PATH.join(__dirname, 'bjs-cmd-command/plugins', item.lib));
				if (item.pattern.test(path)) {
					file = {
						expand: true,
						cwd: _cwd,
						src: PATH.relative(_cwd, path),
						dest: _dst
					};
					STEP3({
						files: [file]
					}, item.options ? (typeof item.options === 'function' ? item.options(file) : item.options) : {});
				}
			});
		}


		// step 4: css import, from dest to dest 
		if (conf.cssImport && /\.css$/.test(path)) {
			var STEP4 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-css-import/task.js'));
			file = {};
			var src2dest = PATH.join(dest, PATH.relative(CWD, path));
			file[src2dest] = [path];
			STEP4({
				files: file
			})
		}


		// step 5: filter
		if (conf.filter && /\.tpl$/.test(path)) {
			var STEP5 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-filter/task.js'));
			STEP5({
				files: [{
					expand: true,
					cwd: _cwd,
					src: PATH.relative(_cwd, path),
					dest: PATH.join(CWD, conf.view)
				}]
			}, {
				pattern: /view\/[^\/]*\.tpl/,
				dest: PATH.join(CWD, conf.view)
			})
		}


		// step 6: tansport
		var CMDConf = require(PATH.join(__dirname, 'bjs-cmd-command/cmd.conf.js'))(PATH.join(CWD, conf.conf));
		if (/\.(js|css)$/.test(path)) {
			var STEP6 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-cmd-transport/task.js'));
			STEP6({
				files: [{
					expand: true,
					cwd: _dst,
					src: PATH.relative(_cwd, path),
					dest: _dst
				}]
			}, {
				alias: CMDConf.seajs.alias, // TODO
				base: _dst
			}, {
				'.js': 1,
				'.css': 1
			})
		}


		// step 7: css minify, from dest to dest 
		if (conf.cssMinify && /\.css$/.test(path)) {
			var STEP7 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-css-minify/task.js'));
			STEP7({
				files: [{
					expand: true,
					cwd: _dst,
					src: PATH.relative(_cwd, path),
					dest: _dst
				}]
			})
		}


		// step 8: uglify
		if (conf.uglify && /\.(js|css)$/.test(path)) {
			var STEP8_1 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-cmd-deps/task.js'));
			// 先查找深依赖
			var list = STEP8_1({
				files: [{
					expand: true,
					cwd: _dst,
					src: PATH.relative(_cwd, (/\.css/.test(path) ? path + '.js' : path)),
					dest: _dst
				}]
			}, {
				output: PATH.join(CWD, '_bjs_/deps-map.json'),
				base: _dst,
				dest: _dst,
				ignore: CMDConf.seajs.ignore // TODO
			});
			// 再根据深依赖影响的模块一一处理 
			if (list.length > 0) {
				var STEP8_2 = require(PATH.join(__dirname, 'bjs-cmd-command/flow-cmd-uglify/task.js'));
				list.forEach(function(file) {
					STEP8_2({
						files: [{
							expand: true,
							cwd: _dst,
							src: PATH.relative(_dst, file),
							dest: _dst
						}]
					}, {
						base: _dst,
						ignore: CMDConf.seajs.ignore
					});
				})
			}

		}

		// console.log('[File]: '.green + path.replace(/\\|\\\\/g, '/'));

	}, /[\/\\]\.|(bjs\.conf\.js)|_bjs_/);
}



/**
 * [watchInotify description]
 * @param  {[type]} conf [description]
 * @return {[type]}      [description]
 */
function watchInotify(conf) {

}



module.exports = {
	watchChokidar: watchChokidar,
	watchInotify: watchInotify
}