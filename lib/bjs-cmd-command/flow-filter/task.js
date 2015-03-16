'use strict';


var PATH = require('path');
var FS = require('fs');

var gruntUtil = require('bjs-command-util');
var func = require(PATH.join(__dirname, 'lib/all.js'));


module.exports = function(files, options) {
	options = gruntUtil.options(options);

	// required to remove dest
	if (options.rm) {
		var src = files.files[0].src;
		try {
			var f = PATH.join(options.dest, PATH.basename(PATH.dirname(PATH.dirname(src))), PATH.basename(src));
			FS.unlinkSync(f);
			FS.rmdirSync(PATH.dirname(f));
		} catch (e) {
			// console.log(e)
		}
		return;
	}

	gruntUtil.files(files).forEach(function(fileObj) {
		func(fileObj, options);
	});
}