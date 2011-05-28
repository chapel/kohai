var events = require('events'),
    util = require('util'),
    dnode = require('dnode');
module.exports = Plugin;
exports.Plugin = Plugin;

function Plugin(name) {
  this.name = name;
  events.EventEmitter.call(this);
  var self = this;
  this.self = self;
  this.triggers = {};
  this.setTriggers = function(commands) {
    Object.keys(commands).forEach(function(key) {
      self.triggers[key] = commands[key];
    });
  }
}
util.inherits(Plugin, events.EventEmitter);

Plugin.prototype.start = function(cb) {
  var self = this.self;
  dnode.connect(6000, { reconnect: 1000 }, function(remote, conn) {
    var emit = self.emit.bind(self)
    remote.subscribe(emit, self.name, function(config) {
      self.config = config;
      cb(remote)
    });
  });
  
  self.on('configChange', function(config) {
    self.config = config;
  })
  self.on('message', function(channel, from, message) {
    //client.say(channel, from + ': ' + msg)
    re = new RegExp("^"+self.config.plugins.irc.command_string+"(\\S+)(.*|$)?", "i")
    var trigger_match = message.match(re)
    if(trigger_match) {
      var trigger = trigger_match[1]
      var handler = self.triggers[trigger]
      if(handler) {
        if(trigger_match[2]) {
          trigger_match[2] = trigger_match[2].replace(/^\s/, '')
          var args = trigger_match[2].split(/\s/)
        }
        else {var args = []}
        handler.apply(self,[channel,from,message].concat(args));
      }
    }
  })
}