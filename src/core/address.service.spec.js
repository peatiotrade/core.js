describe('Address.Service', function() {
    var addressService;
    var rawAddress = '2n2MhfqjsXnjffZi8DcyziZikt7KRFufuMj';
    var displayAddress = '1W2n2MhfqjsXnjffZi8DcyziZikt7KRFufuMj';

    // Initialization of the module before each test case
    beforeEach(module('waves.core.services'));

    // Injection of dependencies
    beforeEach(inject(function($injector) {
        addressService = $injector.get('addressService');
    }));

    it('should throw an error if the address is incorrect', function () {
        // address length is 36 (35 is expected)
        expect(addressService.validateAddress('2n2MhfqjsXnjffZi8DcyziZikt7KRFufuMjq')).toBe(false);
        // illegal symbols in address
        expect(addressService.validateAddress('YyHCqgBqhp3kX9asU$YUQKvxuAj13ytnN')).toBe(false);
        // address length is 34 (35 is expected)
        expect(addressService.validateAddress('2n2MhfqjsXnjffZi8DcyziZikt7KRFufuM')).toBe(false);
    });

    it('should remove address from a displayAddress', function() {
        expect(addressService.cleanupOptionalPrefix(displayAddress)).toEqual(rawAddress);
    });
});

