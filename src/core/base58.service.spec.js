(function () {
    'use strict';
    describe('base58 service tests', function () {
        var base58Service;

        beforeEach(module('waves.core.services'));

        beforeEach(inject(function (_base58Service_) {
            base58Service = _base58Service_;
        }));

        it('should validate base58 string positive', function () {
            expect(base58Service.isValid('abc')).toBeTruthy();
            expect(base58Service.isValid('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')).toBeTruthy();
        });

        it('should validate base58 string negative', function () {
            expect(base58Service.isValid('0')).toBeFalsy();
            expect(base58Service.isValid('l')).toBeFalsy();
            expect(base58Service.isValid('I')).toBeFalsy();
            expect(base58Service.isValid('O')).toBeFalsy();
            expect(base58Service.isValid(' ')).toBeFalsy();
        });

    });
})();
