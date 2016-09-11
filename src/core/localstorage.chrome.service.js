(function() {
    'use strict';

    angular
        .module('waves.core.services')
        .service('chromeStorageService', ['$q', function($q) {
            var $key = 'WavesAccounts';

            this.saveState = function(state) {
                var deferred = $q.defer();
                var json = {};
                json[$key] = state;

                chrome.storage.sync.set(json, function() {
                    deferred.resolve();
                });

                return deferred.promise;
            };

            this.loadState = function() {
                var deferred = $q.defer();

                chrome.storage.sync.get($key, function(data) {
                    deferred.resolve(data[$key]);
                });

                return deferred.promise;
            };
        }]);
})();
