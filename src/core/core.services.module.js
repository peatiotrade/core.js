(function() {
    'use strict';

    angular.module('waves.core.services', ['waves.core', 'restangular'])
        .run(['Restangular', 'constants.core', function(rest, constants) {
            rest.setBaseUrl(constants.NODE_ADDRESS);
        }]);
})();
