'use strict'

var net = require('net'),
  _ = require('lodash'),
  defaults = {
    connected: false
  };

module.exports = {
  config: {},

  defaults: {
    miner: 'cgminer',
    host: '192.168.0.1',
    port: 4028,
    interval: 5000 // Update interval 5s
  },

  init: function (miner, callback, socket) {
    var self = this,
      callback = callback || {};

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    // Get initial config
    self.send('devdetails', '', function (err, data) {
      if (err) {
        return callback(err, null, miner);
      }

      callback(null, self.parseDevDetails(data), miner)
    });

    self.update(miner, callback);

    if (miner.intervalCount == 0) {
      miner.intervalCount++;
      setInterval(function () {
        if (!socket.disconnected) {
          self.update(miner, callback);
        }
      }, self.config.interval || self.defaults.interval)
    }
  },

  ping: function (miner, callback) {
    var self = this,
      callback = callback || {};

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('version', '', function (err, data) {
      if (err) {
        return callback(err, null, miner);
      }

      callback(null, data);
    });
  },

  update: function (miner, callback) {
    var self = this,
      callback = callback || {};

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('summary', '', function (err, data) {
      if (err) {
        return callback(err, null, miner);
      }

      callback(null, self.parseSummary(data), miner)
    });

    self.send('devs', '', function (err, data) {
      if (err) {
        return callback(err, null, miner);
      }

      callback(null, self.parseDevDetails(data), miner)
    });

    self.send('pools', '', function (err, data) {
      if (err) {
        return callback(err, null, miner);
      }

      callback(null, self.parsePools(data), miner)
    });
  },

  enableGpu: function (miner, device, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('gpuenable', device.ID, function (err, data) {
      if (err) {
        callback(err);
      }

      callback(null, data);
    });
  },

  disableGpu: function (miner, device, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('gpudisable', device.ID, function (err, data) {
      if (err) {
        callback(err);
      }

      callback(null, data);
    });
  },

  updateIntensity: function (miner, device, value, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('gpuintensity', device.ID + ',' + value, function (err, data) {
      if (err) {
        callback(err);
      }

      callback(null, data);
    });
  },

  updateGpuEngine: function (miner, device, value, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('gpuengine', device.ID + ',' + value, function (err, data) {
      if (err) {
        callback(err);
      }

      callback(null, data);
    });
  },

  updateMemoryClock: function (miner, device, value, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('gpumem', device.ID + ',' + value, function (err, data) {
      if (err) {
        callback(err);
      }

      callback(null, data);
    });
  },

  updateGpuVoltage: function (miner, device, value, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('gpuvddc', device.ID + ',' + value, function (err, data) {
      if (err) {
        callback(err);
      }

      callback(null, data);
    });
  },

  zeroMiner: function (miner, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('zero', 'all,true', function (err, data) {
      if (err) {
        callback(err);
      }

      callback(null, data);
    });
  },

  changePool: function (miner, pool, callback) {
    var self = this;

    self.config = _.extend({}, self.defaults, miner) || self.defaults;

    self.send('pools', '', function (err, data) {
      if (err) {
        callback(err);
      }

      if (data.POOLS && data.POOLS.length > 0) {
        var poolId = -1;

        data.POOLS.forEach(function (p) {
          if (p.URL == pool.url + ':' + pool.port) {
            poolId = p.POOL;

            self.send('switchpool', poolId, function(error, result) {
              if (error) {
                callback(error);
              }

              callback(null, result);
            });
          }
        });

        if (poolId == -1) {
          // Try add the pool to bf/c/sgminer
          self.send('addpool', pool.url + ':' + pool.port + ',' + pool.workerName + ',' + pool.workerPassword, function (error, result) {
            if (error) {
              callback(error);
            }

            if (result.STATUS && result.STATUS[0].STATUS == 'S') {
              self.changePool(miner, pool, callback);
            }
          });
        }
      }
    });
  },

  send: function (command, parameter, callback) {
    var data = '',
      self = this,
      callback = callback || {},
      socket;

    socket = net.connect({
      host: self.config.host || self.defaults.host,
      port: self.config.port || self.defaults.port
    }, function () {
      var json;

      socket.on('data', function (dataRes) {
        data += dataRes.toString();
      });

      socket.on('end', function () {
        socket.removeAllListeners();

        if (callback) {
          try {
            json = JSON.parse(data.replace('\x00', ''));
          } catch (e) {
            return callback(e);
          }

          callback(null, json);
        }
      });

      socket.on('error', function (err) {
        socket.removeAllListeners();
        console.log('Error occurred: ' + err);
      });

      socket.write(JSON.stringify({
        command: command,
        parameter: parameter
      }));
    });

    socket.on('error', function (err) {
      socket.removeAllListeners();
      callback(err);
      callback = null;
    });
  },

  parseDevDetails: function (response) {
    var data;

    if (response.DEVS && response.DEVS.length > 0) {
      data = _.extend({}, defaults, {
        devices: _.extend({}, response.DEVS)
      });
    }

    if (response.DEVDETAILS && response.DEVDETAILS.length > 0) {
      data = _.extend({}, defaults, {
        devices: _.extend({}, response.DEVDETAILS)
      });
    }

    return data;
  },

  parsePools: function (response) {
    var data;

    if (response.POOLS && response.POOLS.length > 0) {
      data = _.extend({}, defaults, response);
    }

    return data;
  },

  parseSummary: function (response) {
    var data;

    if (response.SUMMARY && response.SUMMARY.length > 0) {
      data = _.extend({}, defaults, response);
    }

    return data;
  }
};