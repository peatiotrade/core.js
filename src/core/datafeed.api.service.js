(function () {
    'use strict';

    var MINUTE = 60 * 1000,
        DEFAULT_FRAME = 30,
        DEFAULT_LIMIT = 50;

    function serializeId(id) {
        return id === '' ? 'WAVES' : id;
    }

    function WavesDatafeedApiService (rest) {
        var apiRoot = rest.all('api');

        this.getSymbols = function () {
            return apiRoot.get('symbols');
        };

        this.getCandles = function (pair, from, to, frame) {
            frame = frame || DEFAULT_FRAME;
            to = to || Date.now();
            from = from || to - 50 * frame * MINUTE;

            return apiRoot
                .all('candles')
                .all(serializeId(pair.amountAsset.id))
                .all(serializeId(pair.priceAsset.id))
                .all(frame)
                .all(from)
                .get(to);
        };

        this.getTrades = function (pair, limit) {
            limit = limit || DEFAULT_LIMIT;

            return apiRoot
                .all('trades')
                .all(serializeId(pair.amountAsset.id))
                .all(serializeId(pair.priceAsset.id))
                .get(limit);
        };

        this.getTradesByAddress = function (pair, address, limit) {
            limit = limit || DEFAULT_LIMIT;

            return apiRoot
                .all('trades')
                .all(serializeId(pair.amountAsset.id))
                .all(serializeId(pair.priceAsset.id))
                .all(address)
                .get(limit);
        };
    }

    WavesDatafeedApiService.$inject = ['DatafeedRestangular'];

    angular
        .module('waves.core.services')
        .service('datafeedApiService', WavesDatafeedApiService);
})();
