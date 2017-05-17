(function () {
    'use strict';

    var BASE58_REGEX = new RegExp('^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{0,}$');

    angular
        .module('waves.core.services')
        .service('utilityService', ['constants.network', 'cryptoService', function (constants, cryptoService) {
            var self = this;

            this.getNetworkIdByte = function () {
                return constants.NETWORK_CODE.charCodeAt(0) & 0xFF;
            };

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

            this.stringToByteArrayWithSize = function (string) {
                var bytes = converters.stringToByteArray(string);

                return self.byteArrayWithSize(bytes);
            };

            this.byteArrayWithSize = function (byteArray) {
                var result = self.shortToByteArray(byteArray.length);

                return result.concat(byteArray);
            };

            this.currencyToBytes = function (currencyId, mandatory) {
                if (mandatory) {
                    return self.base58StringToByteArray(currencyId);
                } else {
                    return currencyId ? [1].concat(self.base58StringToByteArray(currencyId)) : [0];
                }
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

            this.isValidBase58String = function (input) {
                return BASE58_REGEX.test(input);
            };

            this.validateSender = function (sender) {
                if (!sender) {
                    throw new Error('Sender hasn\'t been set');
                }

                if (!sender.publicKey) {
                    throw new Error('Sender account public key hasn\'t been set');
                }

                if (!sender.privateKey) {
                    throw new Error('Sender account private key hasn\'t been set');
                }
            };
        }]);
})();
