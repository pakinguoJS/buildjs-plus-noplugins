'use strict';


var PATH = require('path');
var colors = require('colors');

var gruntUtil = require('bjs-command-util');
var cmdUglify = require(PATH.join(__dirname, 'lib/combo-compress.js'));


module.exports = function(files, options) {
	options = gruntUtil.options(options);

	gruntUtil.files(files).forEach(function(fileObj) {
		cmdUglify(fileObj, options);
	});
}