'use strict';

angular.module('nodeminerApp')
  .controller('CoinsCtrl', function ($scope, CoinsSvc, PoolsSvc, socket) {
    $scope.coin = {
      pools: []
    };
    $scope.coins = [];

    $scope.add = function (coin) {
      var _defaults = {
        "allowEdit": false,
        "showDetails": false
      };

      $scope.coins.push(_.merge(coin, _defaults));
      $scope.save($scope.coins);
    };

    $scope.addPool = function (coin, pool) {
      if (coin) {
        if (!coin.pools) coin.pools = [];

        coin.pools.push(pool);
      } else {
        $scope.coin.pools.push(pool);
      }
    };

    $scope.deletePool = function (coin, pool) {
      if (coin) {
        _.remove(coin.pools, pool);
      } else {
        _.remove($scope.coin.pools, pool);
      }
    };

    $scope.toggleCoinDetails = function (coin) {
      coin.showDetails = !coin.showDetails;
    };

    $scope.togglePoolDetails = function (pool) {
      pool.showDetails = !pool.showDetails;
    };

    $scope.allowEdit = function (coin) {
      coin.allowEdit = true;
      coin.showDetails = true;
    };

    $scope.disableEdit = function (coin) {
      coin.allowEdit = false;
    };

    $scope.saveEdit = function (coin) {
      $scope.disableEdit(coin);
      $scope.save($scope.coins);
    };

    $scope.save = function (coins) {
      CoinsSvc.save(coins);
    };

    $scope.delete = function (coin) {
      CoinsSvc.delete(coin);
    };

    $scope.$on('$destroy', function (event) {
      socket.removeAllListeners('init:coins');
    });

    $scope.$on('init:coins', function (coins) {
      $scope.coins = CoinsSvc.coins;
    });

    $scope.$on('init:pools', function (pools) {
      $scope.pools = PoolsSvc.pools;
    });

    $scope.$on('saved:coins', function () {
      $scope.coins = CoinsSvc.coins;
      toastr.success('Coin configuration saved!');

      // Reset our scope object
      $scope.coin = {
        pools: []
      };
    });

    if ($scope.coins.length == 0) $scope.coins = CoinsSvc.coins;
  });
