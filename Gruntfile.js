/*global module:false*/
module.exports = function (grunt) {

    // Project configuration
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            sources: {
                all: ['src/**/*.js'],
                prod: ['src/**/*.js', '!src/**/*.spec.js'],
                ordered: {
                    libraries: [
                        // this library doesn't work properly being included after angular
                        'bower_components/js-sha3/src/sha3.js',

                        'bower_components/angular/angular.js',
                        'bower_components/angular-sanitize/angular-sanitize.js',
                        'bower_components/angular-mocks/angular-mocks.js',
                        'bower_components/restangular/dist/restangular.js',
                        'bower_components/underscore/underscore.js',
                        'bower_components/decimal.js/decimal.js',
                        'bower_components/Base58/Base58.js',
                        'bower_components/cryptojslib/rollups/aes.js',
                        'bower_components/cryptojslib/rollups/sha256.js',
                        'bower_components/curve25519-js/axlsign.js'
                    ],
                    local: [
                        'src/vendor/blake2b.js',
                        'src/vendor/converters.js',
                        'src/vendor/extensions.js',

                        // project sources
                        'src/core/waves.money.js',
                        'src/core/core.module.js',
                        'src/core/core.constants.js',
                        'src/core/core.directives.module.js',
                        'src/core/core.services.module.js',
                        'src/core/core.filter.module.js',
                        'src/core/core.services.wordlist.constant.js',
                        'src/core/passphrase.service.js',
                        'src/core/account.service.js',
                        'src/core/address.service.js',
                        'src/core/crypto.service.js',
                        'src/core/asset.service.js',
                        'src/core/api.service.js',
                        'src/core/utility.service.js',
                        'src/core/localstorage.chrome.service.js',
                        'src/core/localstorage.html5.service.js',
                        'src/core/storage.provider.js',
                        'src/core/formatting.service.js',
                        'src/core/transfer.service.js',
                        'src/core/formatting.filter.js',
                        'src/core/waves.money.filter.js',
                        'src/core/base58.service.js',
                        'src/core/base58.directive.js'
                    ]
                }
            },
            editor: 'nano',
            target: 'wavesplatform-core'
        },
        // Task configuration.
        jshint: {
            all: ['<%= meta.sources.all %>', '!src/vendor/*.js']
        },
        jscs: {
            src: ['<%= meta.sources.all %>', '!src/vendor/*.js'],
            options: {
                config: '.jscsrc'
            }
        },
        watch: {
            scripts: {
                files: ['Gruntfile.js', '<%= meta.sources.all %>'],
                tasks: ['test'],
                options: {
                    interrupt: true
                }
            }
        },
        karma: {
            options: {
                configFile: 'karma.conf.js'
            },
            development: {
                options: {
                    files: [
                        '<%= meta.sources.ordered.libraries %>',
                        '<%= meta.sources.ordered.local %>',

                        'src/**/*.spec.js'
                    ]
                }
            },
            distr: {
                options: {
                    files: [
                        '<%= meta.sources.ordered.libraries %>',
                        'distr/<%= meta.target %>.js',
                        'src/**/*.spec.js'
                    ]
                }
            },
            minified: {
                options: {
                    files: [
                        '<%= meta.sources.ordered.libraries %>',
                        'distr/<%= meta.target %>.min.js',
                        'src/**/*.spec.js'
                    ]
                }
            }
        },
        concat: {
            distr: {
                src: ['<%= meta.sources.ordered.local %>'],
                dest: 'distr/<%= meta.target %>.js'
            }
        },
        uglify: {
            options: {
                mangle: false
            },
            distr: {
                files: {
                    'distr/<%= meta.target %>.min.js': ['distr/<%= meta.target %>.js']
                }
            }
        },
        clean: ['distr/**'],
        bump: {
            options: {
                files: ['package.json', 'bower.json'],
                updateConfigs: ['pkg'],
                commit: true, // debug
                push: 'branch', // debug
                pushTo: 'origin',
                createTag: false,
                commitMessage: "chore(version): bumping version v%VERSION%",
            }
        },
        shell: {
            release: {
                command: "<%= meta.editor %> distr/CHANGELOG.tmp"
            }
        },
        conventionalChangelog: {
            release: {
                options: {
                    changelogOpts: {
                        // conventional-changelog options go here
                        preset: 'angular',
                        append: false,
                        releaseCount: 0
                    },
                    context: {
                        // context goes here
                    },
                    gitRawCommitsOpts: {
                        // git-raw-commits options go here
                    },
                    parserOpts: {
                        // conventional-commits-parser options go here
                    },
                    writerOpts: {
                        // conventional-changelog-writer options go here
                    }
                },
                src: 'distr/CHANGELOG.tmp'
            }
        },
        "github-release": {
            options: {
                repository : "wavesplatform/wavesplatform.core.js",
                auth: {
                    user: process.env["GITHUB_ACCESS_TOKEN"],
                    password: ''
                },
                release: {
                    tag_name: "v<%= pkg.version %>",
                    name: "v<%= pkg.version %>",
                    bodyFilename: 'distr/CHANGELOG.tmp',
                    draft: true,
                    prerelease: true
                }
            },
            files: {
                expand: true,
                src: ['<%= compress.testnet.options.archive %>', '<%= compress.mainnet.options.archive %>']
            }
        }
    });

    // These plugins provide necessary tasks.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-bump');
    //grunt.loadNpmTasks('grunt-github-releaser');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-karma');
    grunt.loadNpmTasks('grunt-conventional-changelog');

    grunt.registerTask('emptyChangelog', 'Creates an empty changelog', function() {
        grunt.file.write('distr/CHANGELOG.tmp', '');
    });

    grunt.registerTask('distr', ['clean', 'build', 'emptyChangelog']);
    grunt.registerTask('publish', ['bump', 'distr', 'conventionalChangelog', 'shell', 'github-release']);
    grunt.registerTask('test', ['jshint', 'jscs', 'karma:development']);
    grunt.registerTask('build', [
        'jscs',
        'jshint',
        'karma:development',
        'concat',
        'karma:distr',
        'uglify',
        'karma:minified'
    ]);
};
