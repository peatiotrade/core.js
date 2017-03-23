(function () {
    'use strict';

    function WavesCoinomatFiatService (rest, currencyMappingService) {
        var apiRoot = rest.all('api').all('v2').all('indacoin');

        this.getLimits = function (address, fiat) {
            return apiRoot.get('limits.php', {
                address: address,
                fiat: fiat
            });
        };

        this.getRate = function (address, fiatAmount, fiatCurrency, cryptoCurrency) {
            return apiRoot.get('rate.php', {
                address: address,
                fiat: fiatCurrency,
                amount: fiatAmount,
                crypto: currencyMappingService.gatewayCurrencyCode(cryptoCurrency)
            });
        };

        this.getMerchantUrl = function (address, fiatAmount, fiatCurrency, cryptoCurrency) {
            return apiRoot.all('buy.php').getRequestedUrl() +
                '?address=' + address +
                '&fiat=' + fiatCurrency +
                '&amount=' + fiatAmount +
                '&crypto=' + currencyMappingService.gatewayCurrencyCode(cryptoCurrency);
        };
    }

    WavesCoinomatFiatService.$inject = ['CoinomatRestangular', 'coinomatCurrencyMappingService'];

    angular
        .module('waves.core.services')
        .service('coinomatFiatService', WavesCoinomatFiatService);
})();
