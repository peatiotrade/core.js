(function () {
    'use strict';

    var LANGUAGE = 'ru_RU';

    function ensureTunnelCreated (response) {
        if (!response.ok) {
            console.log(response);
            throw new Error('Failed to create tunnel: ' + response.error);
        }
    }

    function ensureTunnelObtained (response) {
        if (!response.ok) {
            console.log(response);
            throw new Error('Failed to get tunnel: ' + response.error);
        }
    }

    function WavesCoinomatService (rest, mappingService) {
        var apiRoot = rest.all('api').all('v1');
        var createTunnel = apiRoot.all('create_tunnel.php');
        var getTunnel = apiRoot.all('get_tunnel.php');

        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        function loadPaymentDetails(currencyCodeFrom, currencyCodeTo, recipientAddress) {
            return createTunnel.getList({
                currency_from: currencyCodeFrom,
                currency_to: currencyCodeTo,
                wallet_to: recipientAddress
            }).then(function (response) {
                ensureTunnelCreated(response);

                return {
                    id: response.tunnel_id,
                    k1: response.k1,
                    k2: response.k2
                };
            }).then(function (tunnel) {
                return getTunnel.getList({
                    xt_id: tunnel.id,
                    k1: tunnel.k1,
                    k2: tunnel.k2,
                    history: 0,
                    lang: LANGUAGE
                });
            }).then(function (response) {
                ensureTunnelObtained(response);

                // here only BTC wallet is returned
                // probably for other currencies more requisites are required
                return response.tunnel.wallet_from;
            });
        }
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

        this.getDepositDetails = function (currency, wavesRecipientAddress) {
            var gatewayCurrencyCode = mappingService.gatewayCurrencyCode(currency);
            var platformCurrencyCode = mappingService.platformCurrencyCode(currency);

            return loadPaymentDetails(gatewayCurrencyCode, platformCurrencyCode, wavesRecipientAddress);
        };

        this.getWithdrawAddress = function (currency, recipientAddress) {
            var gatewayCurrencyCode = mappingService.gatewayCurrencyCode(currency);
            var platformCurrencyCode = mappingService.platformCurrencyCode(currency);

            return loadPaymentDetails(platformCurrencyCode, gatewayCurrencyCode, recipientAddress);
        };

        this.getWithdrawRate = function (currency) {
            var gatewayCurrencyCode = mappingService.gatewayCurrencyCode(currency);
            var platformCurrencyCode = mappingService.platformCurrencyCode(currency);

            return apiRoot.get('get_xrate.php', {
                f: platformCurrencyCode,
                t: gatewayCurrencyCode,
                lang: LANGUAGE
            });
        };
    }

    WavesCoinomatService.$inject = ['CoinomatRestangular', 'coinomatCurrencyMappingService'];

    angular
        .module('waves.core.services')
        .service('coinomatService', WavesCoinomatService);
})();
