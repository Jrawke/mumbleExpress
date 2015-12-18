var gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    concat = require('gulp-concat'),
    clean = require('gulp-clean'),
    compass = require('gulp-compass'),
    bower = require('gulp-bower');

//clean dist directory
gulp.task('clean', function() {
    return gulp.src('dist', {read: false})
	.pipe(clean());
});

//bundle js files for release
gulp.task('browserify', ['angular-ui-tree'], function() {
    gulp.src(['client/scripts/main.js'])
	.pipe(browserify({
	    insertGlobals: true,
	    debug: true
	}))
	.pipe(concat('bundle.js'))
	.pipe(gulp.dest('dist/js'));
});

//move angular views into release directory
gulp.task('views', function() {
    gulp.src('client/index.html')
	.pipe(gulp.dest('dist/'));

    gulp.src('./client/views/**/*')
	.pipe(gulp.dest('dist/views/'));
});

//preprocess CSS
gulp.task('compass', function() {
    gulp.src('./client/styles/sass/*.scss')
        .pipe(compass({
	    config_file: './client/styles/config.rb',
	    css: './dist/assets/',
	    sass: './client/styles/sass/'
	}))
        .pipe(gulp.dest('dist/assets/'));

    gulp.src('./client/styles/icons/*')
	.pipe(gulp.dest('dist/assets/icons'));
});


//install angular-ui-tree
gulp.task('angular-ui-tree', ['bower'], function () {
    gulp.src('bower_components/angular-ui-tree/dist/angular-ui-tree.min.css')
	.pipe(gulp.dest('dist/assets'));
});

gulp.task('bower', function() {
    return bower();
});

//package all files for release
gulp.task('default', ['browserify', 'views', 'compass']);
