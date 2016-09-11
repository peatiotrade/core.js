describe('LocalStorage.Html5.Service', function() {
    var mockState, storageService;

    // Initialization of a mock storage before each test case
    beforeEach(function() {
        mockState = {
            accounts: [
                {
                    name: 'TestAccount1',
                    address: 'XYZ'
                },
                {
                    name: 'TestAccount2',
                    address: 'ZYX'
                }]
        };
    });

    beforeEach(function () {
        spyOn(window.localStorage, 'setItem');
        spyOn(window.localStorage, 'removeItem');
    });

    // Initialization of the module before each test case
    beforeEach(module('waves.core.services'));

    // Injection of dependencies
    beforeEach(inject(function($injector) {
        storageService = $injector.get('html5StorageService');
    }));

    it('should implement methods', function () {
        expect(storageService.saveState).toBeDefined();
        expect(storageService.loadState).toBeDefined();
    });

    it('should save to localStore', function () {
        //when
        storageService.saveState({key: 'value', $$test: 'value'});
        //then
        expect(window.localStorage.setItem).toHaveBeenCalledWith('Wavesdevel', JSON.stringify({key: 'value'}));
    });

    it('should load from localStore', inject(function ($rootScope) {
        //init
        spyOn(window.localStorage, 'getItem').and.returnValue(JSON.stringify(mockState));
        //when
        var response;
        storageService.loadState()
            .then(function (data) {
                response = data;
            });
        $rootScope.$digest();
        //then
        expect(response).toEqual(mockState);
        expect(window.localStorage.getItem).toHaveBeenCalledWith('Wavesdevel');
    }));

    it('should load empty from localStore', inject(function ($rootScope) {
        //init
        spyOn(window.localStorage, 'getItem').and.returnValue(undefined);
        //when
        var response;
        storageService.loadState()
            .then(function (data) {
                response = data;
            });
        $rootScope.$digest();
        //then
        expect(response).toBeUndefined();
    }));

    it('should clear localstore', function () {
        //when
        storageService.clear();
        //then
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('Wavesdevel');
    });

});
