(function () {
    'use strict';

    var SELL_ORDER_TYPE = 'sell';
    var BUY_ORDER_TYPE = 'buy';
    var PRICE_SCALE_FACTOR = 1e8;

    function WavesMatcherRequestService (utilityService, cryptoService) {
        function validateSender(sender) {
            if (!sender)
                throw new Error('Sender hasn\'t been set');

            if (!sender.publicKey)
                throw new Error('Sender account public key hasn\'t been set');

            if (!sender.privateKey)
                throw new Error('Sender account private key hasn\'t been set');
        }

        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);

            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildCreateOrderSignatureData (order, senderPublicKey) {
            var amountAssetIdBytes = utilityService.currencyToBytes(order.amount.currency.id);
            var priceAssetIdBytes = utilityService.currencyToBytes(order.price.currency.id);
            var assetPairBytes = [].concat(amountAssetIdBytes, priceAssetIdBytes);

            var isSell = order.orderType === SELL_ORDER_TYPE;
            var orderTypeBytes = utilityService.booleanToBytes(isSell);

            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var matcherKeyBytes = utilityService.base58StringToByteArray(order.matcherKey);
            var priceBytes = utilityService.longToByteArray(order.price.toCoins());
            var amountBytes = utilityService.longToByteArray(order.amount.toCoins());
            var timestampBytes = utilityService.longToByteArray(order.time);
            var expirationBytes = utilityService.longToByteArray(order.expiration);
            var feeBytes = utilityService.longToByteArray(order.fee.toCoins());

            return [].concat(publicKeyBytes, matcherKeyBytes, assetPairBytes, orderTypeBytes,
                priceBytes, amountBytes, timestampBytes, expirationBytes, feeBytes);
        }

        this.buildCreateOrderRequest = function (order, sender) {
            validateSender(sender);

            var currentTimeMillis = utilityService.getTime();
            order.time = order.time || currentTimeMillis;

            var date = new Date(currentTimeMillis);
            order.expiration = order.expiration || date.setDate(date.getDate() + 30);

            var matcherCurrency = _.clone(Currency.MATCHER_CURRENCY);
            matcherCurrency.id = order.price.currency.id;

            var clonedOrder = _.clone(order);
            clonedOrder.price = Money.fromTokens(order.price.toTokens(), matcherCurrency);

            var signatureData = buildCreateOrderSignatureData(clonedOrder, sender.publicKey);
            var signature = buildSignature(signatureData, sender);

            return {
                orderType: order.orderType,
                assetPair: {
                    amountAsset: order.amount.currency.id,
                    priceAsset: order.price.currency.id
                },
                price: clonedOrder.price.toCoins(),
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
            validateSender(sender);

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
