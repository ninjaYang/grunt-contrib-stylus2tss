/*
 * grunt-contrib-stylus2tss
 * https://lifevar.com/
 *
 * Copyright (c) 2014 Lifevar Co. Ltd.
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var async = require('async');
  var _ = require('lodash');

  grunt.registerMultiTask('stylus2tss', 'Compile Stylus files into TSS', function() {
     var done = this.async();
    var path = require('path');
    var chalk = require('chalk');

    var options = this.options({
      banner: '',
      compress: true
    });

    var banner = options.banner;

    if (options.basePath || options.flatten) {
      grunt.fail.warn('Experimental destination wildcards are no longer supported. Please refer to README.');
    }

    async.forEachSeries(this.files, function(f, n) {
      var destFile = path.normalize(f.dest);
      var srcFiles = f.src.filter(function(filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      });

      if (srcFiles.length === 0) {
        // No src files, goto next target. Warn would have been issued above.
        return n();
      }

      var compiled = [];
      async.concatSeries(srcFiles, function(file, next) {
        compileStylus(file, options, function(css, err) {
          if (!err) {
            compiled.push(css);
            next(null);
          } else {
            n(false);
          }
        });
      }, function() {
        if (compiled.length < 1) {
          grunt.log.warn('Destination not written because compiled files were empty.');
        } else {
          grunt.file.write(destFile, banner + compiled.join(grunt.util.normalizelf(grunt.util.linefeed)));
          grunt.log.writeln('File ' + chalk.cyan(destFile) + ' created.');
        }
        n();
      });
    }, done);
  });

  var compileStylus = function(srcFile, options, callback) {
    options = _.extend({filename: srcFile}, options);

    // Never compress output in debug mode
    if (grunt.option('debug')) {
      options.compress = false;
    }

    var srcCode = grunt.file.read(srcFile);
    var stylus = require('stylus');
    var s = stylus(srcCode);

    if ( options.rawDefine ) {
      // convert string option to an array with single value.
      if ( _.isString( options.rawDefine ) ) {
        options.rawDefine = [options.rawDefine];
      }
    }

    function shouldUseRawDefine(key) {
      if( options.rawDefine === true ) {
        return true;
      } else if ( _.isArray( options.rawDefine ) ) {
        return _.contains(options.rawDefine, key);
      } else {
        return false;
      }
    }


    _.each(options, function(value, key) {
      if (key === 'urlfunc') {
        // Custom name of function for embedding images as Data URI
        if (typeof value === 'string') {
          s.define(value, stylus.url());
        } else {
          s.define(value.name, stylus.url({
            limit: value.limit != null ? value.limit : 30000,
            paths: value.paths ? value.paths : []
          }));
        }
      } else if (key === 'use') {
        value.forEach(function(func) {
          if (typeof func === 'function') {
            s.use(func());
          }
        });
      } else if (key === 'define') {

        for (var defineName in value) {
          s.define(defineName, value[defineName], shouldUseRawDefine(defineName));
        }
      } else if (key === 'rawDefine') {
        // do nothing.
      } else if (key === 'import') {
        value.forEach(function(stylusModule) {
          s.import(stylusModule);
        });
      } else if (key === 'resolve url') {
        s.define('url', stylus.resolver());
      } else {
        s.set(key, value);
      }
    });

    // Load Nib if available
    try {
      s.use(require('nib')());
    } catch (e) {}

    s.render(function(err, css) {
      if (err) {
        grunt.log.error(err);
        grunt.fail.warn('Stylus failed to compile.');
	    
        callback(css, true);
      } else {
		  var tss;

		   css = css.replace(/;/gi, ",");// ; to , css = css.replace(/\}/gi, "},"); // add , css =
		  css.replace(/([^\",\}]+?)\s?\{/gi, "\"$1\": {"); // class : css = css.replace(/,\n\},/gi, "\n\}"); // delete
		  last , css = css.replace(/\}\n\"/gi, "\},\n\""); // add , css = css.replace(/['"]expr(.+?)['"]/gi, "expr$1");
		  css = css.replace(/['"]Ti(.+?)['"]/gi, "Ti$1"); // Ti.UI.SIZE etc. css =
		  css.replace(/['"]Titanium(.+?)['"]/gi, "Titanium$1"); // Titanium.UI.SIZE etc. css =
		  css.replace(/['"]Alloy(.+?)['"]/gi, "Alloy$1"); // Alloy.xxx etc. tss = css; var tss2 = [];
		  tss.split("\n").forEach(function(line) { if (line.match(/font:/)) { var fontObj =
		  RegExp.rightContext.replace(/(^\s+)|(\s+$)/g, ""); var closeBrace = " }"; if (fontObj.match(/,$/)) {
		  closeBrace = closeBrace + ","; fontObj = fontObj.replace(/,$/, ""); }

		          tss2.push("  font: {");
		          var fontObjArray = fontObj.split(",");
		          for (var i = 0; i < fontObjArray.length; i++) {
		            var f = fontObjArray[i].replace(/(^\s+)|(\s+$)/g, "").replace(/ /, ":");
		            if (1 < fontObjArray.length && i < (fontObjArray.length - 1)) {
		              f = f + ",";
		            }
		            tss2.push("    " + f);
		          }

		          tss2.push(closeBrace);
		        } else {
		          tss2.push(line);
		        }
		      });
		  		
        callback(tss2.join("\n"), null);
      }
    });
  };
};
