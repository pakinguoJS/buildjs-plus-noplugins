// set project module type
bjs.set("ctype", "cmd");

// set source path of modules
bjs.set("src", "./src");

// set dest path of modules
bjs.set("dst", '../resource/src');

// set dest path of files
bjs.set("dist", "../resource");

// set view dist path for distributed .tpl using smarty
bjs.set("view", "../views/src");

// 设置某种开发类型的配置文件
bjs.set("conf", "./conf/conf.js");

// 设置模块编译过程需要忽略的某些模块，默认为第三方库
bjs.set("ignore", "./lib");

// set uglify if required
bjs.set("uglify", true);

// set version complie if required
bjs.set("version", true);

// 设置合并压缩过程忽略的某些模块
bjs.set("mignore", {
	js: {
		"widget/ipick.alert/ipick.alert.js": 1
	},
	css: {}
})

// 设置需要加载的插件
bjs.set("plugins", [
	// less
	{
		pattern: /\.less$/,
		lib: 'css-less/task.js'
	},
	// css-sprite
	{
		pattern: /css@sprite.*\.png$/,
		lib: 'flow-css-sprite/task.js',
		options: function(fileObj) {
			var PATH = require('path');
			var basename = PATH.basename(PATH.dirname(fileObj.src));
			var _dest = PATH.join(fileObj.dest, fileObj.src);
			return {
				name: basename,
				out: PATH.join(_dest, '../../../img'),
				style: PATH.join(PATH.join(fileObj.cwd, fileObj.src), '../../../css', basename + '.css')
			}
		}
	}
])