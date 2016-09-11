(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('accountService', ['storageService', function (storageService) {
            this.addAccount = function (accountInfo) {
                return storageService.loadState()
                    .then(function (state) {
                        state = state || {};
                        if (!state.accounts)
                            state.accounts = [];

                        state.accounts.push(accountInfo);
                        return storageService.saveState(state);
                    });
            };

            this.removeAccount = function (accountIndex) {
                return storageService.loadState()
                    .then(function (state) {
                        state.accounts.splice(accountIndex, 1);

                        return storageService.saveState(state);
                    });
            };

            this.getAccounts = function () {
                return storageService.loadState()
                    .then(function (state) {
                        state = state || {};
                        if (!state.accounts)
                            state.accounts = [];

                        return state.accounts;
                    });
            };
        }]);
})();
