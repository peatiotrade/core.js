(function () {
    'use strict';

    function AssetService(txConstants, signService, utilityService, cryptoService) {
        function validateAsset(asset) {
            if (angular.isUndefined(asset.name)) {
                throw new Error('Asset name hasn\'t been set');
            }

            if (angular.isUndefined(asset.totalTokens)) {
                throw new Error('Total tokens amount hasn\'t been set');
            }

            if (angular.isUndefined(asset.decimalPlaces)) {
                throw new Error('Token decimal places amount hasn\'t been set');
            }

            if (asset.fee.currency !== Currency.WAVES) {
                throw new Error('Transaction fee must be nominated in Waves');
            }
        }

        function validateTransfer(transfer) {
            if (angular.isUndefined(transfer.recipient)) {
                throw new Error('Recipient account hasn\'t been set');
            }

            if (angular.isUndefined(transfer.fee)) {
                throw new Error('Transaction fee hasn\'t been set');
            }

            if (angular.isUndefined(transfer.amount)) {
                throw new Error('Transaction amount hasn\'t been set');
            }
        }

        function validateReissue(reissue) {
            if (reissue.totalTokens.currency === Currency.WAVES) {
                throw new Error('Reissuing Waves is not allowed.');
            }

            if (angular.isUndefined(reissue.totalTokens)) {
                throw new Error('Total tokens amount hasn\'t been set');
            }

            if (angular.isUndefined(reissue.fee)) {
                throw new Error('Transaction fee hasn\'t been set');
            }

            if (reissue.fee.currency !== Currency.WAVES) {
                throw new Error('Transaction fee must be nominated in Waves');
            }
        }

        function buildCreateAssetSignatureData (asset, tokensQuantity, senderPublicKey) {
            var typeByte = [txConstants.ASSET_ISSUE_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var assetNameBytes = utilityService.stringToByteArrayWithSize(asset.name);
            var assetDescriptionBytes = utilityService.stringToByteArrayWithSize(asset.description);
            var quantityBytes = utilityService.longToByteArray(tokensQuantity);
            var decimalPlacesBytes = [asset.decimalPlaces];
            var reissuableBytes = utilityService.booleanToBytes(asset.reissuable);
            var feeBytes = utilityService.longToByteArray(asset.fee.toCoins());
            var timestampBytes = utilityService.longToByteArray(asset.time);

            return [].concat(typeByte, publicKeyBytes, assetNameBytes, assetDescriptionBytes,
                quantityBytes, decimalPlacesBytes, reissuableBytes, feeBytes, timestampBytes);
        }

        this.createAssetIssueTransaction = function (asset, sender) {
            validateAsset(asset);
            utilityService.validateSender(sender);

            asset.time = asset.time || utilityService.getTime();
            asset.reissuable = angular.isDefined(asset.reissuable) ? asset.reissuable : false;
            asset.description = asset.description || '';

            var assetCurrency = Currency.create({
                displayName: asset.name,
                precision: asset.decimalPlaces
            });

            var tokens = new Money(asset.totalTokens, assetCurrency);
            var signatureData = buildCreateAssetSignatureData(asset, tokens.toCoins(), sender.publicKey);
            var signature = buildSignature(signatureData, sender);
            var id = buildId(signatureData);

            return {
                id: id,
                name: asset.name,
                description: asset.description,
                quantity: tokens.toCoins(),
                decimals: Number(asset.decimalPlaces),
                reissuable: asset.reissuable,
                timestamp: asset.time,
                fee: asset.fee.toCoins(),
                senderPublicKey: sender.publicKey,
                signature: signature
            };
        };

        function buildCreateAssetTransferSignatureData(transfer, senderPublicKey) {
            var typeByte = [txConstants.ASSET_TRANSFER_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var assetIdBytes = utilityService.currencyToBytes(transfer.amount.currency.id);

            var recipientBytes = signService.getRecipientBytes(transfer.recipient);

            var amountBytes = utilityService.longToByteArray(transfer.amount.toCoins());
            var feeBytes = utilityService.longToByteArray(transfer.fee.toCoins());
            var feeAssetBytes = utilityService.currencyToBytes(transfer.fee.currency.id);
            var timestampBytes = utilityService.longToByteArray(transfer.time);
            var attachmentBytes = utilityService.byteArrayWithSize(transfer.attachment);

            return [].concat(typeByte, publicKeyBytes, assetIdBytes, feeAssetBytes, timestampBytes,
                amountBytes, feeBytes, recipientBytes, attachmentBytes);
        }

        this.createAssetTransferTransaction = function (transfer, sender) {
            validateTransfer(transfer);
            utilityService.validateSender(sender);

            transfer.time = transfer.time || utilityService.getTime();
            transfer.attachment = transfer.attachment || [];
            transfer.recipient = utilityService.resolveAddressOrAlias(transfer.recipient);

            var signatureData = buildCreateAssetTransferSignatureData(transfer, sender.publicKey);
            var signature = buildSignature(signatureData, sender);
            var id = buildId(signatureData);

            return {
                id: id,
                recipient: transfer.recipient,
                timestamp: transfer.time,
                assetId: transfer.amount.currency.id,
                amount: transfer.amount.toCoins(),
                fee: transfer.fee.toCoins(),
                feeAssetId: transfer.fee.currency.id,
                senderPublicKey: sender.publicKey,
                signature: signature,
                attachment: cryptoService.base58.encode(transfer.attachment)
            };
        };

        function buildSignature(bytes, sender) {
            var privateKeyBytes = cryptoService.base58.decode(sender.privateKey);
            return cryptoService.nonDeterministicSign(privateKeyBytes, bytes);
        }

        function buildId(transactionBytes) {
            var hash = cryptoService.blake2b(new Uint8Array(transactionBytes));
            return cryptoService.base58.encode(hash);
        }

        function buildCreateAssetReissueSignatureData(reissue, senderPublicKey) {
            var typeByte = [txConstants.ASSET_REISSUE_TRANSACTION_TYPE];
            var publicKeyBytes = utilityService.base58StringToByteArray(senderPublicKey);
            var assetIdBytes = utilityService.currencyToBytes(reissue.totalTokens.currency.id, true);
            var quantityBytes = utilityService.longToByteArray(reissue.totalTokens.toCoins());
            var reissuableBytes = utilityService.booleanToBytes(reissue.reissuable);
            var feeBytes = utilityService.longToByteArray(reissue.fee.toCoins());
            var timestampBytes = utilityService.longToByteArray(reissue.time);

            return [].concat(typeByte, publicKeyBytes, assetIdBytes, quantityBytes, reissuableBytes,
                feeBytes, timestampBytes);
        }

        this.createAssetReissueTransaction = function (reissue, sender) {
            validateReissue(reissue);
            utilityService.validateSender(sender);

            reissue.reissuable = angular.isDefined(reissue.reissuable) ? reissue.reissuable : false;
            reissue.time = reissue.time || utilityService.getTime();

            var signatureData = buildCreateAssetReissueSignatureData(reissue, sender.publicKey);
            var signature = buildSignature(signatureData, sender);
            var id = buildId(signatureData);

            return {
                id: id,
                assetId: reissue.totalTokens.currency.id,
                quantity: reissue.totalTokens.toCoins(),
                reissuable: reissue.reissuable,
                timestamp: reissue.time,
                fee: reissue.fee.toCoins(),
                senderPublicKey: sender.publicKey,
                signature: signature
            };
        };
    }

    AssetService.$inject = ['constants.transactions', 'signService', 'utilityService', 'cryptoService'];

    angular
        .module('waves.core.services')
        .service('assetService', AssetService);
})();
