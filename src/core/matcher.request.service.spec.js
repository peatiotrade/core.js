describe('Matcher.Request.Service', function() {
    var requestService, cryptoService;
    var sender = {
        publicKey: 'FJuErRxhV9JaFUwcYLabFK5ENvDRfyJbRz8FeVfYpBLn',
        privateKey: '9dXhQYWZ5468TRhksJqpGT6nUySENxXi9nsCZH9AefD1'
    };
    var asset = new Currency({
        id: '246d8u9gBJqUXK1VhQBxPMLL4iiFLdc4iopFyAkqU5HN',
        displayName: 'Asset',
        precision: 2
    });

    // Initialization of the module before each test case
    beforeEach(module('waves.core.services'));

    // Injection of dependencies
    beforeEach(inject(function($injector) {
        requestService = $injector.get('matcherRequestService');
        cryptoService = $injector.get('cryptoService');

        // changing non-deterministic signatures with deterministic ones
        // to always have the same transaction signature
        spyOn(cryptoService, 'nonDeterministicSign').and.callFake(function (privateKeyBytes, signatureData) {
            return cryptoService.deterministicSign(privateKeyBytes, signatureData);
        });
    }));

    it('should successfully sign create order request', function () {
        /*{
            "spendAssetId":"8Nu3gdirpraz8ghmDHscTnoAbmCTLPxLhMeVzG4UxSQY",
            "price":100000000,
            "amount":1000,
            "timestamp":1487172369858,
            "expiration":1489764369858,
            "matcherFee":1000000,
            "matcherPublicKey":"4oP8SPd7LiUo8xsokSTiyZjwg4rojdyXqWEq7NTwWsSU",
            "senderPublicKey":"FJuErRxhV9JaFUwcYLabFK5ENvDRfyJbRz8FeVfYpBLn",
            "signature":"5xbxGy5wCJYZEBemL3B9fe7Vcb9hnzYTNmp4XUk9W36TSJmDusZFVq6SCiMF8HemdfthZTMqENPqDrCV5LnnepLa"
        }*/
    });
});
