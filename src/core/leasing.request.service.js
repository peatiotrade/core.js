(function () {
    'use strict';

    function WavesLeasingRequestService (constants, utilityService, cryptoService) {
        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);

            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildStartLeasingSignatureData (startLeasing, senderPublicKey) {
            var typeByte = [constants.START_LEASING_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var recipientBytes = utilityService.base58StringToByteArray(startLeasing.recipient);
            var amountBytes = utilityService.longToByteArray(startLeasing.amount.toCoins());
            var feeBytes = utilityService.longToByteArray(startLeasing.fee.toCoins());
            var timestampBytes = utilityService.longToByteArray(startLeasing.time);

            return [].concat(typeByte, publicKeyBytes, recipientBytes, amountBytes, feeBytes,  timestampBytes);
        }

        this.buildStartLeasingRequest = function (startLeasing, sender) {
            utilityService.validateSender(sender);

            var currentTimeMillis = utilityService.getTime();
            startLeasing.time = startLeasing.time || currentTimeMillis;

            var signatureData = buildStartLeasingSignatureData(startLeasing, sender.publicKey);
            var signature = buildSignature(signatureData, sender);

            return {
                recipient: startLeasing.recipient,
                amount: startLeasing.amount.toCoins(),
                timestamp: startLeasing.time,
                fee: startLeasing.fee.toCoins(),
                senderPublicKey: sender.publicKey,
                signature: signature
            };
        };

        function buildCancelLeasingSignatureData (cancelLeasing, senderPublicKey) {
            var typeByte = [constants.CANCEL_LEASING_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var transactionIdBytes = utilityService.base58StringToByteArray(cancelLeasing.startLeasingTransactionId);
            var feeBytes = utilityService.longToByteArray(cancelLeasing.fee.toCoins());
            var timestampBytes = utilityService.longToByteArray(cancelLeasing.time);

            return [].concat(typeByte, publicKeyBytes, feeBytes, timestampBytes, transactionIdBytes);
        }

        this.buildCancelLeasingRequest = function (cancelLeasing, sender) {
            utilityService.validateSender(sender);

            var currentTimeMillis = utilityService.getTime();
            cancelLeasing.time = cancelLeasing.time || currentTimeMillis;

            var signatureData = buildCancelLeasingSignatureData(cancelLeasing, sender.publicKey);
            var signature = buildSignature(signatureData, sender);

            return {
                txId: cancelLeasing.startLeasingTransactionId,
                timestamp: cancelLeasing.time,
                fee: cancelLeasing.fee.toCoins(),
                senderPublicKey: sender.publicKey,
                signature: signature
            };
        };
    }

    WavesLeasingRequestService.$inject = ['constants.transactions', 'utilityService', 'cryptoService'];

    angular
        .module('waves.core.services')
        .service('leasingRequestService', WavesLeasingRequestService);
})();
