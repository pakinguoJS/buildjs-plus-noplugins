'use strict';


var PATH = require('path');

var gruntUtil = require('bjs-command-util');
var func = require(PATH.join(__dirname, 'lib/all.js'));


module.exports = function(files, options) {
	options = gruntUtil.options(options);
	var output;

	gruntUtil.files(files).forEach(function(fileObj, idx) {
		output = func(fileObj, options);
	});

	return output;
}