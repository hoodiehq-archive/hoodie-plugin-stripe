module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({

      pkg: grunt.file.readJSON('package.json'),

      mocha_browser: {
          all: {options: {urls: ['http://localhost:<%= connect.options.port %>']}}
      },

      shell: {
        npmLink: {
          command: 'npm link && npm link hoodie-plugin-template'
        },
        npmUnlink: {
          command: 'npm unlink && npm unlink hoodie-plugin-template'
        },
        installPlugin: {
          command: 'hoodie install template'
        },
        removePlugin: {
          command: 'hoodie uninstall template'
        }/*,
        hoodieStart: {
          command: 'hoodie start --nobrowser --www test'
        }*/
      },

      hoodie: {
        start: {
          options: {
            www: 'test',
            callback: function (config) {
              grunt.config.set('connect.options.port', config.stack.www.port);
            }
          }
        }
      }

    });

    grunt.loadNpmTasks('grunt-mocha-browser');
    grunt.loadNpmTasks('grunt-continue');
    grunt.loadNpmTasks('grunt-hoodie');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', []);
    grunt.registerTask('test', [
        'shell:npmLink',
        'shell:installPlugin',
        'hoodie',
        'continueOn',
        'mocha_browser:all',
        'continueOff',
        'hoodie_stop',
        'shell:npmUnlink',
        'shell:removePlugin'
    ]);

};
