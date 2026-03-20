'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var inventory;

describe('int_lengow/cartridge/scripts/helpers: inventory.js', function () {
    before(function () {
        inventory = proxyquire('int_lengow/cartridge/scripts/helpers/inventory', {});
    });

    describe('getInventoryStatus', function () {
        it('should return availability status when availabilityModel exists', function () {
            var product = {
                availabilityModel: { availabilityStatus: 'IN_STOCK' }
            };
            assert.equal(inventory.getInventoryStatus(product), 'IN_STOCK');
        });

        it('should return NOT_AVAILABLE when no availabilityModel', function () {
            var product = { availabilityModel: null };
            assert.equal(inventory.getInventoryStatus(product), 'NOT_AVAILABLE');
        });
    });

    describe('getInventoryLevel', function () {
        it('should return ATS value when inventory record exists', function () {
            var product = {
                availabilityModel: {
                    getInventoryRecord: function () {
                        return { ATS: { value: 42 } };
                    }
                }
            };
            assert.equal(inventory.getInventoryLevel(product), 42);
        });

        it('should return 0 when no inventory record', function () {
            var product = {
                availabilityModel: {
                    getInventoryRecord: function () { return null; }
                }
            };
            assert.equal(inventory.getInventoryLevel(product), 0);
        });

        it('should return 0 when no availabilityModel', function () {
            var product = { availabilityModel: null };
            assert.equal(inventory.getInventoryLevel(product), 0);
        });
    });
});

