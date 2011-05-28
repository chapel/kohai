/* irc.js - plugin for dealing with irc */
var Plugin = require('../plugin');

  var plugin = new Plugin('irc');
  
  plugin.start(function(client) {
    var config = plugin.config;
    plugin.on("message", function (channel, from, message){
      //console.log(from, " : ", message)
      //Triggers here are for conversational actions available to any IRC user
      var talkSmack = message.match(/\bkohai\s.*\bbot\b/i)
      var intro = message.match(/.*\bkohai:(?:\s|$).*/i)
      if(talkSmack) client.say(channel, "'Bot' is a derogatory term, and I'm offended.")
      if(intro) client.say(channel, "I am Kohai, semi-useful communications-facilitating pseudointelligence!")
    })
    plugin.on("join", function (channel, nick) {
      //console.log(nick, " has joined ", channel)
      config.plugins.irc.oplist.forEach(function (name, index) {
        if (nick == name) {client.send('MODE', channel, '+o', nick)}
      })
      config.plugins.irc.voicelist.forEach(function (name, index) {
        if (nick == name) {client.send('MODE', channel, '+v', nick)}
      })
      config.plugins.irc.banlist.forEach(function (name, index) {
        if (nick == name) {
          client.send('MODE', channel, '+b', nick);
          client.send('kick', channel, nick);
        }
      })
    })
    plugin.on("part", function (channel, nick, reason) {
      //console.log(nick, " has left ", channel, " because ", reason)
      //client.say(channel, "Bye " + nick + "!")
    })
    
    var commands = {
      join : function (channel, name, message, targ) {
        if (plugin.config.channels.indexOf(targ) === -1) {
          client.addChannel(targ);
          client.say(channel, "I have now also joined "+targ);
          client.log("Joined channel ", targ, " at the behest of ", name);
        } else {
          client.say(channel, 'I am already in that channel!');
        }
      },

      part : function (channel, name, message, targ) {
        if (plugin.config.channels.indexOf(targ) !== -1) {
          client.rmChannel(targ);
        } else {
          client.say(channel, 'I am not in that channel, how can I leave it?');
        }
      },
      kick : function (channel, user, message, targ) {
        client.log(user, " has been kicked from ", channel);
        client.say(channel, "kohai says GTFO!");
        client.send('kick ', channel, targ);
      },

      ban : function (channel, user, message, targ) {
        client.say(channel, "BEHOLD THE MIGHT OF THE BANHAMMER!");
        client.log(targ, " has been banned from ", channel, " at the request of ", user);
        client.send('MODE', channel, '+b', targ);
        client.send('kick ', channel, targ);
      },

      unban : function (channel, user, message, targ) {
        client.say(channel, "Mercy has been bestowed upon " + targ);
        client.log(targ, " has been unbanned from ", channel, " at the request of ", user);
        client.send('MODE', channel, '-b', targ);
      },

      stfu : function (channel, user, message, targ) {
        client.say(channel, targ + "'s Gross Adjusted Noobosity has exceeded specified telemetry parameters.  " + config.plugins.irc.mute_timer + " second mute has been initiated.");
        client.log(targ, " has been muted for ", config.plugins.irc.mute_timer, " seconds.");
        client.send('MODE', channel, '+q', targ);
        setTimeout(function(){
            client.send('MODE', channel, '-q', targ); 
            client.say(channel, "Noobosity telemetry data now below thresholds.  Removing mute for "+targ+".")
          }, (config.plugins.irc.mute_timer * 1000));
      },
    }
    plugin.setTriggers(commands);
  })
