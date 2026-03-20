'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var productType;

describe('int_lengow/cartridge/scripts/helpers: productType.js', function () {
    before(function () {
        productType = proxyquire('int_lengow/cartridge/scripts/helpers/productType', {});
    });

    it('should return "master" for master products', function () {
        var product = { master: true, variant: false, variationGroup: false, bundle: false, productSet: false };
        assert.equal(productType.getProductType(product), 'master');
    });

    it('should return "variant" for variant products', function () {
        var product = { master: false, variant: true, variationGroup: false, bundle: false, productSet: false };
        assert.equal(productType.getProductType(product), 'variant');
    });

    it('should return "variationGroup" for variation group products', function () {
        var product = { master: false, variant: false, variationGroup: true, bundle: false, productSet: false };
        assert.equal(productType.getProductType(product), 'variationGroup');
    });

    it('should return "product bundle" for bundle products', function () {
        var product = { master: false, variant: false, variationGroup: false, bundle: true, productSet: false };
        assert.equal(productType.getProductType(product), 'product bundle');
    });

    it('should return "product set" for product set products', function () {
        var product = { master: false, variant: false, variationGroup: false, bundle: false, productSet: true };
        assert.equal(productType.getProductType(product), 'product set');
    });

    it('should return "standard" for standard products', function () {
        var product = { master: false, variant: false, variationGroup: false, bundle: false, productSet: false };
        assert.equal(productType.getProductType(product), 'standard');
    });
});

