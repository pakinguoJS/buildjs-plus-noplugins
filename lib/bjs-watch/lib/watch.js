/**
 * @description chokidar文件监听方式
 *
 * @author pakinguo
 *
 */

'use strict';

module.exports = {
	watchByChokidar: watchByChokidar,
	unwatch: unwatch
};


// change type mapping
var mapping = {
	'101': 'addFile',
	'102': 'addDir',
	'200': 'change',
	'301': 'unlinkFile',
	'302': 'unlinkDir',
	'400': 'error'
}


function watchByChokidar(path, callback, ignored) {
	var chokidar = require('chokidar');
	var watcher = chokidar.watch(path, {
		ignored: ignored || /[\/\\]\./,
		persistent: true
	});

	watcher
		.on('add', function(path) {
			callback(101, path);
		})
		.on('addDir', function(path) {
			callback(102, path);
		})
		.on('change', function(path) {
			callback(200, path);
		})
		.on('unlink', function(path) {
			callback(301, path);
		})
		.on('unlinkDir', function(path) {
			callback(302, path);
		})
		.on('error', function(error) {
			callback(400, path);
		})
}


function unwatch(callback) {
	var cwd = process.cwd();
	var cmd = "ps au | grep bjs | grep watch | awk '{print $2}'";
	var cmd2 = "ls -all /proc/{pid} | grep cwd | awk '{print $11}'";
	var exec = require('child_process').exec;
	var PATH = require('path');

	exec(cmd, function(err, stdout, stderr) {
		if (err) {
			return;
		}
		var rs = stdout.replace(/\n$/, '').split('\n');
		inner(rs)
	});


	function inner(ary) {
		if (ary instanceof Array && ary.length > 0) {
			var tmp = ary.pop();
			if (!tmp) {
				inner(ary);
				return;
			}
			exec(cmd2.replace('{pid}', tmp), function(err, stdout, stderr) {
				if (err) {
					inner(ary)
					return;
				}
				if (stdout.replace(/\n/g, '') === cwd) {
					exec("kill -9 " + tmp, function(e, so, se) {
						if (!e) {
							console.log('[' + tmp + ' Killed]: bjs watch on ' + cwd);
						}
						inner(ary);
					})
				} else {
					inner(ary)
				}
			})
		} else {
			typeof callback === 'function' ? callback() : null;
		}
	}

}