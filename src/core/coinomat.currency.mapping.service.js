(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('coinomatCurrencyMappingService', [function () {
            function unsupportedCurrency(currency) {
                throw new Error('Unsupported currency: ' + currency.displayName);
            }

            this.platformCurrencyCode = function (currency) {
                switch (currency.id) {
                    case Currency.BTC.id:
                        return 'WBTC';
                }

                unsupportedCurrency(currency);
            };

            this.gatewayCurrencyCode = function (currency) {
                switch (currency.id) {
                    case Currency.BTC.id:
                        return 'BTC';
                }

                unsupportedCurrency(currency);
            };
        }]);
})();
