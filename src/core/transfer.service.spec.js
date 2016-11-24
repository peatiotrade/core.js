describe('Transfer.Service', function() {
    var transferService, cryptoService, addressService, constants = {
        INITIAL_NONCE: 0,
        ADDRESS_VERSION: 1
    };

    // Initialization of the module before each test case
    beforeEach(module('waves.core.services'));

    // overriding app.core module constants
    beforeEach(angular.mock.module('waves.core', function ($provide) {
        $provide.constant('constants.network', constants);
    }));

    // Injection of dependencies
    beforeEach(inject(function($injector) {
        transferService = $injector.get('transferService');
        cryptoService = $injector.get('cryptoService');
        addressService = $injector.get('addressService');

        // changing non-deterministic signatures with deterministic ones
        // to always have the same transaction signature
        spyOn(cryptoService, 'nonDeterministicSign').and.callFake(function (privateKeyBytes, signatureData) {
            return cryptoService.deterministicSign(privateKeyBytes, signatureData);
        });
    }));

    it('should create transaction validatable by backend for testnet', function () {
        var sender = {
            publicKey: 'FJuErRxhV9JaFUwcYLabFK5ENvDRfyJbRz8FeVfYpBLn',
            privateKey: '9dXhQYWZ5468TRhksJqpGT6nUySENxXi9nsCZH9AefD1',
            address: addressService.cleanupOptionalPrefix('1W3MtMoVbAHSitzohEvd6dJGR3kmJZHSePUkS')
        };

        var payment = {
            recipient: addressService.cleanupOptionalPrefix('1W3N9UuGeWuDt9NfWbC5oEACHyRoeEMApXAeq'),
            amount: new Money(1, Currency.WAV),
            fee: new Money(0.001, Currency.WAV),
            time: 1474976994320
        };

        var tx = transferService.createTransaction(payment, sender);
        var expected = '{"recipient":"3N9UuGeWuDt9NfWbC5oEACHyRoeEMApXAeq","timestamp":1474976994320,' +
            '"signature":"aRuj3amGbH78Bn2jwDRhTmpaQnNexk2p47iyMGLA2md5k5d3crMZceedNBTjeS42hnark5RTptwWEEWYRiVuNej",' +
            '"amount":100000000,"senderPublicKey":"FJuErRxhV9JaFUwcYLabFK5ENvDRfyJbRz8FeVfYpBLn",' +
            '"sender":"3MtMoVbAHSitzohEvd6dJGR3kmJZHSePUkS","fee":100000}';

        expect(JSON.stringify(tx)).toEqual(expected);
    });
});
