(function () {
    'use strict';

    var WAVES_ASSET_ID = 'WAVES',
        WAVES_PRECISION = 8;

    function denormalizeId(id) {
        return id === WAVES_ASSET_ID ? '' : id;
    }

    function normalizeId(id) {
        return id ? id : WAVES_ASSET_ID;
    }

    function WavesMatcherApiService (rest, utilityService, cryptoService) {
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

        function buildLoadUserOrdersSignature(timestamp, sender) {
            utilityService.validateSender(sender);

            var publicKeyBytes = utilityService.base58StringToByteArray(sender.publicKey),
                timestampBytes = utilityService.longToByteArray(timestamp),
                signatureData = [].concat(publicKeyBytes, timestampBytes),

                privateKeyBytes = cryptoService.base58.decode(sender.privateKey);

            return cryptoService.nonDeterministicSign(privateKeyBytes, signatureData);
        }

        this.loadUserOrders = function (amountAsset, priceAsset, sender) {
            var timestamp = Date.now(),
                signature = buildLoadUserOrdersSignature(timestamp, sender);

            return orderBookRoot
                .all(normalizeId(amountAsset))
                .all(normalizeId(priceAsset))
                .all('publicKey')
                .get(sender.publicKey, {}, {
                    Timestamp: timestamp,
                    Signature: signature
                });
        };

        this.loadAllMarkets = function () {
            return orderBookRoot.get('').then(function (response) {
                var pairs = [];
                _.forEach(response.markets, function (market) {
                    var id = normalizeId(market.amountAsset) + '/' + normalizeId(market.priceAsset);
                    var pair = {
                        id: id,
                        amountAssetInfo: market.amountAssetInfo,
                        amountAsset: Currency.create({
                            id: denormalizeId(market.amountAsset),
                            displayName: market.amountAssetName,
                            precision: market.amountAssetInfo ? market.amountAssetInfo.decimals : WAVES_PRECISION
                        }),
                        priceAssetInfo: market.priceAssetInfo,
                        priceAsset: Currency.create({
                            id: denormalizeId(market.priceAsset),
                            displayName: market.priceAssetName,
                            precision: market.priceAssetInfo ? market.priceAssetInfo.decimals : WAVES_PRECISION
                        }),
                        created: market.created
                    };
                    pairs.push(pair);
                });

                return pairs;
            });
        };
    }

    WavesMatcherApiService.$inject = ['MatcherRestangular', 'utilityService', 'cryptoService'];

    angular
        .module('waves.core.services')
        .service('matcherApiService', WavesMatcherApiService);
})();
