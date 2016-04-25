const path = require('path');
const gulp = require('gulp');

const PACKAGE_NAME = require('./package.json').name;
const SOURCE_PATH = './src';
const DIST_PATH = './lib';
const ENTRY_FILE = 'Form.js';

gulp.task('clean', (done) => {
	const del = require('del');
	del(DIST_PATH)
		.then(paths => {
			paths.forEach(path => console.log('delete: %s', path.replace(__dirname, '')));
			done();
		});
});

gulp.task('build', () => {
	const browserify = require('browserify');
	const makeVinylStream = require('vinyl-source-stream');
	const babelify = require('babelify');

	const options = {
		entries: [ENTRY_FILE],
		basedir: SOURCE_PATH,
		standalone: PACKAGE_NAME,
		transform: [babelify]
	};

	return browserify(options)
		.external(['react', 'react-dom', 'react/lib/PooledClass', 'lodash'])
		.bundle()
		.pipe(makeVinylStream(`${PACKAGE_NAME}.js`))
		.pipe(gulp.dest(DIST_PATH));
});

gulp.task('build:min', () => {
	const browserify = require('browserify');
	const makeVinylStream = require('vinyl-source-stream');
	const makeVinylBuffer = require('vinyl-buffer');
	const babelify = require('babelify');
	const uglify = require('gulp-uglify');

	const derequire = require('browserify-derequire');
	const collapse = require('bundle-collapser/plugin');

	const options = {
		entries: [ENTRY_FILE],
		basedir: SOURCE_PATH,
		standalone: PACKAGE_NAME,
		transform: [babelify],
		plugin: [derequire, collapse]
	};

	return browserify(options)
		.external(['react', 'react-dom', 'react/lib/PooledClass', 'lodash'])
		.bundle()
		.pipe(makeVinylStream(`${PACKAGE_NAME}.min.js`))
		.pipe(makeVinylBuffer())
		.pipe(uglify({
			compress: {
				if_return: true,
				dead_code: true,
				drop_console: true,
				drop_debugger: true
			},
			output: {
				ascii_only: true
			}
		}))
		.pipe(gulp.dest(DIST_PATH));
});

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
