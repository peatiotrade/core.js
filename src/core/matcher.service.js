(function () {
    'use strict';

    function Pair (id, name) {
        return {
            id: id,
            name: name
        };
    }

    function normalizeId(id) {
        return id ? id : 'wav';
    }

    function WavesMatcherService (rest) {
        var apiRoot = rest.all('matcher');

        this.loadAllMarkets = function () {
            return apiRoot.all('markets').getList()
                .then(function (response) {
                    var pairs = [];
                    _.forEach(response.result, function (market) {
                        var id = normalizeId(market.firstAssetId) + '/' + normalizeId(market.secondAssetId);
                        var pair = {
                            id: id,
                            first: new Pair(market.firstAssetId, market.firstAssetName),
                            second: new Pair(market.secondAssetId, market.secondAssetName),
                            created: market.created
                        };
                        pairs.push(pair);
                    });

                    return pairs;
                })
        };
    }

    WavesMatcherService.$inject = ['MatcherRestangular'];

    angular
        .module('waves.core.services')
        .service('matcherService', WavesMatcherService);
})();
