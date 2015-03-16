var PATH = require('path');
var colors = require('colors');

var gruntUtil = require('bjs-command-util');
var jsParser = require(PATH.join(__dirname, 'lib/jsParser.js'));
var cssParser = require(PATH.join(__dirname, 'lib/cssParser.js'));
var htmlParser = require(PATH.join(__dirname, 'lib/htmlParser.js'));
var tplParser = require(PATH.join(__dirname, 'lib/tplParser.js'));


module.exports = function(files, options, parser){
  options = gruntUtil.options({
    paths: ['sea-modules'],
    idleading: '',
    alias: {},
    process: false,
    styleBox: false,

    // output beautifier
    uglify: {
      beautify: true,
      comments: true
    }
  }, options);

  // make sure required one parser
  parser ? null : parser = {'.js': true};

  // use gruntUtil to pasrse files list
  gruntUtil.files(files).forEach(function(fileObj) {
    // cwd shouldn't exist after normalize path
    if (fileObj.cwd) {
      console.log('[Warn]: should specify expand when use cwd');
      // grunt.fail.warn('should specify expand when use cwd');
    }

    var src = fileObj.src[0], dest = fileObj.dest;

    // use relative parser to do the complie job
    if(parser['.js'] && /\.js$/.test(src)){
      jsParser.jsParser({
        src: src,
        name: PATH.relative(fileObj.orig.cwd || '', src),
        dest: dest
      }, options);
    }

    // TODO: Used whether is required
    if(parser['.css'] && /\.css$/.test(src) && false){
      cssParser.css2jsParser({
        src: src,
        name: PATH.relative(fileObj.orig.cwd || '', src),
        dest: dest
      }, options);
      cssParser.cssParser({
        src: src,
        name: PATH.relative(fileObj.orig.cwd || '', src),
        dest: dest
      }, options);
    }

    if(parser['.html'] && /\.html$/.test(src)){
      htmlParser.html2jsParser({
        src: src,
        name: PATH.relative(fileObj.orig.cwd || '', src),
        dest: dest
      }, options);
    }

    if(parser['.tpl'] && /\.tpl$/.test(src)){
      tplParser.tplParser({
        src: src,
        name: PATH.relative(fileObj.orig.cwd || '', src),
        dest: dest
      }, options);
    }

  });
}