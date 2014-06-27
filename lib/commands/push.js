var fs = require('fs');
var path = require('path');
var upload = require('divshot-upload');
var bundleFiles = require('../helpers/bundle_files');
var format = require('chalk');
var _ = require('lodash');

module.exports = function (cli) {
  var command = cli.command('push <environment>');
  
  command.before('authenticate', 'isApp');
  command.description('deploy your app to the specified environment');
  command.handler(function (environment, done) {
    if (!environment) environment = 'development';
    
    var config = cli.cwd.getConfig();
    var appConfigRootPath = (config.root === '/') ? './' : config.root;
    var appRootDir = path.resolve(process.cwd(), appConfigRootPath);
    var uploadOptions = {
      type: 'tar',
      token: cli.user.get('token'),
      environment: environment,
      config: config,
      host: cli.api.options.host,
      files: {}
    };
    
    if (!fs.existsSync(appRootDir)) return done(cli.errors.DIRECTORY_DOES_NOT_EXIST);
    
    if (environment === 'production') cli.log('\n' + format.yellow('Note:') + ' Deploying to production purges your application\'s CDN cache, which may take up to one minute.\n');
    
    bundleFiles(appRootDir, config.exclude)
      .on('file', trackFile)
      .pipe(upload(uploadOptions))
        .on('message', onMessage)
        .on('released', onReleased)
        .on('releasing', onReleasing)
        .on('loading', onLoading)
        .on('pushed', onPushed)
        .on('unreleased', onUnreleased)
        .on('error', onError);
    
    var needsNewline = false;
    
    function trackFile (file) {
      uploadOptions.files[file.relative] = {};
    }
    
    function onMessage (msg) {
      if (needsNewline) { process.stdout.write("\n\n"); needsNewline = false; }
      cli.log(msg);
    }
    
    function onReleased (msg) {
      process.stdout.write(format.green('.'));
      needsNewline = true;
    }
    
    function onReleasing () {
      cli.log('Releasing build...');
    }
    
    function onLoading () {
      cli.log('.'); // TODO: implement this
    }
    
    function onPushed () {
      var appUrl = (environment === 'production') 
        ? 'http://' + config.name + '.divshot.io'
        : 'http://' + environment + '.' + config.name + '.divshot.io';
      
      cli.log('Application deployed to ' + format.bold.white(environment), {success: true});
      cli.log('You can view your app at: ' + format.bold(appUrl), {success: true});
      done(null, appUrl);
      
      process.exit(0);
    }
    
    function onUnreleased (unreleasedFiles) {
      cli.log("\n");
      
      unreleasedFiles.forEach(function (file) {
        cli.log(format.red('Error:') + ' Failed to release ' + file.path);
      });
      cli.log();
      
      done(cli.errors.FILES_NOT_RELEASED);
    }
    
    function onError(err) {
      var errorMessage = err;
      if (_.isObject(err)) errorMessage = err.error;
      done(errorMessage);
    }
  });
};