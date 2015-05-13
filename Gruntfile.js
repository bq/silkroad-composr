'use strict';

var request = require('request');

module.exports = function(grunt) {
    // show elapsed time at the end
    require('time-grunt')(grunt);
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    var reloadPort = 35729,
        files;

    grunt.initConfig({

        pkg: grunt.file.readJSON('./package.json'),

        clean: {
            all: ['.tmp']
        },

        copy: {
            coverage: {
                expand: true,
                src: [
                    'test/**',
                    'src/**',
                    // express files
                    'public/**',
                    'package.json'
                ],
                dest: '.tmp/coverage/'
            }
        },

        blanket: {
            coverage: {
                src: ['.tmp/coverage/src/'],
                dest: '.tmp/coverage/src/'
            }
        },

        develop: {
            server: {
                file: 'bin/composer'
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'src/**/*.js'
            ]
        },

        watch: {
            options: {
                nospawn: true,
                livereload: reloadPort
            },
            server: {
                files: [
                    'bin/composer',
                    'src/**/*.js'
                ],
                tasks: ['develop', 'delayed-livereload']
            },
            'public': {
                files: [
                    'public/**/*.js',
                    'public/**/*.css',
                    'public/**/*.html',
                    'src/**/*.ejs'
                ],
                options: {
                    livereload: reloadPort
                }
            }
        },

        mochaTest: { //test for nodejs app with mocha
            testCoverage: {
                options: {
                    reporter: 'spec',
                },
                src: ['.tmp/coverage/test/runner.js']
            },
            coverage: {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: '.tmp/coverage/coverage.html'
                },
                src: ['.tmp/coverage/test/runner.coverage.js']
            },
            coveralls: {
                options: {
                    reporter: 'mocha-lcov-reporter',
                    quiet: true,
                    captureFile: '.tmp/coverage/lcov.info'
                },
                src: ['.tmp/coverage/test/runner.coverage.js']
            },
            'travis-cov': {
                options: {
                    reporter: 'travis-cov'
                },
                src: ['.tmp/coverage/test/runner.coverage.js']
            },
            tap: {
                options: {
                    reporter: 'tap',
                    captureFile: 'target/test_results.dirty.tap', // Optionally capture the reporter output to a file
                    quiet: false // Optionally suppress output to standard out (defaults to false)
                },
                src: ['test/runner.js']
            },
            ci: {
                options: {
                    reporter: 'spec',
                },
                src: ['test/runner.js']
            }
        },

        express: {
            composer: {
                options: {
                    script: 'bin/composer',
                    logs: {
                        out: 'composer.out.log',
                        err: 'composer.err.log'
                    }
                }
            },
            /*coverage: {
                options: {
                    script: 'bin/composer.coverage',
                    logs: {
                        out: 'composer.out.log',
                        err: 'composer.err.log'
                    }
                }
            }*/
        },

        coveralls: {
            options: {
                force: false
            },
            'default': {
                src: '.tmp/coverage/lcov.info'
            }
        },

        release: {
            /* For more options: https://github.com/geddski/grunt-release#options */
            options: {
                indentation: '\t', //default: '  ' (two spaces)
                commitMessage: 'Release v<%= version %>', //default: 'release <%= version %>'
                tagMessage: 'v<%= version %>', //default: 'Version <%= version %>',
                tagName: 'v<%= version %>'
            }
        }

    });

    grunt.config.requires('watch.server.files');
    files = grunt.config('watch.server.files');
    files = grunt.file.expand(files);

    grunt.registerTask('delayed-livereload', 'Live reload after the node server has restarted.', function() {
        var done = this.async();
        setTimeout(function() {
            request.get('http://localhost:' + reloadPort + '/changed?files=' + files.join(','), function(err, res) {
                var reloaded = !err && res.statusCode === 200;
                if (reloaded) {
                    grunt.log.ok('Delayed live reload successful.');
                } else {
                    grunt.log.error('Unable to make a delayed live reload.');
                }
                done(reloaded);
            });
        }, 500);
    });

    grunt.registerTask('default', [
        'clean',
        'jshint',
        'test',
        'develop',
        'watch'
    ]);

    grunt.registerTask('test:coverage', [
        'clean',
        'jshint',
        'copy:coverage',
        'blanket',
        'mochaTest:testCoverage',
        'mochaTest:coverage',
        'mochaTest:coveralls',
        'mochaTest:travis-cov',
        'coveralls'
    ]);

    grunt.registerTask('test', [
        'jshint',
        'mochaTest:ci'
    ]);
};
