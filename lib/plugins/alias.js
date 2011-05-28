/* alias.js - stores various triggers for kohai that don't fit in any specific plugin */
var Plugin = require('../plugin');

  var plugin = new Plugin('alias');
  
  plugin.start(function(client) {
    var config = plugin.config;
    var whitelist = config.plugins.alias.whitelist;
    

    //
    //Triggers here are sensitive commands and only for whitelisted IRC users.
    //

    plugin.triggers['insult'] = function (channel, name, message, targ) {
      client.say(channel, targ + " is a wombat-loving heifer-puncher!")
    }
  })


