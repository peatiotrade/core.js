(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('base58Service', function () {
            var BASE58_REGEX = new RegExp('^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{0,}$');

            this.isValid = function (input) {
                return BASE58_REGEX.test(input);
            };

        });

})();
