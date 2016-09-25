/**
 * @author Björn Wenzel
 */
(function () {
    'use strict';
    describe('address filter tests', function () {
        var addressFilter;
        var rawAddress = '2n2MhfqjsXnjffZi8DcyziZikt7KRFufuMj';
        var displayAddress = '1W2n2MhfqjsXnjffZi8DcyziZikt7KRFufuMj';

        beforeEach(module('waves.core'));
        beforeEach(inject(function (_addressFilter_) {
            addressFilter = _addressFilter_;
        }));

        it('should return formatted address', function () {
            expect(addressFilter(rawAddress)).toEqual(displayAddress);
        });

    });
})();
