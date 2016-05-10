const path = require('path');
const gulp = require('gulp');

const workflow = require('gulp-workflow');
workflow.init({ ENTRY_FILE: 'Form.js' });
const { build } = workflow;

gulp.task('clean', workflow.clean);

gulp.task('build', build.basic);
gulp.task('build:min', build.min);

gulp.task('release',(done) => {
	const run = require('run-sequence');
	return run(
		'clean',
		['build', 'build:min'],
		done
	);
});

gulp.task('default', (done) => {
	const run = require('run-sequence');
	return run(
		'clean',
		'build',
		done
	);
});
