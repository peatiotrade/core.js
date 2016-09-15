(function () {
    'use strict';

    angular
        .module('waves.core.services')
        .service('accountService', ['storageService', '$q', function (storageService, $q) {
            var stateCache;

            function getState() {
                if (angular.isUndefined(stateCache)) {
                    return storageService.loadState().then(function (state) {
                        state = state || {};
                        if (!state.accounts)
                            state.accounts = [];

                        stateCache = state;

                        return stateCache;
                    });
                }

                return $q.when(stateCache);
            }

            this.addAccount = function (accountInfo) {
                return getState()
                    .then(function (state) {
                        state.accounts.push(accountInfo);

                        return state;
                    })
                    .then(storageService.saveState);
            };

            this.removeAccount = function (account) {
                return getState()
                    .then(function (state) {
                        var index = _.findIndex(state.accounts, {
                            address: account.address
                        });
                        state.accounts.splice(index, 1);

                        return state;
                    })
                    .then(storageService.saveState);
            };

            this.getAccounts = function () {
                return getState()
                    .then(function (state) {
                        return state.accounts;
                    });
            };
        }]);
})();
