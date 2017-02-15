(function () {
    'use strict';

    function WavesMatcherRequestService (utilityService, cryptoService) {
        function validateSender(sender) {
            if (angular.isUndefined(sender.publicKey))
                throw new Error('Sender account public key hasn\'t been set');

            if (angular.isUndefined(sender.privateKey))
                throw new Error('Sender account private key hasn\'t been set');
        }

        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);

            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildCreateOrderSignatureData (order, senderPublicKey) {
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var matcherKeyBytes = utilityService.base58StringToByteArray(order.matcherKey);
            var spendAssetIdBytes = utilityService.currencyToBytes(order.spendAssetId);
            var receiveAssetIdBytes = utilityService.currencyToBytes(order.receiveAssetId);
            var priceBytes = utilityService.longToByteArray(order.price.toCoins());
            var amountBytes = utilityService.longToByteArray(order.amount.toCoins());
            var timestampBytes = utilityService.longToByteArray(order.time);
            var expirationBytes = utilityService.longToByteArray(order.expiration);
            var feeBytes = utilityService.longToByteArray(order.fee.toCoins());

            return [].concat(publicKeyBytes, matcherKeyBytes, spendAssetIdBytes, receiveAssetIdBytes,
                priceBytes, amountBytes, timestampBytes, expirationBytes, feeBytes);
        }

        this.buildCreateOrderRequest = function (order, sender) {
            validateSender(sender);

            var currentTimeMillis = utilityService.getTime();
            order.time = order.time || currentTimeMillis;

            var date = new Date(currentTimeMillis);
            order.expiration = order.expiration || date.setDate(date.getDate() + 30);

            var signatureData = buildCreateOrderSignatureData(order, sender.publicKey);
            var signature = buildSignature(signatureData, sender);

            return {
                spendAssetId: order.spendAssetId,
                receiveAssetId: order.receiveAssetId,
                price: order.price.toCoins(),
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
