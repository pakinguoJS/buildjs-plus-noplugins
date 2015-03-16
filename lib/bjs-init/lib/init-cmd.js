/**
 * @description 初始化项目目录结构，以生成bjs.config.js为唯一校验，若存在该配置文件，则不执行初始脚本
 * 
 * @author pakinguo
 * 
 */

'use strict';

module.exports = {
	ctype: 'cmd',

	catalogue: {
		conf: 'conf',
		lib:  'lib',
		src:  ['src/modules', 'src/widgets'],
		bjs:  '_bjs_'
	}
}