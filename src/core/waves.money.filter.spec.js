/**
 * @author Björn Wenzel
 */
(function () {
    'use strict';
    describe('Waves money filter tests', function () {
        describe('Format output from coins integer filter', function () {
            var wavesIntegerFilter;

            beforeEach(module('waves.core.filter'));
            beforeEach(inject(function(_wavesIntegerFilter_) {
                wavesIntegerFilter = _wavesIntegerFilter_;
            }));

            it('should return formatted money', function () {
                expect(wavesIntegerFilter(20000000000)).toEqual('200');
                expect(wavesIntegerFilter(20000000000, 'BTC')).toEqual('200');
            });
        });

        describe('Format output from coins fraction filter', function () {
            var wavesFractionFilter;

            beforeEach(module('waves.core.filter'));
            beforeEach(inject(function (_wavesFractionFilter_) {
                wavesFractionFilter = _wavesFractionFilter_;
            }));

            it('should return formatted fraction', function () {
                expect(wavesFractionFilter(20000000000)).toEqual('.00000000');
                expect(wavesFractionFilter(20000000111, 'BTC')).toEqual('.00000111');
            });
        });

        describe('Format output from coins', function () {
            var wavesFilter;

            beforeEach(module('waves.core.filter'));
            beforeEach(inject(function (_wavesFilter_) {
                wavesFilter = _wavesFilter_;
            }));

            it('should return formatted fraction', function () {
                expect(wavesFilter(20000000000)).toEqual('200.00000000');
                expect(wavesFilter(20000000111, 'BTC')).toEqual('200.00000111');
            });
        });

        describe('Format output to currency type', function () {
            var wavesDisplayNameFilter;

            beforeEach(module('waves.core.filter'));
            beforeEach(inject(function (_wavesDisplayNameFilter_) {
                wavesDisplayNameFilter = _wavesDisplayNameFilter_;
            }));

            it('should return currency', function () {
                expect(wavesDisplayNameFilter('WAV')).toEqual('Waves');
                expect(wavesDisplayNameFilter('BTC')).toEqual('Bitcoin');
            });
        });
    });
})();
