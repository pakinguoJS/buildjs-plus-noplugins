/**
 * @description
 * 直接调用clean-css做css压缩
 * 
 * @author pakinguo
 */

var grunt = require('grunt');
var colors = require('colors');
var CleanCSS = require('clean-css');


module.exports = transfer;


function transfer(fileObj, options) {
	var content = grunt.file.read(fileObj.src);

	var minimized = new CleanCSS().minify(content).styles;

	grunt.file.write(fileObj.dest, minimized);

	// log
	// console.log('[Succ]: '.green + fileObj.dest + ' is created!'.green);
}

