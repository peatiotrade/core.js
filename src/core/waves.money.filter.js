/**
 * @author Björn Wenzel
 */
(function () {
    'use strict';

    var getCurrency = function (currencyKey) {
        if (angular.isUndefined(currencyKey))
            currencyKey = 'WAV';

        if (angular.isUndefined(Currency[currencyKey]))
            throw new Error('CAN\'t find specified currency: ' + currencyKey);

        return Currency[currencyKey];
    };

    angular.module('waves.core.filter')
        .filter('wavesInteger', function () {
            return function (amount, currencyKey) {
                return Money.fromCoins(amount, getCurrency(currencyKey)).formatIntegerPart();
            };
        })
        .filter('wavesFraction', function () {
            return function (amount, currencyKey) {
                return Money.fromCoins(amount, getCurrency(currencyKey)).formatFractionPart();
            };
        })
        .filter('waves', function () {
            return function (amount, currencyKey) {
                return Money.fromCoins(amount, getCurrency(currencyKey)).formatAmount();
            };
        });
})();
