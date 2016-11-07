(function () {
    'use strict';
    angular.module('waves.core.directives')
        .directive('base58', function (base58Service) {
            return {
                require: 'ngModel',
                link: function (scope, elm, attrs, ctrl) {
                    ctrl.$validators.base58 = function (modelValue, viewValue) {
                        if (ctrl.$isEmpty(modelValue)) {
                            // consider empty models to be valid
                            return true;
                        }

                        if (base58Service.isValid(viewValue)) {
                            // it is valid
                            return true;
                        }

                        // it is invalid
                        return false;
                    };
                }
            };
        });
})();
