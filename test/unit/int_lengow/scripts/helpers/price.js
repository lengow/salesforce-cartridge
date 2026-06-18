'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var price;

describe('int_lengow/cartridge/scripts/helpers: price.js', function () {
    before(function () {
        price = proxyquire('int_lengow/cartridge/scripts/helpers/price', {});
    });

    it('should return the product price value', function () {
        var product = {
            getPriceModel: function () {
                return {
                    getPrice: function () {
                        return { valueOrNull: 29.99 };
                    }
                };
            }
        };
        assert.equal(price.getPrice(product), 29.99);
    });

    it('should return null when price is not available', function () {
        var product = {
            getPriceModel: function () {
                return {
                    getPrice: function () {
                        return { valueOrNull: null };
                    }
                };
            }
        };
        assert.isNull(price.getPrice(product));
    });
});

