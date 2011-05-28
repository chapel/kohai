var Plugin = require('../plugin');


  var plugin = new Plugin('test');

  plugin.start(function(client) {
    var config = plugin.config;
    plugin.triggers['config'] = function (channel, name, message, operation, key) {
      // val will be incorrect if the value includes a space, get the real value from message
      var val = message.replace(RegExp('^.*' + key + '\\s+'), '')

      // get key
      if (operation == "get") {
        if (!key) { client.say(channel, "Get what?"); }
        else if (!key.match(/^auth.*/)) {
          var repr;
          client.conf(key, function(val) {
            if (val && typeof val.join === 'function') {
              repr = '[' + val.join(', ') + ']'
            }
            else {
              repr = JSON.stringify(val)
            }
            client.say(channel, key + ' is ' + repr)
          })
        }
        else { client.say(channel, "In-channel retrieval of authorization info not permitted."); }
      }

      // set key json
      else if (operation == "set") {
        try {
          client.conf(key, JSON.parse(val))
          client.say(channel, key + ' has been set to: ' + val + '.')
        }
        catch (e) {
          client.say(channel, 'Sorry, invalid JSON')
        }
      }

      // add list-key value
      else if (operation == "add") {
        client.conf(key, function(a) {
          if (!(a && typeof a.push === 'function')) {
            client.say(channel, 'Sorry, cannot add to ' + key)
          }
          else if (a.indexOf(val) !== -1) {
            client.say(channel, val + ' is already in ' + key)
          }
          else {
            a.push(val)
            client.conf(key, a)
            client.say(channel, val + ' was added to ' + key + '.')
          }
        })
      }

      // rm list-key value
      else if (operation == "rm") {
        client.conf(key, function(a) {
          if (!(a && typeof a.filter === 'function')) {
            client.say(channel, 'Sorry, cannot remove from ' + key)
            return
          }
          var b = a.filter(function(x) { return x !== val })
          if (b.length < a.length) {
            client.conf(key, b)
            client.say(channel, val + ' was removed from ' + key + '.')
          }
          else {
            client.say(channel, val + ' was not found in ' + key + '.')
          }
        })
      }

      // save
      else if (operation == "save") {
        client.saveConfig(function (err) {
          if (err) {
            err.message = "Error saving config.json to disk."
            client.say(channel, err.message)
            throw err
          }
          client.say(channel, 'Config saved.')
        })
      }

      else {
        client.say(channel, 'Sorry, ' + name + ', invalid operation for config.')
      }
    }
  });

