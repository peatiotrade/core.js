(function() {
    'use strict';

    angular.module('waves.core.services', ['waves.core', 'restangular'])
        .config(function () {
            if (!String.prototype.startsWith) {
                Object.defineProperty(String.prototype, 'startsWith', {
                    enumerable: false,
                    configurable: false,
                    writable: false,
                    value: function(searchString, position) {
                        position = position || 0;
                        return this.lastIndexOf(searchString, position) === position;
                    }
                });
            }
        })
        .run(['Restangular', 'constants.core', function(rest, constants) {
            rest.setBaseUrl(constants.NODE_ADDRESS);
        }]);
})();
