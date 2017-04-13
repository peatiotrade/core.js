var OrderPrice = (function () {
    function OrderPrice(price, pair) {
        this.amountAsset = pair.amountAsset;
        this.priceAsset = pair.priceAsset;
        this.price = new Decimal(new Decimal(price).toFixed(this.priceAsset.precision, Decimal.ROUND_FLOOR));
    }

    OrderPrice.prototype.toTokens = function () {
        return this.price.toNumber();
    };

    OrderPrice.prototype.toCoins = function () {
        return this.toTokens() * Math.pow(10, this.priceAsset.precision - this.amountAsset.precision);
    };

    OrderPrice.prototype.toBackendPrice = function () {
        return this.toCoins() * 1e8;
    };

    return {
        fromTokens: function (price, pair) {
            return new OrderPrice(price, pair);
        },

        fromCoins: function () {},
        fromBackendPrice: function () {},
        isValidPrice: function () {}
    };
})();
