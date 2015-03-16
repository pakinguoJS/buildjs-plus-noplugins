'use strict';


var PATH = require('path');
var colors = require('colors');

var gruntUtil = require('bjs-command-util');
var func = require(PATH.join(__dirname, 'lib/all.js'));


module.exports = function(files, options) {
	var ret = false;
	options = gruntUtil.options(options);

	gruntUtil.files(files).forEach(function(fileObj) {
		ret = func(fileObj, options);
	});

	return ret;
}