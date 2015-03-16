/**
 *
 *
 */

'use strict';

var FS = require('fs');
var PATH = require('path');


function Util() {}


/**
 * 打印各种功能消耗的时间
 * @param  {boolean} end 
 */
Util.prototype.log = function(end, path) {
	clearInterval(this._i);
	if (end) {
		process.stdout.write((new Array(this._c).join('.')).yellow);
		process.stdout.write(' ' + (new Date().getTime() - (this.tstart || 0) + 'ms\n').green);
		process.stdout.write(path ? '  [File]:'.green + path : '');
	} else {
		this._c = 16;
		this.tstart = new Date().getTime();
		process.stdout.write('¤ .'.yellow);
	}
}


Util.prototype.logc = function(){
	if(this._c === 0){
		return;
	}
	process.stdout.write('.'.yellow);
	this._c--;
}


/**
 * 创建文件夹
 * @param  {string} dir 文件夹路径
 */
Util.prototype.mkdir = mkdir;

function mkdir(dir){
	if (!FS.existsSync(dir)) {
		var _path = dir.split(/\/|\\/);
		if (_path.length === 1) {
			return;
		}
		_path.pop();
		mkdir(_path.join('/'));
		FS.mkdirSync(dir);
	}
}

/**
 * 删除文件或文件夹
 * @type {[type]}
 */
Util.prototype.rm = rm;

function rm(path){
	if(!FS.existsSync(path)){
		return;
	}
	if(FS.statSync(path).isDirectory()){
		var ll = FS.readdirSync(path);
		ll.forEach(function(name){
			rm(PATH.join(path, name));
		})
		FS.rmdirSync(path);
	}else{
		FS.unlinkSync(path);
	}
}

module.exports = new Util();