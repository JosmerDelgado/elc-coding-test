/**
 * Gulp file used for creating front end templates on local instances.
 */
'use strict';

// Configs
// Webpack Configs
const config = require( './config/general.config.js' );
const webpack_config_dev = require('./config/webpack.config.js');
const template_config = require( './config/template.data.js' );

// The gulp task runner
const gulp = require('gulp');

// CSS
const sass = require('gulp-sass');
const prefix = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');

//Node Server
const nodemon = require('nodemon');

// Images
const imagemin = require('gulp-imagemin');

// HTML Templating, we use mustache to ensure it works with the Live Drupal site
const mustache = require('gulp-mustache');

// Javasript - WebPack Version
const webpack = require('webpack-stream');
const uglify = require('uglify-js');

// Browser Sync to auto refresh and keep things quick
const browserSync = require('browser-sync');

// General Use Packages
const rename = require('gulp-rename');
const fs  = require('fs');
const git = require('gulp-git');

// Global
// Can be set either Dynamically using a date stamp or set manually by overriding the below with a string.
const _devFolder = config.development_folder || ".local_server";
const _prodFolder  = config.production_folder || "prod";
const _imageFolderName = config.image_folder || "img";
let _logfile = "";


// Error handling
// Add the Error to the Browser Sync message so you can see it easily
function errorLog( $err ) {
	console.log( $err );
	browserSync.notify( '<span style="file-size: 22px;">Error : ' + $err + '</span>', 10000 );
	this.emit('end');
}

function infoLog( $message ) {

	const ts = new Date();
	$message = '\n' + '[' + ts.getDate() + '/' + (ts.getMonth() + 1) + '/' + ts.getFullYear() + ' -- ' + ts.getHours() + ':' + ts.getMinutes() + ']  ' + (_logfile === "" ? 'Info task started' : $message);

	// grab the log file
	if(_logfile === "") {
		fs.readFile('./logs/.logfile.txt', 'utf8', function($err, $data) {
			if($err) {
				console.log('Error with logging file', $err);
			} else {
				// Store the data we have saved
				_logfile = $data;
				_logfile += $message;
				// Write with the new message
				fs.writeFile('./logs/.logfile.txt', _logfile, function () {
					// file logged
					return;
				});
			}
		});
	} else {
		// Append the new message
		_logfile += $message;

		// If git changes exist then also write these out
		git.exec({
			args: 'log', function($err, $out) {
				_logfile += "\n" + 'Git changes : ' + $out;
			}
		});

		// Write to file
		fs.writeFile('./logs/.logfile.txt', _logfile, function() {
			// file logged
			return;
		});
	}

}

// Browser Sync Server runing on default 3030 //

/*=====================================
=            Watched Tasks            =
=====================================*/

// Sass Task Runner
gulp.task('sass', function() {

	// Log this change
	infoLog('Sass ran on files');

	// Return the task
	return gulp.src('./app/sass/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({ outputStyle: 'compact', includePaths: ['./app/sass'] }) )
		.on('error', errorLog )
		.pipe( prefix({
			browsers: ['last 2 versions']
		}))
		.pipe(sourcemaps.write('./'))
		.pipe( gulp.dest('./' + _devFolder + '/css') )
		.pipe( browserSync.stream() );
});

//Node server task
gulp.task('server', function() {
    // configure nodemon
    nodemon({
        // the script to run the app
        script: 'server/app.js',
        // this listens to changes in any of these files/routes and restarts the application
        watch: ["server/app.js"],
        ext: 'js'
    })
    .on('restart', function () {
		infoLog('restarted!')
	});
});

// Scripts runner, this time using the Webpack Framework
gulp.task('scripts', function () {

	// Log this change
	infoLog('Scripts ran on main.js');

	// Return the task
	return gulp.src('./app/scripts/main.js')
		.pipe(webpack(
			webpack_config_dev
		))
		.on('error', errorLog)
		.pipe(gulp.dest('./' + _devFolder + '/js/'))
		.on('error', errorLog)
		.pipe(browserSync.stream());
	
});

// Scripts runner, this time using the Webpack Framework
gulp.task('minify', function () {

	// Log this change
	infoLog('Minify ran on the JS file');

	// Return the task
	return gulp.src('./prod/js/app.min.js')
		.pipe(uglify())
		.on('error', errorLog)
		.pipe(gulp.dest('./' + _devFolder + '/js/'))
		.on('error', errorLog);
});




// Template language compiler for taking Jade templates and moving them over to HTML files, 
// this is an alternative to using the Jade Renderer on the Server
gulp.task('mustache',function() {

	// Log this change
	infoLog('Mustache Templates ran on the HTML files');

	// Data for the site can be loaded via a JSON file
	return gulp.src(['./app/views/*.mustache'])
		.on('error', errorLog)
		.pipe(
			mustache( template_config )
		)
		.on('error', errorLog)
		.pipe(rename(function(path){
			path.extname = ".html";
		}))
		.pipe(gulp.dest('./' + _devFolder + '/'))
		.on('error', errorLog)
		.pipe(browserSync.stream());

});
gulp.task('templates', ['mustache'], function() {
	// Call both of the templates
});


/*=========================================
=            Non Watched Tasks            =
=       all need to be self executed      =
=========================================*/
 
// Scripts runner, converts all the third party JS and CSS etc. to a single vendor based file
// then compresses file and puts it in the correct folder.
gulp.task('vendor', function() {
	
	// Log this change
	infoLog('Vendor Scripts ran');

	// All the vendor JS
	gulp.src('./app/third_party/**/*.js')
		.pipe( uglify() )		
		.pipe( gulp.dest('./' + _devFolder + '/js') );

	// All the vendor CSS
	gulp.src('./app/third_party/**/*.css')
		.pipe( gulp.dest('./' + _devFolder + '/css') );

	gulp.src('./app/third_party/web_components/**/*')
		.pipe( gulp.dest('./' + _devFolder + '/web_components') );

});

// Clear out metadata from Photohshop Images and Shrink em' Down, has to be self exectued 
// as there are a few bugs with del and watching etc.
gulp.task('images', function() {

	// Log this change
	infoLog('Image Minification ran');

	// Create the new images
	return gulp.src('./app/images/**/*')
		.pipe( imagemin({
			progressive: true,
			svgoPlugins: [{removeViewBox: false}]
		}))
		.on('error', errorLog )
		.pipe(gulp.dest('./' + _devFolder + '/' + _imageFolderName + '/' ));
});


// Main task to create a full Prod Version
gulp.task('prod', ['image', 'templates', 'scripts', 'sass'], function() {

	// Log this change
	infoLog('Setup for Prod');

	// Javascript for Prod
	gulp.src('./' + _devFolder + "/js/**/*.js")
		.pipe( uglify() )
		.on('error', errorLog)
		.pipe(gulp.dest('./' + _prodFolder + '/js/'));

	// Sass for Prod
	gulp.src('./' + _devFolder + "/css/**/*.css")
		.on('error', errorLog)
		.pipe(gulp.dest('./' + _prodFolder + '/css/'));

	// HTML for Prod
	gulp.src('./' + _devFolder + "/css/**/*.html")
		.on('error', errorLog)
		.pipe(gulp.dest('./' + _prodFolder + '/'));

});



// Main task Runner for watching all the scripts, start by running through the tasks
// to ensure everything is up to date
gulp.task('watch', ['images', 'templates', 'scripts', 'sass', 'server'], function() {
	// Run the browser sync on port 3030 (no conflicts)
	browserSync.init({
		server: './' + _devFolder,
		port: config.dev_port || 3030
	});
	gulp.watch( './app/**/*.scss', ['sass'] );
	gulp.watch(['./app/scripts/**/*.jsx', './app/scripts/**/*.js'], ['scripts'] );
	gulp.watch(['./app/**/*.mustache', './app/**/*.json', './app/**/*.html'], ['mustache']);
});

gulp.task('dev_server', ['images', 'templates', 'scripts', 'sass'], function() {
	// Run the browser sync on port 3030 (no conflicts)
	browserSync.init({
		server: './' + _devFolder,
		port: config.dev_port || 3030
	});
	gulp.watch( './app/**/*.scss', ['sass'] );
	gulp.watch(['./app/scripts/**/*.jsx', './app/scripts/**/*.js'], ['scripts'] );
	gulp.watch(['./app/**/*.mustache', './app/**/*.json', './app/**/*.html'], ['mustache']);
});

// Task just to compile files down without the need to start a dev server
gulp.task('compile', ['images', 'templates', 'scripts', 'sass'], function () {
	return false;
});


// Default task runner for Gulp
gulp.task('default', ['watch'], function() {
	// Start up the watch task by default
});