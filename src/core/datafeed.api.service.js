(function () {
    'use strict';

    function WavesDatafeedApiService (rest) {
        var apiRoot = rest.all('api');

        this.getSymbols = function () {
            return apiRoot.get('symbols');
        };
    }

    WavesDatafeedApiService.$inject = ['DatafeedRestangular'];

    angular
        .module('waves.core.services')
        .service('datafeedApiService', WavesDatafeedApiService);
})();
