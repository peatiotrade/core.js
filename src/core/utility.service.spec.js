describe('Utility.Service', function() {
    var utilityService;

    // Initialization of the module before each test case
    beforeEach(module('waves.core.services'));

    // Injection of dependencies
    beforeEach(inject(function($injector) {
        utilityService = $injector.get('utilityService');
    }));

    it('should correctly check whether a string ends with whitespace', function () {
        expect(utilityService.endsWithWhitespace('    ababab')).toBe(false);
        expect(utilityService.endsWithWhitespace('fasdfkjh sdfasdf   a')).toBe(false);
        expect(utilityService.endsWithWhitespace('fasdfds sdfasdf a ')).toBe(true);
        expect(utilityService.endsWithWhitespace(' fbsdfb sdfg fsd a\t')).toBe(true);
    });

    it('should correctly convert short values to byte array', function () {
        expect(utilityService.shortToByteArray(14851)).toEqual([58, 3]);
    });
});
