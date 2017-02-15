(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('utilityService', ['cryptoService', function (cryptoService) {
            var me = this;

            // long to big-endian bytes
            this.longToByteArray = function (value) {
                var bytes = new Array(7);
                for (var k = 7; k >= 0; k--) {
                    bytes[k] = value & (255);
                    value = value / 256;
                }

                return bytes;
            };

            // short to big-endian bytes
            this.shortToByteArray = function (value) {
                return converters.int16ToBytes(value, true);
            };

            this.base58StringToByteArray = function (base58String) {
                var decoded = cryptoService.base58.decode(base58String);
                var result = [];
                for (var i = 0; i < decoded.length; ++i) {
                    result.push(decoded[i] & 0xff);
                }

                return result;
            };

            this.currencyToBytes = function (currencyId, mandatory) {
                if (mandatory) {
                    if (!currencyId)
                        throw new Error('CurrencyId is mandatory');

                    return me.base58StringToByteArray(currencyId);
                }
                return currencyId ?
                    [1].concat(me.base58StringToByteArray(currencyId)) : [0];
            };

            this.booleanToBytes = function (flag) {
                return flag ? [1] : [0];
            };

            this.endsWithWhitespace = function (value) {
                return /\s+$/g.test(value);
            };

            this.getTime = function() {
                return Date.now();
            };

            this.isEnterKey = function (charCode) {
                return (charCode == 10 || charCode == 13);
            };
        }]);
})();
