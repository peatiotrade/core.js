describe('LocalStorage.chrome.Service', function () {
    var chromeStorageService;

    beforeEach(module('waves.core.services'));

    beforeEach(inject(function (_chromeStorageService_) {
        chromeStorageService = _chromeStorageService_;
    }));

    beforeEach(function () {
        window.chrome = {
            storage: {
                sync: {
                    set: function() {},
                    get: function(key, cb) { cb({'WavesAccounts': 'value'}); }
                }
            }
        };
        spyOn(window.chrome.storage.sync, 'set').and.callThrough();
        spyOn(window.chrome.storage.sync, 'get').and.callThrough();
    });

    afterEach(function () {
        delete window.chrome;
    });

    it('should implement methods', function () {
        expect(chromeStorageService.saveState).toBeDefined();
        expect(chromeStorageService.loadState).toBeDefined();
    });

    it('should save state', function () {
        //when
        chromeStorageService.saveState('value');
        //then
        expect(window.chrome.storage.sync.set).toHaveBeenCalledWith({'WavesAccounts': 'value'}, jasmine.any(Function));
    });

    it('should get state', inject(function ($rootScope) {
        //when
        var response;
        chromeStorageService.loadState()
            .then(function (data) {
                response = data;
            });
        $rootScope.$digest();
        //then
        expect(window.chrome.storage.sync.get).toHaveBeenCalledWith('WavesAccounts', jasmine.any(Function));
        expect(response).toEqual('value');
    }));

});
