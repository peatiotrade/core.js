(function () {
    'use strict';

    function Pair (id, name) {
        return {
            id: id,
            name: name
        };
    }

    function normalizeId(id) {
        return id ? id : Currency.WAV.displayName.toLowerCase();
    }

    function WavesMatcherService (rest) {
        var apiRoot = rest.all('matcher');

        this.loadOrderBook = function (firstAssetId, secondAssetId) {
            firstAssetId = firstAssetId | '';
            secondAssetId = secondAssetId | '';

            return apiRoot.get('orderBook', {
                asset1: firstAssetId,
                asset2: secondAssetId
            });
        };

        this.loadAllMarkets = function () {
            return apiRoot.get('markets').then(function (response) {
                var pairs = [];
                _.forEach(response.result, function (market) {
                    var id = normalizeId(market.firstAssetId) + '/' + normalizeId(market.secondAssetId);
                    var pair = {
                        id: id,
                        first: new Pair(market.firstAssetId, market.firstAssetName),
                        second: new Pair(market.secondAssetId, market.secondAssetName),
                        created: market.created
                    };
                    pairs.push(pair);
                });

                return pairs;
            });
        };
    }

    WavesMatcherService.$inject = ['MatcherRestangular'];

    angular
        .module('waves.core.services')
        .service('matcherService', WavesMatcherService);
})();
