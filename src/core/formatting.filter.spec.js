/**
 * @author Björn Wenzel
 */
(function () {
    'use strict';
    describe('Formatting filter test', function () {
        var formattingFilter, $window;

        beforeEach(module('waves.core.services'));
        beforeEach(module('waves.core.filter'));
        beforeEach(inject(function (_formattingFilter_, _$window_) {
            formattingFilter = _formattingFilter_;
            $window = _$window_;
        }));

        var offsetSummer = new Date(1474634465425).getTimezoneOffset() * 60 * 1000;
        var offsetWinter = new Date(1262311350000).getTimezoneOffset() * 60 * 1000;

        it('should parse timestamp and format date', function () {
            $window.navigator.userLanguage = 'de-DE';

            expect(formattingFilter(1474634465425 + offsetSummer)).toEqual('23.09.2016 12:41:05');
        });

        it('should handle timestamp and return formatted date only', function () {
            $window.navigator.userLanguage = 'de-DE';

            expect(formattingFilter(1474634465425 + offsetSummer, true)).toEqual('23.09.2016');
        });

        it('should handle date and return formatted date only', function () {
            $window.navigator.userLanguage = 'de-DE';

            var time = new Date(1474634465425 + offsetSummer);
            expect(formattingFilter(time, true)).toEqual('23.09.2016');
        });

        it('should handle date and return formatted time only', function () {
            $window.navigator.userLanguage = 'de-DE';

            var time = new Date(1262307750000 + offsetWinter);
            expect(formattingFilter(time, false)).toEqual('01.01.2010 1:02:30');
        });
    });
})();
