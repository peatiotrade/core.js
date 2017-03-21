(function () {
    'use strict';

    function WavesCoinomatFiatService (rest) {
        var CRYPTO_CURRENCY = 'BTC';
        var apiRoot = rest.all('api').all('v2').all('indacoin');

        this.getLimits = function (address, fiat) {
            return apiRoot.get('limits.php', {
                address: address,
                fiat: fiat
            });
        };

        this.getRate = function (address, fiatAmount, fiatCurrency) {
            return apiRoot.get('rate.php', {
                address: address,
                fiat: fiatCurrency,
                amount: fiatAmount,
                crypto: CRYPTO_CURRENCY
            });
        };

        this.getMerchantUrl = function (address, fiatAmount, fiatCurrency) {
            return apiRoot.all('buy.php').getRequestedUrl() +
                '?address=' + address +
                '&fiat=' + fiatCurrency +
                '&amount=' + fiatAmount +
                '&crypto=' + CRYPTO_CURRENCY;
        };
    }

    WavesCoinomatFiatService.$inject = ['CoinomatRestangular'];

    angular
        .module('waves.core.services')
        .service('coinomatFiatService', WavesCoinomatFiatService);
})();
