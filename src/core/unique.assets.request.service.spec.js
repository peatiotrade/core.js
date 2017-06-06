describe('Unique.Assets.Request.Service', function () {
    var requestService, cryptoService;
    var sender = {
        publicKey: 'FJuErRxhV9JaFUwcYLabFK5ENvDRfyJbRz8FeVfYpBLn',
        privateKey: '9dXhQYWZ5468TRhksJqpGT6nUySENxXi9nsCZH9AefD1'
    };

    // Initialization of the module before each test case
    beforeEach(module('waves.core.services'));

    // Injection of dependencies
    beforeEach(inject(function ($injector) {
        requestService = $injector.get('uniqueAssetsRequestService');
        cryptoService = $injector.get('cryptoService');

        // changing non-deterministic signatures with deterministic ones
        // to always have the same transaction signature
        spyOn(cryptoService, 'nonDeterministicSign').and.callFake(function (privateKeyBytes, signatureData) {
            return cryptoService.deterministicSign(privateKeyBytes, signatureData);
        });
    }));

    it('should successfully sign make asset name unique request', function () {
        var fee = Money.fromTokens(0.01, Currency.WAVES);
        var asset = {
            assetId: 'Fmg13HEHJHuZYbtJq8Da8wifJENq8uBxDuWoP9pVe2Qe',
            time: 1496757297265,
            fee: fee
        };

        var request = requestService.buildMakeAssetNameUniqueRequest(asset, sender);

        expect(request.assetId).toEqual(asset.assetId);
        expect(request.fee).toEqual(1000000);
        expect(request.senderPublicKey).toEqual(sender.publicKey);
        expect(request.signature)
            .toEqual('5RQE6qkJ24CEfkZLuy7suKeWitTzPdNHS3FQ4NPw7SHeCip6eRtErYorUnZB8TJRzJTKWvNZYKKeBPke2YGYporD');
    });

    it('should throw an error if sender is not given', function () {
        expect(function () { requestService.buildMakeAssetNameUniqueRequest({}); }).toThrowError(/Sender/);
    });
});
