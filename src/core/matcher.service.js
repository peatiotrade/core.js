(function () {
    'use strict';

    var WAVES_ASSET_ID = 'WAVES';

    function Pair (id, name) {
        return {
            id: id,
            name: name
        };
    }

    function normalizeId(id) {
        return id ? id : WAVES_ASSET_ID;
    }

    function WavesMatcherService (rest) {
        var apiRoot = rest.all('matcher');
        var orderBookRoot = rest.all('orderBook');

        this.loadOrderBook = function (firstAssetId, secondAssetId) {
            firstAssetId = firstAssetId | '';
            secondAssetId = secondAssetId | '';

            return orderBookRoot.get(normalizeId(firstAssetId), normalizeId(secondAssetId));
        };

        this.loadAllMarkets = function () {
            return apiRoot.get('orderbook').then(function (response) {
                var pairs = [];
                _.forEach(response.markets, function (market) {
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
