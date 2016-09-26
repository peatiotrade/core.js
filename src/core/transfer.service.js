(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('transferService', ['cryptoService', 'utilityService', function (cryptoService, utilityService) {
            function signatureData (senderPublicKey, recipientAddress, amount, fee, wavesTime) {
                var typeBytes = converters.int32ToBytes(2).reverse();
                var timestampBytes = utilityService.longToByteArray(wavesTime);
                var amountBytes = utilityService.longToByteArray(amount);
                var feeBytes = utilityService.longToByteArray(fee);
                var decodePublicKey = cryptoService.base58.decode(senderPublicKey);
                var decodeRecipient = cryptoService.base58.decode(recipientAddress);

                var publicKey = [];
                var recipient = [];

                for (var i = 0; i < decodePublicKey.length; ++i) {
                    publicKey.push(decodePublicKey[i] & 0xff);
                }

                for (var j = 0; j < decodeRecipient.length; ++j) {
                    recipient.push(decodeRecipient[j] & 0xff);
                }

                var signatureBytes = [];

                return signatureBytes.concat(typeBytes, timestampBytes, publicKey, recipient, amountBytes, feeBytes);
            }

            function validatePayment(payment) {
                if (angular.isUndefined(payment.amount))
                    throw new Error('Payment amount hasn\'t been set');

                if (angular.isUndefined(payment.fee))
                    throw new Error('Payment fee hasn\'t been set');

                if (angular.isUndefined(payment.recipient))
                    throw new Error('Payment recipient hasn\'t been set');
            }

            function validateSenderAccount(senderAccount) {
                if (angular.isUndefined(senderAccount.publicKey))
                    throw new Error('Sender account public key hasn\'t been set');

                if (angular.isUndefined(senderAccount.privateKey))
                    throw new Error('Sender account private key hasn\'t been set');

                if (angular.isUndefined(senderAccount.address))
                    throw new Error('Sender account address hasn\'t been set');
            }

            this.createTransaction = function (payment, senderAccount) {
                validatePayment(payment);
                validateSenderAccount(senderAccount);

                if (angular.isUndefined(payment.time))
                    payment.time = utilityService.getTime();

                var amount = payment.amount.toCoins();
                var fee = payment.fee.toCoins();
                var recipient = payment.recipient.getRawAddress();

                var signatureData = signatureData(senderAccount.publicKey, recipient, amount, fee, payment.time);

                var privateKeyBytes = cryptoService.base58.decode(senderAccount.privateKey);
                var signature = cryptoService.nonDeterministicSign(privateKeyBytes, signatureData);

                return {
                    recipient: recipient,
                    timestamp: payment.time,
                    signature: signature,
                    amount: amount,
                    senderPublicKey: senderAccount.publicKey,
                    sender: senderAccount.address.getRawAddress(),
                    fee: fee
                };
            };
        }]);
})();
