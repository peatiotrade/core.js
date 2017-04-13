var OrderPrice = (function () {

    var MATCHER_SCALE = 1e8;

    function OrderPrice(price, pair) {
        this.amountAsset = pair.amountAsset;
        this.priceAsset = pair.priceAsset;
        this.price = roundToPriceAsset(price, pair);
    }

    OrderPrice.prototype.toTokens = function () {
        return this.price.toNumber();
    };

    OrderPrice.prototype.toCoins = function () {
        return this.toTokens() * Math.pow(10, this.priceAsset.precision - this.amountAsset.precision);
    };

    OrderPrice.prototype.toBackendPrice = function () {
        return this.toCoins() * MATCHER_SCALE;
    };

    function roundToPriceAsset(price, pair) {
        return new Decimal(new Decimal(price).toFixed(pair.priceAsset.precision, Decimal.ROUND_FLOOR));
    }

    function isValidBackendPrice(price, pair) {
        var normalizedPrice = normalizePrice(price, pair);
        var roundedPrice = roundToPriceAsset(normalizedPrice, pair);

        return normalizedPrice.eq(roundedPrice);
    }

    function normalizePrice(price, pair) {
        return new Decimal(price)
            .div(MATCHER_SCALE)
            .div(Math.pow(10, pair.priceAsset.precision - pair.amountAsset.precision));
    }

    return {
        fromTokens: function (price, pair) {
            return new OrderPrice(price, pair);
        },

        fromBackendPrice: function (price, pair) {
            if (!isValidBackendPrice(price, pair)) {
                throw new Error('Backend price contains too many significant digits');
            }

            var normalizedPrice = normalizePrice(price, pair);

            return new OrderPrice(normalizedPrice, pair);
        }
    };
})();
