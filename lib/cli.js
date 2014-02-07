var feedback = require('feedback');
var _ = require('lodash');
var Divshot = require('divshot');
var errors = require('./errors');
var Command = require('./command');
var API_HOST = 'https://api.divshot.com';

function Cli (options) {
  this._commands = {};
  this.debug = options.debug;
  this.args = options.args;
  this.user = options.user;
  this.cwd = options.cwd;
  this.errors = errors;
  this.api = Divshot.createClient({
    token: this.user.get('token'),
    host: options.host || API_HOST
  });
  this.callback = options.callback;
};

Cli.prototype.command = function () {
  var aliases = _.toArray(arguments);
  var command = new Command({
    aliases: aliases
  });
  
  // Track our commands
  aliases.forEach(function (alias) {
    this._commands[alias] = command;
  }, this);
  
  return command;
};

Cli.prototype.getCommand = function (alias) {
  return this._commands[alias];
};

Cli.prototype.log = function (msg, opts) {
  var logger = 'info';
  
  if (opts && opts.success) logger = 'success';{
  if (this.debug || (opts && opts.debug)) feedback[logger](msg);}
};

Cli.prototype.error = function (msg) {
  if (this.debug) {
    feedback.error(msg);
    process.exit(1);
  }
  
  this.callback(msg);
};

module.exports = Cli;