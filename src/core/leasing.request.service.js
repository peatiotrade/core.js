(function () {
    'use strict';

    function LeasingRequestService(txConstants, featureConstants, utilityService, cryptoService) {
        function formRecipientBytes(recipient) {
            if (recipient.slice(0, 6) === 'alias:') {
                return [].concat(
                    [featureConstants.ALIAS_VERSION],
                    [utilityService.getNetworkIdByte()],
                    utilityService.stringToByteArrayWithSize(recipient.slice(8)) // Remove leading 'asset:W:'
                );
            } else {
                return utilityService.base58StringToByteArray(recipient);
            }
        }

        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);
            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildStartLeasingSignatureData (startLeasing, senderPublicKey) {
            var typeByte = [txConstants.START_LEASING_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var recipientBytes = formRecipientBytes(startLeasing.recipient);
            var amountBytes = utilityService.longToByteArray(startLeasing.amount.toCoins());
            var feeBytes = utilityService.longToByteArray(startLeasing.fee.toCoins());
            var timestampBytes = utilityService.longToByteArray(startLeasing.time);

            return [].concat(typeByte, publicKeyBytes, recipientBytes, amountBytes, feeBytes,  timestampBytes);
        }

        this.buildStartLeasingRequest = function (startLeasing, sender) {
            utilityService.validateSender(sender);

            var currentTimeMillis = utilityService.getTime();
            startLeasing.time = startLeasing.time || currentTimeMillis;
            startLeasing.recipient = utilityService.resolveAddressOrAlias(startLeasing.recipient);

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
            var typeByte = [txConstants.CANCEL_LEASING_TRANSACTION_TYPE];
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

    LeasingRequestService.$inject = ['constants.transactions', 'constants.features', 'utilityService', 'cryptoService'];

    angular
        .module('waves.core.services')
        .service('leasingRequestService', LeasingRequestService);
})();
