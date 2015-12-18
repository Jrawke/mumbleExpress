var gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    concat = require('gulp-concat'),
    clean = require('gulp-clean'),
    compass = require('gulp-compass');

gulp.task('browserify', function() {
    gulp.src(['client/scripts/main.js'])
	.pipe(browserify({
	    insertGlobals: true,
	    debug: true
	}))
	.pipe(concat('bundle.js'))
	.pipe(gulp.dest('dist/js'));
});

gulp.task('views', function() {
    gulp.src('client/index.html')
	.pipe(gulp.dest('dist/'));

    gulp.src('./client/views/**/*')
	.pipe(gulp.dest('dist/views/'));
});

gulp.task('compass', function() {
    gulp.src('./client/styles/sass/*')
        .pipe(compass({
	    config_file: './client/styles/config.rb',
	    css: './dist/',
	    sass: './client/styles/sass/'
	}))
        .pipe(gulp.dest('dist/assets/'));

    gulp.src('./client/styles/icons/*')
	.pipe(gulp.dest('dist/icons'));
});

gulp.task('default', function() {
    gulp.run('browserify', 'views', 'compass');
});
	  
