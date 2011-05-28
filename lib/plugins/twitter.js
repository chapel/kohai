/* twitter.js - plugin for handling real-time communications with Twitter */
var twitobj = require('twitter');
var Plugin = require('../plugin');

  var plugin = new Plugin('twitter');
  
  plugin.start(function(client) {
    var config = plugin.config;
    var tracking = config.plugins.twitter.track
    if(!tracking) { tracking=[] }
    else { tracking = tracking.concat() }
    beQuiet = false

    if (!config.auth.twitter.consumer_key) {
      client.log("warn: twitter credentials not detected, disabling Twitter functionality")
    } else {

      twit = new twitobj(config.auth.twitter); 
      twit.verifyCredentials(function (data) { 
        if (data.statusCode == 401) {
          client.log("err: twitter credentials have been rejected by the Twitter API.")
        }
      });

    }
    
    //plugin.once("join", function (channel, nick) {
      //config.channels.forEach(function (channel, index) { 
        //client.say(channel, "I am Kohai, semi-useful communications-facilitating pseudointelligence!")
      //})
      
      // TODO: remove this typeof check
      // we should have knowledge of the current state of the twitter plugin
      if(typeof twit !== 'undefined'){

        try {
          client.log("info: attempting connection to Twitter stream API...")
          twit.stream('user', {track:config.plugins.twitter.track}, function(stream) {
            client.log("info: connection successful.  Awaiting tweets...")
            stream.on('data', function (data) {
              if(!beQuiet) {
                if((data.text)&&((!data.text.match(/.*\bRT:?.*/i))&&(!data.retweeted))) {
                  config.channels.forEach(function (channel, index) {
                    data.text = data.text.replace(/\r/g, ' ').replace(/\n/g, ' ');
                    client.say(channel, "@" + data.user.screen_name + ": " + data.text)
                  })
                  //console.log("@" + data.user.screen_name + ": " + data.text)
                }
              }
            })
          })
        }
        catch(error) { 
          //console.log(error); 
        }

      }
    //})
    var timer;
    var commands = {
      tweet: function (channel, name, message) {
        if (typeof twit !== 'undefined') {
          var re = new RegExp("^"+config.plugins.irc.command_string+"tweet\\s(.{1,140})", "i");
          var tweet = re.exec(message);
          twit.updateStatus(tweet[1], function (data) {
            client.log("Tweeted: " + tweet[1] + " For: " + name)
          });
        }
        else {
          client.say(channel, "Sorry, my Twitter connection is not currently available.");
        }
      }, 
      mute : function (channel) {
        if(!beQuiet) {
          beQuiet = true;
          timer = setTimeout(function(){
            if(beQuiet) {
              beQuiet = false; 
              client.say(channel, "Twitter mute expired.");
            }
          }, (config.plugins.irc.mute_timer * 1000));
          client.say(channel, "Twitter stream muted for the next "+config.plugins.irc.mute_timer+" seconds.");
        }
        else { client.say(channel, "Already muted!") }
      },

      unmute : function (channel) {
        if(beQuiet){
          beQuiet = false;
          client.say(channel, "Twitter mute cancelled.");
          clearTimeout(timer);
        }
        else { client.say(channel, "Not currently muted!"); }
      },
    }
    plugin.setTriggers(commands); 
  });

