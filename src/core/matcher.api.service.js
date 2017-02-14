(function () {
    'use strict';

    var WAVES_ASSET_ID = 'WAVES';

    function Pair (id, name) {
        return {
            id: denormalizeId(id),
            name: name
        };
    }

    function denormalizeId(id) {
        return id === WAVES_ASSET_ID ? '' : id;
    }

    function normalizeId(id) {
        return id ? id : WAVES_ASSET_ID;
    }

    function WavesMatcherApiService (rest) {
        var apiRoot = rest.all('matcher');
        var orderBookRoot = apiRoot.all('orderbook');

        this.loadMatcherKey = function () {
            return apiRoot.get('');
        };

        this.loadOrderBook = function (firstAssetId, secondAssetId) {
            return orderBookRoot.all(normalizeId(firstAssetId)).get(normalizeId(secondAssetId))
                .then(function (response) {
                    response.pair.asset1 = denormalizeId(response.pair.asset1);
                    response.pair.asset2 = denormalizeId(response.pair.asset2);

                    return response;
                });
        };

        this.loadAllMarkets = function () {
            return orderBookRoot.get('').then(function (response) {
                var pairs = [];
                _.forEach(response.markets, function (market) {
                    var id = normalizeId(market.asset1Id) + '/' + normalizeId(market.asset2Id);
                    var pair = {
                        id: id,
                        first: new Pair(market.asset1Id, market.asset1Name),
                        second: new Pair(market.asset2Id, market.asset2Name),
                        created: market.created
                    };
                    pairs.push(pair);
                });

                return pairs;
            });
        };
    }

    WavesMatcherApiService.$inject = ['MatcherRestangular'];

    angular
        .module('waves.core.services')
        .service('matcherApiService', WavesMatcherApiService);
})();
