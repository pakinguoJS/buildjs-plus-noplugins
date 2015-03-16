'use strict';


var PATH = require('path');
var colors = require('colors');

var gruntUtil = require('bjs-command-util');
var cssMinify = require(PATH.join(__dirname, 'lib/cssMinify.js'));


module.exports = function(files, options) {
	options = gruntUtil.options({
		basePath: false
	}, options);

	gruntUtil.files(files).forEach(function(fileObj) {
		cssMinify(fileObj, options);
	});
}