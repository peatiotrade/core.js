(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('coinomatCurrencyMappingService', [function () {
            function unsupportedCurrency(currency) {
                throw new Error('Unsupported currency: ' + currency.displayName);
            }

            this.platformCurrencyCode = function (currency) {
                switch (currency) {
                    case Currency.BTC:
                        return 'WBTC';
                }

                unsupportedCurrency(currency);
            };

            this.gatewayCurrencyCode = function (currency) {
                switch (currency) {
                    case Currency.BTC:
                        return 'BTC';
                }

                unsupportedCurrency(currency);
            };
        }]);
})();
