(function () {
    'use strict';

    function AliasRequestService(txConstants, featureConstants, utilityService, cryptoService) {
        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);
            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildCreateAliasSignatureData (alias, senderPublicKey) {
            var typeByte = [txConstants.CREATE_ALIAS_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);

            var tempBytes = [].concat(
                [featureConstants.ALIAS_VERSION],
                [utilityService.getNetworkIdByte()],
                utilityService.stringToByteArrayWithSize(alias.alias)
            );

            var aliasBytes = utilityService.byteArrayWithSize(tempBytes);
            var feeBytes = utilityService.longToByteArray(alias.fee.toCoins());
            var timestampBytes = utilityService.longToByteArray(alias.time);

            return [].concat(typeByte, publicKeyBytes, aliasBytes, feeBytes, timestampBytes);
        }

        this.buildCreateAliasRequest = function (alias, sender) {
            utilityService.validateSender(sender);

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

    AliasRequestService.$inject = ['constants.transactions', 'constants.features', 'utilityService', 'cryptoService'];

    angular
        .module('waves.core.services')
        .service('aliasRequestService', AliasRequestService);
})();
