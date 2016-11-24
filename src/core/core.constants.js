(function() {
    'use strict';

    angular
        .module('waves.core.constants', [])
        .constant('constants.network', {
            NETWORK_NAME: 'devel',
            ADDRESS_VERSION: 1,
            NETWORK_CODE: 'T',
            INITIAL_NONCE: 0
        });

    angular
        .module('waves.core.constants')
        .constant('constants.address', {
            RAW_ADDRESS_LENGTH : 35,
            ADDRESS_PREFIX: '1W',
            MAINNET_ADDRESS_REGEXP: /^[a-zA-Z0-9]{35}$/
        });

    angular
        .module('waves.core.constants')
        .constant('constants.ui', {
            MINIMUM_PAYMENT_AMOUNT : 1e-8,
            MINIMUM_TRANSACTION_FEE : 0.001,
            AMOUNT_DECIMAL_PLACES : 8,
            JAVA_MAX_LONG: 9223372036854775807
        });

    angular
        .module('waves.core.constants')
        .constant('constants.transactions', {
            PAYMENT_TRANSACTION_TYPE : 2,
            ASSET_ISSUE_TRANSACTION_TYPE: 3,
            ASSET_TRANSFER_TRANSACTION_TYPE: 4,
            ASSET_REISSUE_TRANSACTION_TYPE: 5
        });
})();
