(function () {
    'use strict';

    var ALIAS_VERSION = 2;

    function WavesAliasRequestService (constants, utilityService, cryptoService) {
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

        function buildCreateAliasSignatureData (alias, senderPublicKey) {
            var typeByte = [constants.CREATE_ALIAS_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);

            var stringPartBytes = utilityService.stringToByteArrayWithSize(alias.alias);
            var tempBytes = [].concat([ALIAS_VERSION], [utilityService.getNetworkIdByte()], stringPartBytes);
            var aliasBytes = utilityService.byteArrayWithSize(tempBytes);
            var feeBytes = utilityService.longToByteArray(alias.fee.toCoins());
            var timestampBytes = utilityService.longToByteArray(alias.time);

            return [].concat(typeByte, publicKeyBytes, aliasBytes, feeBytes, timestampBytes);
        }

        this.buildCreateAliasRequest = function (alias, sender) {
            validateSender(sender);

            var currentTimeMillis = utilityService.getTime();
            alias.time = alias.time || currentTimeMillis;

            var signatureData = buildCreateAliasSignatureData(alias, sender.publicKey);
            var signature = buildSignature(signatureData, sender);

            return {
                alias: alias.alias,
                timestamp: alias.time,
                fee: alias.fee.toCoins(),
                senderPublicKey: sender.publicKey,
                signature: signature
            };
        };
    }

    WavesAliasRequestService.$inject = ['constants.transactions', 'utilityService', 'cryptoService'];

    angular
        .module('waves.core.services')
        .service('aliasRequestService', WavesAliasRequestService);
})();
