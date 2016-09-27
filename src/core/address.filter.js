/**
 * @author Björn Wenzel
 */
(function () {
    'use strict';
    angular.module('waves.core.filter')
        .filter('address', ['addressService', function (addressService) {
            return function(rawAddress) {
                return addressService.fromRawAddress(rawAddress).getDisplayAddress();
            };
        }]);
})();
