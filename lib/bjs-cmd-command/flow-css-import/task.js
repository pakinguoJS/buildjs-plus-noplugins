'use strict';


var PATH = require('path');
var colors = require('colors');

var gruntUtil = require('bjs-command-util');
var cssImport = require(PATH.join(__dirname, 'lib/cssImport.js'));


module.exports = function(files, options) {
	options = gruntUtil.options({
		basePath: false
	}, options);

	var ret = [];

	gruntUtil.files(files).forEach(function(fileObj) {
		ret = cssImport(fileObj, options);
	});

	return ret;
}