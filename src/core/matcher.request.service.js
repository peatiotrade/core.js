(function () {
    'use strict';

    var SELL_ORDER_TYPE = 'sell';

    function WavesMatcherRequestService (utilityService, cryptoService) {
        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);

            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildCreateOrderSignatureData (order, senderPublicKey) {
            var amountAssetIdBytes = utilityService.currencyToBytes(order.price.amountAsset.id);
            var priceAssetIdBytes = utilityService.currencyToBytes(order.price.priceAsset.id);
            var assetPairBytes = [].concat(amountAssetIdBytes, priceAssetIdBytes);

            var isSell = order.orderType === SELL_ORDER_TYPE;
            var orderTypeBytes = utilityService.booleanToBytes(isSell);

            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var matcherKeyBytes = utilityService.base58StringToByteArray(order.matcherKey);
            var priceBytes = utilityService.longToByteArray(order.price.toBackendPrice());
            var amountBytes = utilityService.longToByteArray(order.amount.toCoins());
            var timestampBytes = utilityService.longToByteArray(order.time);
            var expirationBytes = utilityService.longToByteArray(order.expiration);
            var feeBytes = utilityService.longToByteArray(order.fee.toCoins());

            return [].concat(publicKeyBytes, matcherKeyBytes, assetPairBytes, orderTypeBytes,
                priceBytes, amountBytes, timestampBytes, expirationBytes, feeBytes);
        }

        this.buildCreateOrderRequest = function (order, sender) {
            utilityService.validateSender(sender);

            var currentTimeMillis = utilityService.getTime();
            order.time = order.time || currentTimeMillis;

            var date = new Date(currentTimeMillis);
            order.expiration = order.expiration || date.setDate(date.getDate() + 20);

            var signatureData = buildCreateOrderSignatureData(order, sender.publicKey);
            var signature = buildSignature(signatureData, sender);

            return {
                orderType: order.orderType,
                assetPair: {
                    amountAsset: order.price.amountAsset.id,
                    priceAsset: order.price.priceAsset.id
                },
                price: order.price.toBackendPrice(),
                amount: order.amount.toCoins(),
                timestamp: order.time,
                expiration: order.expiration,
                matcherFee: order.fee.toCoins(),
                matcherPublicKey: order.matcherKey,
                senderPublicKey: sender.publicKey,
                signature: signature
            };
        };

        function buildCancelOrderSignatureData (orderId, senderPublicKey) {
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var orderIdBytes = utilityService.base58StringToByteArray(orderId);

            return [].concat(publicKeyBytes, orderIdBytes);
        }

        this.buildCancelOrderRequest = function (orderId, sender) {
            utilityService.validateSender(sender);

            if (!orderId)
                throw new Error('orderId hasn\'t been set');

            var signatureData = buildCancelOrderSignatureData(orderId, sender.publicKey);
            var signature = buildSignature(signatureData, sender);

            return {
                sender: sender.publicKey,
                orderId: orderId,
                signature: signature
            };
        };
    }

    WavesMatcherRequestService.$inject = ['utilityService', 'cryptoService'];

    angular
        .module('waves.core.services')
        .service('matcherRequestService', WavesMatcherRequestService);
})();
