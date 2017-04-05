(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('apiService', ['Restangular', function (rest) {
            var blocksApi = rest.all('blocks');

            this.blocks = {
                height: function() {
                    return blocksApi.get('height');
                },
                last: function() {
                    return blocksApi.get('last');
                },
                list: function (startHeight, endHeight) {
                    return blocksApi.one('seq', startHeight).all(endHeight).getList();
                }
            };

            var addressApi = rest.all('addresses');
            var consensusApi = rest.all('consensus');
            this.address = {
                balance: function (address) {
                    return addressApi.one('balance', address).get();
                },
                effectiveBalance: function (address) {
                    return addressApi.one('effectiveBalance', address).get();
                },
                generatingBalance: function (address) {
                    return consensusApi.one('generatingbalance', address).get();
                }
            };

            var transactionApi = rest.all('transactions');
            this.transactions = {
                unconfirmed: function () {
                    return transactionApi.all('unconfirmed').getList();
                },
                list: function (address, max) {
                    max = max || 50;
                    return transactionApi.one('address', address).one('limit', max).getList();
                },
                info: function (transactionId) {
                    return transactionApi.one('info', transactionId).get();
                }
            };

            var wavesApi = rest.all('waves');
            this.broadcastPayment = function (signedPaymentTransaction) {
                return wavesApi.all('broadcast-signed-payment').post(signedPaymentTransaction);
            };

            var assetApi = rest.all('assets');
            var assetBroadcastApi = assetApi.all('broadcast');
            this.assets = {
                balance: function (address, assetId) {
                    var rest = assetApi.all('balance');
                    if (assetId)
                        return rest.all(address).get(assetId);
                    else
                        return rest.get(address);
                },
                issue: function (signedAssetIssueTransaction) {
                    return assetBroadcastApi.all('issue').post(signedAssetIssueTransaction);
                },
                reissue: function (signedAssetReissueTransaction) {
                    return assetBroadcastApi.all('reissue').post(signedAssetReissueTransaction);
                },
                transfer: function (signedAssetTransferTransaction) {
                    return assetBroadcastApi.all('transfer').post(signedAssetTransferTransaction);
                },
                massPay: function (signedTransactions) {
                    return assetBroadcastApi.all('batch-transfer').post(signedTransactions);
                }
            };
        }]);
})();
