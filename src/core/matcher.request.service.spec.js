describe('Matcher.Request.Service', function() {
    var requestService, cryptoService;
    var sender = {
        publicKey: 'FJuErRxhV9JaFUwcYLabFK5ENvDRfyJbRz8FeVfYpBLn',
        privateKey: '9dXhQYWZ5468TRhksJqpGT6nUySENxXi9nsCZH9AefD1'
    };
    var asset = new Currency({
        id: '8Nu3gdirpraz8ghmDHscTnoAbmCTLPxLhMeVzG4UxSQY',
        displayName: 'DEXt',
        precision: 2
    });
    var matcherKey = '4oP8SPd7LiUo8xsokSTiyZjwg4rojdyXqWEq7NTwWsSU';

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
        var price = Money.fromTokens(1, Currency.WAV);
        var amount = Money.fromTokens(10, asset);
        var fee = Money.fromTokens(0.01, Currency.WAV);
        var order = {
            spendAssetId: asset.id,
            receiveAssetId: Currency.WAV.id,
            price: price,
            amount: amount,
            time: 1487172369858,
            expiration: 1489764369858,
            fee: fee,
            matcherKey: matcherKey
        };

        var request = requestService.buildCreateOrderRequest(order, sender);

        expect(request.price).toEqual(100000000);
        expect(request.amount).toEqual(1000);
        expect(request.matcherFee).toEqual(1000000);
        expect(request.senderPublicKey).toEqual(sender.publicKey);
        expect(request.matcherPublicKey).toEqual(matcherKey);
        expect(request.signature)
            .toEqual('62SxgoTfPYR3gRRpDmrV4k3EPyy2rRe48ub4iHRng1jkZe2pxuhLnhD4vabgM738yq1Wo4KogVhZfYd7Zfmz1yEn');
    });

    it('should successfully sign cancel order request', function () {
        var orderId = '8PwufMfkR4BMgzp8K7RMXMVDxbi5BTsacUtf4ADrdpsh';

        var request = requestService.buildCancelOrderRequest(orderId, sender);

        expect(request.orderId).toEqual(orderId);
        expect(request.sender).toEqual(sender.publicKey);
        expect(request.signature)
            .toEqual('3ZUHGpaw7Ahmx1GfmUd66tE7288wZJZHQ992ikiy3Q9auyPyW5ru8DdvUmMrS1TnYshvPGYzu3srGUnZfQjgGM9c');
    });

    it('should throw an error is orderId is not given', function () {
        expect(function () { requestService.buildCancelOrderRequest(undefined, sender); }).toThrowError(/orderId/);
    });

    it('should throw an error if sender is not given', function () {
        expect(function () { requestService.buildCancelOrderRequest('some order id'); }).toThrowError(/Sender/);
    });
});
