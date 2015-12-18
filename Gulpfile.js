var gulp = require('gulp'),
    browserify = require('gulp-browserify'),
    concat = require('gulp-concat'),
    clean = require('gulp-clean');

// Browserify task
gulp.task('browserify', function() {
    // Single point of entry (make sure not to src ALL your files, browserify will figure it out for you)
    gulp.src(['client/scripts/main.js'])
	.pipe(browserify({
	    insertGlobals: true,
	    debug: true
	}))
    // Bundle to a single file
	.pipe(concat('bundle.js'))
    // Output it to our dist folder
	.pipe(gulp.dest('dist/js'));
});

// Views task
gulp.task('views', function() {
    // Get our index.html
    gulp.src('client/index.html')
    // And put it in the dist folder
	.pipe(gulp.dest('dist/'));

    // Any other view files from app/views
    gulp.src('./client/views/**/*')
    // Will be put in the dist/views folder
	.pipe(gulp.dest('dist/views/'));
});
