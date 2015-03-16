/**
 * hack for seajs or seacss(refer to )
 * just build a object for loading cmd config file, caching config object
 */

var FS = require('fs');

module.exports = function(path) {

	var Class = function() {
		this.hash = (function() {
			return {};
		})();
	};
	Class.prototype.config = function(obj) {
		for (var itm in obj) {
			this.hash[itm] = obj[itm];
		}
	}

	var seajs = new Class();
	var seacss = new Class();

	try {
		eval(FS.readFileSync(path, 'utf8'));

	} catch (e) {

	}

	return {
		seajs: seajs.hash,
		seacss: seacss.hash
	}
}