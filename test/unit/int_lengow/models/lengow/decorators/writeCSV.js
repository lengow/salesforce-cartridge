'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
var writeCSV;

function createMockProducts(products) {
    var idx = 0;
    return {
        count: products.length,
        hasNext: function () { return idx < products.length; },
        next: function () { return products[idx++]; },
        close: sinon.stub()
    };
}

describe('cartridge/models/lengow/decorators: writeCSV.js', function () {
    describe('empty header (no attributes configured)', function () {
        before(function () {
            writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
                'dw/catalog/CatalogMgr': { getCatalog: function () { return null; } },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return []; },
                    queryProductsInCatalog: function () { return []; }
                },
                '*/cartridge/scripts/helpers/inventory': { getInventoryLevel: function () { return 0; } }
            });
        });

        it('should Not Create CSV File If Any Header is Not Config', function () {
            var errorStub = sinon.stub();
            var object = {
                config: { header: [], catalogId: 'lengow-catalog' },
                logger: { error: errorStub, info: sinon.stub() }
            };
            writeCSV(object);
            object.writeCSV(sinon.stub(), sinon.stub());
            assert.isTrue(errorStub.calledOnce);
        });
    });

    describe('invalid catalog ID', function () {
        before(function () {
            writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
                'dw/catalog/CatalogMgr': { getCatalog: function () { return null; } },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return []; },
                    queryProductsInCatalog: function () { return []; }
                },
                '*/cartridge/scripts/helpers/inventory': { getInventoryLevel: function () { return 0; } }
            });
        });

        it('should Not Create CSV File If Invalid Catalog Id Configured', function () {
            var errorStub = sinon.stub();
            var flushStub = sinon.stub();
            var object = {
                config: { header: ['ID', 'name'], headerObject: [], catalogId: 'invalid-catalog' },
                logger: { error: errorStub, info: sinon.stub() }
            };
            writeCSV(object);
            object.writeCSV({ flush: flushStub }, { writeNext: sinon.stub() });
            assert.isTrue(errorStub.calledOnce);
            assert.include(errorStub.firstCall.args[0], 'Cannot find catalog');
        });
    });

    describe('no catalogId (queryAllSiteProducts)', function () {
        var mockProducts;
        before(function () {
            mockProducts = createMockProducts([
                { ID: 'P1', isOnline: function () { return true; }, isMaster: function () { return false; } }
            ]);
            writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
                'dw/catalog/CatalogMgr': { getCatalog: function () { return null; } },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return mockProducts; },
                    queryProductsInCatalog: function () { return []; }
                },
                '*/cartridge/scripts/helpers/inventory': { getInventoryLevel: function () { return 5; } },
                '*/cartridge/models/lengow/customField': function () { return 'val'; }
            });
        });

        it('should query all site products when catalogId is empty', function () {
            var writeNextStub = sinon.stub();
            var flushStub = sinon.stub();
            var infoStub = sinon.stub();
            var object = {
                config: {
                    header: ['ID'],
                    headerObject: [{ id: 'ID', value_type: 'string' }],
                    catalogId: '',
                    skipMaster: false,
                    onlineOnly: false,
                    availableOnly: false
                },
                logger: { error: sinon.stub(), info: infoStub }
            };
            writeCSV(object);
            object.writeCSV({ flush: flushStub }, { writeNext: writeNextStub });
            // header + 1 product line
            assert.equal(writeNextStub.callCount, 2);
            assert.isTrue(mockProducts.close.calledOnce);
        });
    });

    describe('with valid catalog and products', function () {
        before(function () {
            writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
                'dw/catalog/CatalogMgr': {
                    getCatalog: function (id) { return { id: id }; }
                },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return []; },
                    queryProductsInCatalog: function () {
                        return createMockProducts([
                            { ID: 'P1', isOnline: function () { return true; }, isMaster: function () { return false; } },
                            { ID: 'P2', isOnline: function () { return true; }, isMaster: function () { return true; } },
                            { ID: 'P3', isOnline: function () { return false; }, isMaster: function () { return false; } }
                        ]);
                    }
                },
                '*/cartridge/scripts/helpers/inventory': { getInventoryLevel: function () { return 5; } },
                '*/cartridge/models/lengow/customField': function (product) { return product.ID; }
            });
        });

        it('should write CSV for all products when no filters', function () {
            var writeNextStub = sinon.stub();
            var flushStub = sinon.stub();
            var object = {
                config: {
                    header: ['ID'],
                    headerObject: [{ id: 'ID', value_type: 'string' }],
                    catalogId: 'test-catalog',
                    skipMaster: false,
                    onlineOnly: false,
                    availableOnly: false
                },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            writeCSV(object);
            object.writeCSV({ flush: flushStub }, { writeNext: writeNextStub });
            // 1 header + 3 products = 4
            assert.equal(writeNextStub.callCount, 4);
        });

        it('should skip master products when skipMaster is true', function () {
            var writeNextStub = sinon.stub();
            var object = {
                config: {
                    header: ['ID'],
                    headerObject: [{ id: 'ID', value_type: 'string' }],
                    catalogId: 'test-catalog',
                    skipMaster: true,
                    onlineOnly: false,
                    availableOnly: false
                },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            writeCSV(object);
            object.writeCSV({ flush: sinon.stub() }, { writeNext: writeNextStub });
            // 1 header + 2 non-master products = 3
            assert.equal(writeNextStub.callCount, 3);
        });

        it('should skip offline products when onlineOnly is true', function () {
            var writeNextStub = sinon.stub();
            var object = {
                config: {
                    header: ['ID'],
                    headerObject: [{ id: 'ID', value_type: 'string' }],
                    catalogId: 'test-catalog',
                    skipMaster: false,
                    onlineOnly: true,
                    availableOnly: false
                },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            writeCSV(object);
            object.writeCSV({ flush: sinon.stub() }, { writeNext: writeNextStub });
            // 1 header + 2 online products = 3
            assert.equal(writeNextStub.callCount, 3);
        });
    });

    describe('with availableOnly filter', function () {
        before(function () {
            var inventoryLevels = { P1: 5, P2: 0 };
            writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
                'dw/catalog/CatalogMgr': {
                    getCatalog: function (id) { return { id: id }; }
                },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return []; },
                    queryProductsInCatalog: function () {
                        return createMockProducts([
                            { ID: 'P1', isOnline: function () { return true; }, isMaster: function () { return false; } },
                            { ID: 'P2', isOnline: function () { return true; }, isMaster: function () { return false; } }
                        ]);
                    }
                },
                '*/cartridge/scripts/helpers/inventory': {
                    getInventoryLevel: function (product) { return inventoryLevels[product.ID] || 0; }
                },
                '*/cartridge/models/lengow/customField': function (product) { return product.ID; }
            });
        });

        it('should skip products with no inventory when availableOnly is true', function () {
            var writeNextStub = sinon.stub();
            var object = {
                config: {
                    header: ['ID'],
                    headerObject: [{ id: 'ID', value_type: 'string' }],
                    catalogId: 'test-catalog',
                    skipMaster: false,
                    onlineOnly: false,
                    availableOnly: true
                },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            writeCSV(object);
            object.writeCSV({ flush: sinon.stub() }, { writeNext: writeNextStub });
            // 1 header + 1 available product = 2
            assert.equal(writeNextStub.callCount, 2);
        });
    });

    describe('empty products iterator', function () {
        before(function () {
            writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
                'dw/catalog/CatalogMgr': {
                    getCatalog: function (id) { return { id: id }; }
                },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return []; },
                    queryProductsInCatalog: function () {
                        return { count: 0, hasNext: function () { return false; }, next: function () { return null; }, close: sinon.stub() };
                    }
                },
                '*/cartridge/scripts/helpers/inventory': { getInventoryLevel: function () { return 0; } }
            });
        });

        it('should log info and return when no products found', function () {
            var infoStub = sinon.stub();
            var object = {
                config: {
                    header: ['ID'],
                    headerObject: [],
                    catalogId: 'empty-catalog'
                },
                logger: { error: sinon.stub(), info: infoStub }
            };
            writeCSV(object);
            object.writeCSV({ flush: sinon.stub() }, { writeNext: sinon.stub() });
            assert.isTrue(infoStub.calledWith('---No products found in catalog {0}!---', 'empty-catalog'));
        });
    });

    describe('product export error (catch block)', function () {
        before(function () {
            writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
                'dw/catalog/CatalogMgr': {
                    getCatalog: function (id) { return { id: id }; }
                },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return []; },
                    queryProductsInCatalog: function () {
                        return createMockProducts([
                            { ID: 'P-ERR', isOnline: function () { return true; }, isMaster: function () { return false; } }
                        ]);
                    }
                },
                '*/cartridge/scripts/helpers/inventory': { getInventoryLevel: function () { return 5; } },
                '*/cartridge/models/lengow/customField': function () { throw new Error('Custom field error'); }
            });
        });

        it('should catch and log errors when exporting a product fails', function () {
            var errorStub = sinon.stub();
            var messageStub = function (e) { return e.message; };
            var object = {
                config: {
                    header: ['ID'],
                    headerObject: [{ id: 'ID', value_type: 'string' }],
                    catalogId: 'test-catalog',
                    skipMaster: false,
                    onlineOnly: false,
                    availableOnly: false
                },
                logger: { error: errorStub, info: sinon.stub(), message: messageStub }
            };
            writeCSV(object);
            object.writeCSV({ flush: sinon.stub() }, { writeNext: sinon.stub() });
            assert.isTrue(errorStub.called);
            assert.include(errorStub.firstCall.args[0], 'Cannot export product');
        });
    });
});
