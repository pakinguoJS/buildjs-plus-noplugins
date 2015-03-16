/**
 * @description
 * 针对seajs的编译流程
 *
 * @author pakinguo
 * 2015-3-3
 */

'use strict';

var PATH = require('path');
var FS = require('fs');
var UTIL = require('./bjs-util/util.js');
var JSONNICE = require('json-nice');
var CWD = process.cwd();

// 加载所有的功能
var
// 流程：记录所有文件最后更新时间
	STEPRecord = require(PATH.join(__dirname, 'bjs-cmd-command/flow-record/task.js')),
	// 流程：复制变动的文件
	STEPCopy = require(PATH.join(__dirname, 'bjs-cmd-command/flow-copy/task.js')),
	// 流程：过滤smarty的tpl文件，重新部署
	STEPFilter = require(PATH.join(__dirname, 'bjs-cmd-command/flow-filter/task.js')),
	// 流程：解析CMD编译方式的配置文件
	STEPCMDconf = require(PATH.join(__dirname, 'bjs-cmd-command/cmd.conf.js')),
	// 流程：合并css文件
	STEPCSSImport = require(PATH.join(__dirname, 'bjs-cmd-command/flow-css-import/task.js')),
	// 流程：压缩css文件
	STEPCSSMinify = require(PATH.join(__dirname, 'bjs-cmd-command/flow-css-minify/task.js')),
	// 流程：transport
	STEPTransport = require(PATH.join(__dirname, 'bjs-cmd-command/flow-cmd-transport/task.js')),
	// 流程：uglify前置步骤，查找依赖链
	STEPUglifyDeps = require(PATH.join(__dirname, 'bjs-cmd-command/flow-cmd-deps/task.js')),
	// 流程：uglify
	STEPUglify = require(PATH.join(__dirname, 'bjs-cmd-command/flow-cmd-uglify/task.js')),
	// 流程：版本号
	STEPVersion = require(PATH.join(__dirname, 'bjs-cmd-command/flow-version/task.js'));



/**
 *
 * @param  {[type]} conf [description]
 * @return {[type]}      [description]
 */
function watch(bjs) {
	var conf = bjs.config;

	// 先将路径配置为grunt.file接收的数据格式
	var _cwd = PATH.join(CWD, conf.src); // 模块源路径
	var _dst = PATH.join(CWD, conf.dst); // 模块部署路径
	var dest = PATH.join(CWD, conf.dist); // 项目文件部署路径
	var confPath = PATH.join(CWD, conf.conf);
	var CMDConf = STEPCMDconf(confPath); // 读取前端seajs配置文件

	// 每一次开启监听都要先进行文件对比，确保在关闭实时监听后删了源文件没有做到同步
	var mtimeFile = PATH.join(CWD, '_bjs_/mtime.json');
	if (FS.existsSync(mtimeFile)) {
		var _json = require(mtimeFile);
		for (var itm in _json) {
			if (!FS.existsSync(itm)) {
				processRemove(itm);
			}
		}
	}

	/**
	 * /
	 * @param  {[type]} path [description]
	 * @return {[type]}      [description]
	 *
	 * @description
	 * 删除某个文件对应的连锁删除流程
	 */
	function processRemove(path) {
		// log
		UTIL.log();

		// 1、文件最后更新时间的记录，同时删除目标文件
		var ret = STEPRecord({
			files: [{
				src: path
			}]
		}, {
			// 参数对应的是flow-record提供的需要处理的配置参数，参看flow-record/lib/all.js（以下所有的配置项都一致，参看对应的功能源文件）
			output: mtimeFile,
			src: path,
			dest: PATH.join(dest, PATH.relative(CWD, path)),
			rm: true
		});

		//UTIL.logc();

		// 2、插件功能的同步删除（如less生成的css的删除等）
		if (conf.plugins && conf.plugins.length > 0) {
			var func;
			conf.plugins.forEach(function(item) {
				func = require(PATH.join(__dirname, 'bjs-cmd-command/plugins', item.lib));
				if (item.pattern.test(path)) {
					file = {
						expand: true,
						cwd: _cwd,
						src: PATH.relative(_cwd, path),
						dest: _dst
					};
					var _options = item.options ? (typeof item.options === 'function' ? item.options(file) : item.options) : {};
					// 需要标记此参数，然后在插件处理的功能中判断是否为删除操作
					_options.rm = true;
					func({
						files: [file]
					}, _options);
				}
			});
		}

		//UTIL.logc();

		// 3、cssImport  TODO

		// 4、删除对应的重定向的tpl文件（如果有使用smarty的话）
		if (conf.smarty && /\.tpl$/.test(path)) {
			STEPFilter({
				files: [{
					expand: true,
					cwd: _cwd,
					src: PATH.relative(_cwd, path),
					dest: PATH.join(CWD, conf.view)
				}]
			}, {
				pattern: /view\/[^\/]*\.tpl/,
				dest: PATH.join(CWD, conf.view),
				rm: true
			})
		}

		//UTIL.logc();

		// 5、如果用到seajs的将css编译为js的Transport功能，考虑需要删除生成的css.js的文件
		if (/\.css$/.test(path)) {
			try {
				FS.unlinkSync(PATH.join(dest, PATH.relative(CWD, path) + '.js'));
			} catch (e) {}
		}

		UTIL.log(true);
		return;
	}

	// 开启监听模式，需要忽略几种类型的文件：
	// 1、以.开头的隐藏文件
	// 2、bjs.conf.js文件
	// 3、bjs项目记录的相关文件夹 _bjs_
	require(PATH.join(__dirname, 'bjs-watch/lib/watch.js')).watchByChokidar(CWD, function(type, path) {
		// 有某些步骤需要缓存返回的数据
		var ret, file;

		// 预处理：过滤错误的监听
		if (type === 400) {
			return;
		}


		// =========================================================================
		// 删除的处理流程
		// 
		// 
		// 文件夹或文件的删除处理
		if (type === 302 || type === 301) {
			processRemove(path);
		}

		// 新增或修改文件，只处理单文件，不处理文件夹
		if (!FS.existsSync(path) || !FS.statSync(path).isFile()) {
			return;
		}


		// =========================================================================
		// 新增与编辑的处理流程
		// 
		// 
		// step 1: 更新文件列表的最后修改时间，确保不是由chokidar开启监听时产生的变更
		ret = STEPRecord({
			files: [{
				src: path
			}]
		}, {
			output: mtimeFile,
			src: path,
			dest: PATH.join(dest, PATH.relative(CWD, path))
		});


		// 如果文件无变更，则不做任何操作
		if (!ret) {
			return;
		}


		// ========================================================================
		// 只处理bjs.conf.js文件
		if (path.replace(/\\|\\\\/g, '/') === PATH.join(CWD, 'bjs.conf.js').replace(/\\|\\\\/g, '/')) {
			// console.log('same:' + path);
			eval(FS.readFileSync(path, 'utf8'));
			conf = bjs.config;
			return;
		}


		UTIL.log();

		// step 2: 复制对应的文件
		if (!(conf.smarty && /\.tpl$/.test(path))) { // 除去tpl的copy
			ret = STEPCopy({
				files: [{
					expand: true,
					cwd: CWD,
					src: PATH.relative(CWD, path),
					dest: dest
				}]
			});
		}

		// 如果文件处于锁状态，是无法读取copy的，此时暂时退出
		if (!ret) {
			UTIL.log(true);
			return;
		};


		// 针对第三方库文件（默认为lib文件夹），选择性不做后续编译，可以通过bjs.conf.js文件来配置忽略编译的文件夹或文件正则
		if ((typeof conf.ignore === 'object' && conf.ignore.test(path.replace(/\\|\\\\/g, '/'))) || (typeof conf.ignore === 'string' && path.replace(/\\|\\\\/g, '/').indexOf(PATH.join(CWD, conf.ignore).replace(/\\|\\\\/g, '/'))) > -1) {
			UTIL.log(true);
			return;
		}


		//UTIL.logc();


		// step 3: 插件处理
		if (conf.plugins && conf.plugins.length > 0) {
			var func;
			conf.plugins.forEach(function(item) {
				func = require(PATH.join(__dirname, 'bjs-cmd-command/plugins', item.lib));
				if (item.pattern.test(path)) {
					file = {
						expand: true,
						cwd: _cwd,
						src: PATH.relative(_cwd, path),
						dest: _dst
					};
					ret = func({
						files: [file]
					}, item.options ? (typeof item.options === 'function' ? item.options(file) : item.options) : {});
				}
			});
		}


		//UTIL.logc();


		// step 4: smarty的tpl文件
		if (conf.smarty && /\.tpl$/.test(path)) {
			STEPFilter({
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


		//UTIL.logc();


		// step 5: css import, 只处理部署的文件，不处理源文件 
		if (conf.cssImport && /\.css$/.test(path)) {
			ret = STEPCSSImport({
				files: [{
					expand: true,
					cwd: CWD,
					src: PATH.relative(CWD, path),
					dest: dest
				}]
			}, {
				output: PATH.join(CWD, '_bjs_/css-deps.json'),
				dest: dest
			});

			// 针对cssImport影响到的深依赖文件进行二次合并压缩
			if (ret.length > 0) {
				ret.forEach(function(f) {
					// transport
					STEPTransport({
						files: [{
							expand: true,
							cwd: _dst,
							src: PATH.relative(_dst, f),
							dest: _dst
						}]
					}, {
						alias: CMDConf.seajs.alias,
						base: _dst
					}, {
						'.js': 1,
						'.css': 1
					});
					// minify
					conf.cssMinify ? STEPCSSMinify({
						files: [{
							expand: true,
							cwd: _dst,
							src: PATH.relative(_dst, f),
							dest: _dst
						}]
					}) : null;
					// uglify
					conf.uglify ? STEPUglify({
						files: [{
							expand: true,
							cwd: _dst,
							src: PATH.relative(_dst, f + '.js'),
							dest: _dst
						}]
					}, {
						base: _dst,
						ignore: conf.mignore.js || CMDConf.seajs.ignore
					}) : null;
					// with version
					// 
					if (conf.version) {
						FS.writeFileSync(confPath, FS.readFileSync(confPath, 'utf8'), 'utf8');
						STEPVersion({
							files: [{
								expand: true,
								cwd: dest,
								src: PATH.relative(CWD, f),
								dest: dest
							}]
						}, {
							base: dest,
							mbase: _dst, // module base
							view: PATH.join(CWD, conf.view),
							ignore: conf.mignore.js || CMDConf.seajs.ignore,
							conf: PATH.join(CWD, conf.dist, conf.conf)
						});
						clearVersion(conf, PATH.dirname(PATH.join(dest, PATH.relative(CWD, f))));
					}

				});
			}
		}


		//UTIL.logc();


		// step 6: tansport
		if (/\.(js|css)$/.test(path)) {
			STEPTransport({
				files: [{
					expand: true,
					cwd: _dst,
					src: PATH.relative(_cwd, path),
					dest: _dst
				}]
			}, {
				alias: CMDConf.seajs.alias,
				base: _dst
			}, {
				'.js': 1,
				'.css': 1
			})
		}


		//UTIL.logc();


		// step 7: css minify 
		if (conf.cssMinify && /\.css$/.test(path)) {
			STEPCSSMinify({
				files: [{
					expand: true,
					cwd: _dst,
					src: PATH.relative(_cwd, path),
					dest: _dst
				}]
			})
		}


		//UTIL.logc();


		// step 8: uglify
		if (conf.uglify && /\.(js|css)$/.test(path)) {
			// 先查找深依赖
			var list = STEPUglifyDeps({
				files: [{
					expand: true,
					cwd: _dst,
					src: PATH.relative(_cwd, (/\.css/.test(path) ? path + '.js' : path)),
					dest: _dst
				}]
			}, {
				output: PATH.join(CWD, '_bjs_/js-map.json'),
				base: _dst,
				dest: _dst,
				ignore: conf.mignore.js || CMDConf.seajs.ignore // TODO
			});
			// 再根据深依赖影响的模块一一处理 
			if (list && list.length > 0) {
				list.forEach(function(f) {
					STEPUglify({
						files: [{
							expand: true,
							cwd: _dst,
							src: PATH.relative(_dst, f),
							dest: _dst
						}]
					}, {
						base: _dst,
						ignore: conf.mignore.js || CMDConf.seajs.ignore
					});
				})
			}
		}


		//UTIL.logc();


		// step 9: version
		if (conf.version) {
			// 执行
			STEPVersion({
				files: [{
					expand: true,
					cwd: dest,
					src: PATH.relative(CWD, path),
					dest: dest
				}]
			}, {
				base: dest,
				mbase: _dst, // module base
				view: PATH.join(CWD, conf.view),
				conf: PATH.join(CWD, conf.dist, conf.conf)
			});

			// 清除可能存在的旧版本
			clearVersion(conf, PATH.dirname(PATH.join(dest, PATH.relative(CWD, path))));
			// 触发配置文件的变更，让其重新编译一次
			path !== confPath ? FS.writeFileSync(confPath, FS.readFileSync(confPath, 'utf8'), 'utf8') : null;
		}


		UTIL.log(true);

	}, /[\/\\]\.|_bjs_/);
}



function unwatch() {
	require(PATH.join(__dirname, 'bjs-watch/lib/watch.js')).unwatch(CWD);
}



/**
 * /
 * @param  {object} conf
 *
 * @description
 * 清楚版本，重新生成新项目文件
 */
function release(conf) {
	// 清除缓存，再重新生成
	var src = PATH.join(CWD, '_bjs_');
	var ll = FS.readdirSync(src);
	ll.forEach(function(file) {
		try {
			FS.unlinkSync(PATH.join(src, file));
		} catch (e) {}
	});

	conf.version = true;

	watch(conf);
}


/**
 * /
 * @param  {[type]} conf [description]
 * @return {[type]}      [description]
 *
 * @description
 * 清除缓存的数据，除去版本号，若重新开启监听则会对项目整体重新编译一次
 */
function clear() {
	// 清除缓存，再重新生成
	var src = PATH.join(CWD, '_bjs_');
	var ll = FS.readdirSync(src);
	ll.forEach(function(file) {
		try {
			FS.unlinkSync(PATH.join(src, file));
		} catch (e) {}
	});

	console.log('[Success]: Done!')
}



/**
 * /
 * @param  {object} conf
 *
 * @description
 * 清除旧版本的文件，只保留最新版本
 */
var clearV = require(PATH.join(__dirname, 'bjs-cmd-command/flow-version/lib/clear.js'));

function clearVersion(conf, dest) {
	// 如果有dest，则直接处理提供的文件夹，否则处理整个项目
	if (dest) {
		clearV(dest);
	} else {
		clearV(PATH.join(CWD, conf.dst));
	}
}



module.exports = {
	watch: watch,
	unwatch: unwatch,
	release: release,
	clearVersion: clearVersion,
	clear: clear
}