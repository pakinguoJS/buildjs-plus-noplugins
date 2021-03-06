var FS = require('fs');
var PATH = require('path');
var mkdir = require('../../../bjs-util/util.js').mkdir;

module.exports = new I18n();

/**
 * 创建一个用来提取待翻译的字符串对象
 *
 * @constructor
 */
function I18n(){
	// 用于提取自定义标记的待翻译字符串，只匹配以下四种格式
	// _("...")		适用于html等
	// _('...')		适用于html等
	// '_("...")'	适用于html、js、php等
	// "_('...')"	适用于html、js、php等
	this._xreg = /('__\("[^\r\n\t("\)]*"\)')|("__\('[^\r\n\t('\))]*'\)")|(__\("[^\r\n\t^("\))]*"\))|(__\('[^\r\n\t^('\))]*'\))/g;
	
	// 用于过滤并提取出msgid
	this._greg = function(str){
		return str.replace(/^__\("|"\)$|^__\('|'\)$|^"__\('|'\)"$|^'__\("|"\)'$/g, "");
	}
	
	// 需要翻译的文件类型
	this._fileType = /\.(php|html|htm|htpl|tpl|js|css|txt)$/;
	
	// po文件模板
	this._po = FS.readFileSync(PATH.join(__dirname, 'output-tpl/po.tpl'), 'utf-8');
}



/**
 * 设定需要翻译的文件类型
 * @param  {RegExp}    type  需要翻译的文件类型
 */
I18n.prototype.setFileType = function(type){
	if(!(type instanceof RegExp)){
		return;
	}
	this._fileType = type || /\.(php|html|htm|htpl|tpl|js|css|txt|less|sass|scss|styl)$/;
}


/**
 * 根据指定类型保存提取好的待翻译文件
 * @param  {String}    src    源文件或文件夹
 * @param  {String}    dist   输出的目标文件夹，若无参数则设定默认为 src + '/LANGS'
 * @param  {String}    exist  已存在的翻译过的po或xls文件
 * @param  {String}    type   提取输出的文件类型，可选为 .po、.pot、.xls、.xlsx
 * @param  {Boolean}   merge  是否合并输出，true为将源文件或文件夹提取出的翻译条目合并成一个文件输出，否则则根据对应的文件输出相应的翻译条目文件
 */
I18n.prototype.xgettext = function(src, dist, filename, exist, type, merge){
	if(!src){
		console.log("Source file(or directory) is required!");
		return;
	}
	if(!dist){
		if(FS.statSync(src).isDirectory()){
			dist = src + '/LANGS';
			mkdir(dist);
		}else{
			dist = PATH.join(PATH.dirname(src), PATH.basename(src).replace(/\.[^\n\.]*$/, ''));
		}
	}
	if(dist && !/\.[^\n]$/.test(dist)){
		mkdir(dist);
	}
	
	// 默认输出po文件
	type ? null : type = '.po';
	
	// 默认合并提取的翻译条目为单独一个文件输出
	merge === undefined ? merge = true : null;
	
	switch(type){
		case '.po':
		case '.pot':
			merge ? (exist && FS.existsSync(exist) ? saveAsPoMergePro.call(this, src, filename, exist) : saveAsPoMerge.call(this, src, filename)) : traverseFiles.call(this, src, saveAsPoSingle);
			break;
		case '.xls':
		case '.xlsx':
			break;
	}
	
	
	/**
	 * 递归遍历文件夹，用于单文件提取
	 * @param  {String}    dir  源文件或文件夹
	 * @param  {String}    callback  回调
	 */
	function traverseFiles(dir, callback){
		if(dir.indexOf(dist) > -1){
			return;
		}
		var list = FS.readdirSync(dir);
		var file;
		var _this = this;
		list.forEach(function(name, idx){
			file = dir + '/' + name;
			if(FS.statSync(file).isDirectory()){
				traverseFiles.call(_this, file, callback);
			}else{
				callback.call(_this, file);
			}
		})
	}
	
	
	/**
	 * 保存为po文件格式——各文件独立保存
	 * @param  {String}    file  单个源文件
	 */
	function saveAsPoSingle(file, dest){
		var msgidList = extract.call(this, file);
		var filename = PATH.basename(file);
		var output = this._po;
		var check = false;
		
		// 按照po文件格式生成
		for(var itm in msgidList){
			output += '#: ' + filename + ':' + msgidList[itm].index +
					  '\r\nmsgid "' + msgidList[itm].msgid + '"' +
					  '\r\nmsgstr ""\r\n\r\n';
			check = true;
		}
		
		// 保存
		check ? FS.writeFileSync(dest ? dest : (dist + '/' + filename + type), output, 'utf-8') : null;
	}
	
	
	/**
	 * 保存为po文件格式——将指定文件夹下所有文件生成的翻译列表合并为一个po文件，并去重（取最后一个）
	 * @param  {String}    dir  源文件夹
	 */
	function saveAsPoMerge(dir, dest){
		var msgidList = extract.call(this, dir, true);
		var output = this._po;
		
		for(var itm in msgidList){
			output += '#: ' + msgidList[itm].filename + ':' + msgidList[itm].index +
					  '\r\nmsgid "' + msgidList[itm].msgid + '"' +
					  '\r\nmsgstr ""\r\n\r\n';
		}
		FS.writeFileSync(dest ? dest : (dist + '/' + 'PO_MERGE_' + (new Date()).getTime() + type), output, 'utf-8');
	}
	
	
	/**
	 * 高级版的saveAsPoMerge，除了提取项目中需要翻译的，还需要跟现有的已翻译的文件进行比较与合并
	 * @param  {String}    dir  源文件夹
	 */
	function saveAsPoMergePro(dir, dest, exist){
		// 新提取的
		var msgidList = extract.call(this, dir, true);
		
		// 已存在的
		var existedList = FS.readFileSync(exist, 'utf-8').match(/#:\s[^\n]*(\r|\n|\r\n)msgid (""((\r|\n|\r\n)"[^\n]*")+|"[^\n]*")(\r|\n|\r\n)msgstr (""((\r|\n|\r\n)"[^\n]*")+|"[^\n]*")/g);
		
		// 输出的模板
		var output = this._po;
		
		// 已翻译过的先提取出来
		var tmp;

		if (existedList) {
			for (var i = 0, l = existedList.length; i < l; i++) {
				existedList[i] = existedList[i].replace(/"(\r|\n|\r\n)"/g, '');
				// 根据po的文件格式提取键值对，其中tmp数组第一个元素为key，第二个元素为value
				tmp = existedList[i].replace(/(\r|\n|\r\n)msgid "/, "||").replace(/"(\r|\n|\r\n)msgstr "/, "||").replace(/"$/, "").split('||');
				if (tmp[1] !== '' && tmp[2] !== '') {
					if (tmp[1] in msgidList) { // 表明已翻译的与提取的重复，这时取已翻译的
						output += '#: ' + msgidList[tmp[1]].filename + ':' + msgidList[tmp[1]].index +
							'\r\nmsgid "' + tmp[1] + '"' +
							'\r\nmsgstr "' + tmp[2] + '"\r\n\r\n';
					}
					msgidList[tmp[1]] = null;
					delete msgidList[tmp[1]];
				}
			}
		}
		
		
		// 未翻译的往后面添加
		for(var itm in msgidList){
			output += '#: ' + msgidList[itm].filename + ':' + msgidList[itm].index +
					  '\r\nmsgid "' + msgidList[itm].msgid + '"' +
					  '\r\nmsgstr ""\r\n\r\n';
		}
		FS.writeFileSync(dest ? dest : (dist + '/' + 'PO_MERGE_' + (new Date()).getTime() + type), output, 'utf-8');
	}
	
	
	/**
	 * 提取标记的待翻译字符串
	 * @param  {String}    file  源文件或文件夹
	 * @param  {Boolean}   merge  同gettext
	 */
	function extract(file, merge){
		// 记录重复条目
		var repeat = {};
		var rs = null;
	
		if(FS.existsSync(file)){
			if(FS.statSync(file).isFile()){
				rs = extractSingle.call(this, file);
			}else if(FS.statSync(file).isDirectory()){
				rs = merge ? extractMerge.call(this, file) : extractSingle.call(this, file);
			}else{
				console.log(file + "type isn't avaliabled!");
			}
		}else{
			console.log(file + "isn't existed!");
		}
		
		logRepeat.call(this);
		return rs;
	
		
		/**
		 * 单文件提取msgid
		 * @attention  当匹配出相同时，则需要做记录
		 * @param  {String}    file  源文件
		 * @param  {Object}    output  匹配的条目对象
		 */
		function extractSingle(file, output){
			// 为了记住所在的行数，需要先预处理，根据换行符分割数组
			var content = FS.readFileSync(file, 'utf-8').split(/\n/g);
			var filename = PATH.basename(file);
			
			
			// 输出数组，每个元素都是一个带行号和msgid的对象
			output = output || {};
			
			// 临时
			var tmp, m, n, key;
			
			// 逐行匹配，将匹配到待翻译的字符串入队
			for(var i = 0, l = content.length; i < l; i++){
				tmp = content[i].match(this._xreg);
				if(tmp){
					for(m = 0, n = tmp.length; m < n; m++){
						key = this._greg(tmp[m]);

						// 记录重复出现的msgid，不覆盖旧值
						if(key in output){
							repeat[key] ? null : repeat[key] = {};
							repeat[key].src = 'source\t' + output[key].filename + ':' + output[key].index
							repeat[key].others ? repeat[key].others.push(filename + ':' + i) : repeat[key].others = [filename + ':' + i];
						}else{
							output[key] = {
								filename: filename,
								index: i,
								msgid: key
							}
						}
					}
				}
			}
			
			return output;
		}
		
		
		/**
		 * 多文件文件提取msgid并合并
		 * @param  {String}    dir  源文件夹
		 * @param  {Object}    output  匹配的条目对象
		 */
		function extractMerge(dir, output){
			if(dir.indexOf(dist) > -1){
				return;
			}
			var list = FS.readdirSync(dir);
			var file;
			var _this = this;
			output = output || {};
			list.forEach(function(name, idx){
				file = dir + '/' + name;
				if(FS.statSync(file).isDirectory()){
					extractMerge.call(_this, file, output);
				}else{
					extractSingle.call(_this, file, output);
				}
			});
			return output;
		}
		
		
		/**
		 * 日志：提取待翻译的文本中出现的重复条目
		 */
		function logRepeat(){
			if(JSON.stringify(repeat).length > 2){
				var log = "#项目提取中出现重复的翻译条目：\r\n\r\n";
				var itm, tmp;
				for(itm in repeat){
					tmp = repeat[itm];
					log += 'msgid\t"' + itm + '"\r\n' + tmp.src + '\r\nrepeat\t';
					log += tmp.others.join(',') + '\r\n\r\n';
				}
				FS.writeFileSync(dist + '/' + 'PO_MERGE_REPEAT.log', log, 'utf-8');
			}
		}
	}
}



/**
 * 翻译原文件，输出翻译后的内容
 * @param  {String}    i18n  已翻译好的文件
 * @param  {String}    src   源文件夹
 * @param  {String}    dist  翻译后的目前文件夹
 * 
 * @param  {String}    replacestr  将提取出的待翻译的字符串替换为某个标记，方便开发人员匹配需要翻译的词语句子, 可选
 */
I18n.prototype.gettext = function(i18n, src, dist, replacestr){
	if(FS.existsSync(i18n)){
		if(!dist){
			if(FS.statSync(src).isDirectory()){
				dist = src + '_dist';
			}else{
				dist = PATH.dirname(src) + '_dist/' + PATH.basename(src);
			}
		}
		
		// 确保输出的目标文件夹存在
		FS.existsSync(dist) ? null : this._fileType.test(dist) ? mkdir(PATH.dirname(dist)) : mkdir(dist);
	
		switch(PATH.extname(i18n)){
			case '.xls':
			case '.xlsx':
				gettextXls();
				break;
			case '.po':
			case '.pot':
				gettextPo.call(this);
				break;
			default: ;
				break;
		}
	}else{
		console.log(i18n + " isn't existed!");
	}
	
	
	/**
	 * 以po文件进行翻译
	 */
	function gettextPo(){
		var matches = FS.readFileSync(i18n, 'utf-8').match(/msgid (""((\r|\n|\r\n)"[^\n]*")+|"[^\n]*")(\r|\n|\r\n)msgstr (""((\r|\n|\r\n)"[^\n]*")+|"[^\n]*")/g);

		for(var i = 0,l = matches.length; i < l; i++){
			matches[i] = matches[i].replace(/"(\r|\n|\r\n)"/g, '');
		}

		if(FS.statSync(src).isDirectory()){
			traverseFilesInner.call(this, src);
		}else{
			this._fileType.test(PATH.extname(src)) ? translate.call(this, src, dist) : null;
		}
		
		
		/**
		 * 遍历文件夹进行翻译
		 * @param  {String}    dir  源文件夹
		 */
		function traverseFilesInner(dir){
			var list = FS.readdirSync(dir);
			var file, fileDist;
			var _this = this;
			list.forEach(function(name, idx){
				file = dir + '/' + name;
				fileDist = file.replace(src, dist);
				
				// 需要过滤某些类型的文件 
				if(FS.statSync(file).isDirectory()){
					// 需要创建相关的文件夹，确保写文件的时候不会出错
					FS.existsSync(fileDist) ? null : FS.mkdirSync(fileDist);
					traverseFilesInner.call(_this, file);
				}else if(_this._fileType.test(PATH.extname(file))){
					// console.log(file);
					translate.call(_this, file, fileDist, replacestr);
				}else{
					// 直接复制不需要翻译的文件
					// console.log(file + ':' + _this._fileType.test(PATH.extname(name)))
					FS.writeFileSync(fileDist, FS.readFileSync(file));
				}
			})
		}
		
		
		/**
		 * 翻译原文件，输出翻译后的内容
		 * @param  {String}    file  源文件路径
		 * @param  {String}    dist  翻译后的目前文件路径
		 */
		function translate(file, dist, rpstr){
			var content = FS.readFileSync(file, 'utf-8');
			var tmp;
			for(var i = 0,l = matches.length; i < l; i++){
				// 根据po的文件格式提取键值对，其中tmp数组第一个元素为key，第二个元素为value
				tmp = matches[i].replace(/msgid "|("$)/g, "").replace(/"(\r|\n|\r\n)msgstr "/, '||').split('||');
				if(tmp[0] !== '' && tmp[1] !== ''){
					content = content.replace(new RegExp(('__("' + tmp[0] + '")' + "|__('" + tmp[0] + "')").replace(/[`~!@#$%^&*()+<>?:{},.\/;\[\]]/g, '\\$&'), 'g'), tmp[1]);
				}else if(tmp[0] !== ''){
					content = content.replace(new RegExp(('__("' + tmp[0] + '")' + "|__('" + tmp[0] + "')").replace(/[`~!@#$%^&*()+<>?:{},.\/;\[\]]/g, '\\$&'), 'g'), rpstr ? rpstr : tmp[0]);
				}
			}
			
			// 输出文件
			FS.writeFileSync(dist, content, 'utf-8');
		}
	}
}

