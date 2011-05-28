var irc = require("irc"),
    fs = require("fs"),
    colors = require("colors"),
    path = require("path"),
    nconf = require("nconf"),
    dnode = require('dnode'),
    hash = require('hashish'),
    forever = require('forever');
    
var kohai = exports, plugins = {};

kohai.getConfig = function () {
  //Pull configuration info from config.json, but take it from config.json.defaults if config.json not present
  var confPath = path.existsSync(__dirname+'/../config.json');
    if (!confPath) {
      console.log('warn: config.json not detected.  Please either edit config.json before next start, or use the !config commands and !config save when finished.'.red);
      nconf.use('file', { file: __dirname+'/../config.json.defaults' });
      nconf.load();
      nconf.store.file = __dirname+'/../config.json';
    }
    else { 
      nconf.use('file', { file: __dirname+'/../config.json' });
      nconf.load();
    }
  
  return nconf.get('config');
}

kohai.start = function (config) {
  

  console.log('info: connecting to freenode. this will take a few moments and you might see an error message related to the cookies library.'.green);
  var client = new irc.Client(
      config.server || "irc.freenode.net"
    , config.nick   || "kohai"
    , config
  );

  client.on("error",function() {
    console.log(arguments)
  });

  if(config.auth) {
    auth = config.auth.irc
    if(auth) {
      client.on("motd",function motd(){ 
        //client.say("nickserv","identify "+auth.password)
        console.log("info: connected to freenode!".green)
      })
    }
  }
  
  config.channels.forEach(function (channel, index) {
    addListeners(channel);
    client.on("message" + channel, function (from, message){
      var whitelist = config.plugins.alias.whitelist;
      if (whitelist.indexOf(from) !== -1) {
        re = new RegExp("^"+config.plugins.irc.command_string+"(\\S+)(.*|$)?", "i")
        var trigger_match = message.match(re)
        if(trigger_match) {
          var trigger = trigger_match[1]
          var handler = kohai.triggers[trigger]
          if(handler) {
            if(trigger_match[2]) {
              trigger_match[2] = trigger_match[2].replace(/^\s/, '')
              var args = trigger_match[2].split(/\s/)
            }
            else {var args = []}
            handler.apply(client,[channel,from,message].concat(args));
          }
        }
      }
    })
  })
  
  kohai.triggers = {
    restart: function(channel, name, message, plugin) {
      if (plugin === 'all') {
        Object.getOwnPropertyNames(kohai.plugins).forEach( function (name) {
            kohai.plugins[name].restart();
            client.say(channel, 'Restarting plugin: '+name)
            console.log('Restarting '+ name)
        });
      } else {
        kohai.plugins[plugin+'.js'].restart();
        client.say(channel, 'Restarting plugin: '+plugin)
        console.log('Restarting '+ plugin)
      }
    },
    gtfo : function (channel, name, message) { 
      console.log(name, " has issued gtfo command from channel ", channel)
      client.disconnect();
      process.exit(0);
    }
  }
  
  dnode(function(dclient, conn) {
    var self = this;
    this.subscribe = function (emit, name, cb) {
        plugins[name] = emit;
        conn.on('end', function () {
            delete plugins[name];
        });
        cb(config)
    };
    var c = ["connect", "disconnect", "send", "join", "part", "say"];
    for (var x in c) {
      var fn = c[x];
      this[fn] = client[fn].bind(client);
    };
    this.conf = function(key, val, cb) {
      if (typeof val === 'function') {
        cb = val;
        val = undefined;
        cb(nconf.get('config:' + key))
      } else {
        nconf.set('config:' + key, val)
        config = nconf.get('config')
        hash(plugins).forEach(function(emit) {
          emit('configChange', config);
        })
      }
    }
    this.saveConfig = function(callback) {
      nconf.save(function(err) {
        if (err) {
          console.error('failed to save config: ' + err)
        }
        callback(err)
      });
    }
    this.addChannel = function(channel) {
      client.join(channel, function() {
        var channels = nconf.get('config:channels');
        channels.push(channel);
        nconf.set('config:channels', channels);
        addListeners(channel);
        updatePluginsConfig();
      });
    }
    this.rmChannel = function(channel) {
      client.part(channel, function() {
        var channels = nconf.get('config:channels');
        console.log(channels)
        channels = channels.filter( function (item) { 
          return item !== channel; 
        });
        console.log(channels)
        nconf.set('config:channels', channels);
        rmListeners(channel);
        updatePluginsConfig();
      })
    }
    this.log = function(msg) {
      console.log(msg);
    }
  }).listen(6000)
  
  function addListeners(channel) {
    console.log(channel)
    client.on("message" + channel, function (from, message){
      hash(plugins).forEach(function(emit) {
        emit('message', channel, from, message)
      });
    })
    client.on("join" + channel, function (nick) {
      hash(plugins).forEach(function(emit) {
        emit('join', channel, nick);
      })
    })
    client.on("part" + channel, function (nick, reason) {
      hash(plugins).forEach(function(emit) {
        emit('part', channel, nick, reason);
      })
    })
  }

  function rmListeners(channel) {
    var commands = ['message', 'join', 'part'];
    commands.forEach(function(command) {
      client.removeAllListeners(command+channel);
    })
  }
  
  function updatePluginsConfig() {
    config = nconf.get('config')
    hash(plugins).forEach(function(emit) {
      emit('configChange', config);
    })
  }

  kohai.plugins = getPlugins();
  //There's probably a more elegant solution to this - this was the first one I found.
  Object.getOwnPropertyNames(kohai.plugins).forEach( function (module) {
    try {
      kohai.plugins[module] = new (forever.Forever)(__dirname + '/plugins/' + module, { forever: true, silent: true });
      kohai.plugins[module].start();
    }
    catch (err) {
      console.error('Failed to load module ' + module + ': ' + err);
      //process.exit(1);
    }
  });

  return client;
  
};

function getPlugins() {
  var plugins = {};
  fs.readdirSync(__dirname + '/plugins').forEach(function (plugin) {
    if (plugin.match(/^.*\.js$/)) {
      plugins[plugin] = {};
    }
  });
  return plugins;
}

process.on('uncaughtException', function(err) {
  throw(err);
  process.exit(0);
})

process.on('exit', function() {
  console.log('Killing plugin processes before exiting');
  Object.getOwnPropertyNames(kohai.plugins).forEach( function (module) {
      kohai.plugins[module].stop();
  });
})