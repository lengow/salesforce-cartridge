'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var writeCSV;

describe('cartridge/models/lengow/decorators: writeCSV.js', function () {
    before(function () {
        writeCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/writeCSV', {
            'dw/catalog/CatalogMgr': {
                getCatalog: function () {
                    return null;
                }
            },
            'dw/catalog/ProductMgr': {
                queryAllSiteProducts: function () {
                    return [];
                },
                queryProductsInCatalog: function () {
                    return [];
                }
            },
            '*/cartridge/scripts/helpers/inventory': {
                getInventoryLevel: function () {
                    return 0;
                }
            }
        });
    });

    it('should Not Create CSV File If Any Header is Not Config', function () {
        var object = {
            config: {
                header: [],
                catalogId: 'lengow-catalog'
            },
            logger: {
                error: emptyStub,
                info: emptyStub
            }
        };
        writeCSV(object);
        object.writeCSV('en_US');
    });

    it('should Not Create CSV File If Invalid Catalog Id Configured', function () {
        var object = {
            config: {
                header: [{}],
                catalogId: 'lengow-catalog'
            },
            logger: {
                error: emptyStub,
                info: emptyStub
            }
        };
        var fileWriter = {
            flush: emptyStub
        };
        var csvStreamWriter = {
            writeNext: emptyStub
        };
        writeCSV(object);
        object.writeCSV(fileWriter, csvStreamWriter);
    });
});
