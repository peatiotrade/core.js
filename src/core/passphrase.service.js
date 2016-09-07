(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('passPhraseService', ['wordList', '$window', function (wordList, $window) {
            this.generate = function () {
                var crypto = $window.crypto || $window.msCrypto;
                var bits = 160;
                var wordCount = 2048;
                var random = new Uint32Array(bits / 32);
                var passPhrase = '';

                crypto.getRandomValues(random);

                var i = 0,
                    l = random.length,
                    n = wordCount,
                    words = [],
                    x, w1, w2, w3;

                for (; i < l; i++) {
                    x = random[i];
                    w1 = x % n;
                    w2 = (((x / n) >> 0) + w1) % n;
                    w3 = (((((x / n) >> 0) / n) >> 0) + w2) % n;

                    words.push(wordList[w1]);
                    words.push(wordList[w2]);
                    words.push(wordList[w3]);
                }

                passPhrase = words.join(' ');

                crypto.getRandomValues(random);

                return passPhrase;
            };
        }]);
})();
