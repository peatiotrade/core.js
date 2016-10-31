(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('addressService', ['constants.address', function (constants) {
            this.cleanupOptionalPrefix = function(displayAddress) {
                var address = displayAddress;
                if (address.length > constants.RAW_ADDRESS_LENGTH || address.startsWith(constants.ADDRESS_PREFIX))
                    address = address.substr(constants.ADDRESS_PREFIX.length,
                        address.length - constants.ADDRESS_PREFIX.length);

                return address;
            };

            this.validateAddress = function(address) {
                var cleanAddress = this.cleanupOptionalPrefix(address);

                return constants.MAINNET_ADDRESS_REGEXP.test(cleanAddress);
            };
        }]);
})();
