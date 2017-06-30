(function () {
    'use strict';

    function UniqueAssetsRequestService (constants, utilityService, cryptoService,
                                         validateService) {

        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);
            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildMakeAssetUniqueSignatureData(networkByte, senderPublicKey, assetId, fee, timestamp) {
            var typeByte = [constants.MAKE_ASSET_NAME_UNIQUE_TRANSACTION_TYPE];

            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var assetIdBytes = utilityService.base58StringToByteArray(assetId);
            var feeBytes = utilityService.longToByteArray(fee);
            var timestampBytes = utilityService.longToByteArray(timestamp);

            return [].concat(typeByte, networkByte, publicKeyBytes, assetIdBytes, feeBytes, timestampBytes);
        }

        this.buildMakeAssetNameUniqueRequest = function (asset, sender) {
            validateService.validateSender(sender);

            var networkByte = utilityService.getNetworkIdByte();

            var assetId = asset.assetId;
            var fee = asset.fee.toCoins();
            var time = asset.time || utilityService.getTime();

            var signatureData = buildMakeAssetUniqueSignatureData(networkByte, sender.publicKey, assetId, fee, time);
            var signature = buildSignature(signatureData, sender);

            return {
                senderPublicKey: sender.publicKey,
                assetId: assetId,
                fee: fee,
                networkByte: networkByte,
                timestamp: time,
                signature: signature
            };
        };
    }

    UniqueAssetsRequestService.$inject = ['constants.transactions', 'utilityService', 'cryptoService',
                                          'validateService'];

    angular
        .module('waves.core.services')
        .service('uniqueAssetsRequestService', UniqueAssetsRequestService);
})();
