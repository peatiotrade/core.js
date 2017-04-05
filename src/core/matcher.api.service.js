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

        this.createOrder = function (signedOrderRequest) {
            return orderBookRoot.post(signedOrderRequest);
        };

        this.cancelOrder = function (firstAssetId, secondAssetId, signedCancelRequest) {
            return orderBookRoot
                .all(normalizeId(firstAssetId))
                .all(normalizeId(secondAssetId))
                .all('cancel')
                .post(signedCancelRequest);
        };

        this.orderStatus = function (firstAssetId, secondAssetId, orderId) {
            return orderBookRoot
                .all(normalizeId(firstAssetId))
                .all(normalizeId(secondAssetId))
                .get(orderId);
        };

        this.loadMatcherKey = function () {
            return apiRoot.get('');
        };

        this.loadOrderbook = function (firstAssetId, secondAssetId) {
            return orderBookRoot.all(normalizeId(firstAssetId)).get(normalizeId(secondAssetId))
                .then(function (response) {
                    response.pair.amountAsset = denormalizeId(response.pair.amountAsset);
                    response.pair.priceAsset = denormalizeId(response.pair.priceAsset);

                    return response;
                });
        };

        this.loadAllMarkets = function () {
            return orderBookRoot.get('').then(function (response) {
                var pairs = [];
                _.forEach(response.markets, function (market) {
                    var id = normalizeId(market.amountAsset) + '/' + normalizeId(market.priceAsset);
                    var pair = {
                        id: id,
                        first: new Pair(market.amountAsset, market.amountAssetName),
                        second: new Pair(market.priceAsset, market.priceAssetName),
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
