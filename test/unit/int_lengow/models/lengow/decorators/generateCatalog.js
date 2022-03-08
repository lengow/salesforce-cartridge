'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var generateCatalog;

describe('cartridge/models/lengow/decorators: generateCatalog.js', function () {
    before(function () {
        generateCatalog = proxyquire('int_lengow/cartridge/models/lengow/decorators/generateCatalog', {
            'dw/system/Site': {
                getCurrent: function () {
                    return {
                        getAllowedLocales: function () {
                            return {
                                toArray: function () {
                                    return ['LengowLocale'];
                                }
                            };
                        },
                        getCustomPreferenceValue: function () {
                            return ['LengowLocale'];
                        }
                    };
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

    it('should Generate Catalog Feed For Given Locale & Catalog', function () {
        var object = {
            config: {
                catalogId: 'Lengow-catalog-Id'
            },
            logger: {
                error: emptyStub,
                info: emptyStub
            },
            createCSVFile: emptyStub,
            createFileWriter: function () {
                return {
                    close: emptyStub
                };
            },
            createCSVStreamWriter: function () {
                return {
                    close: emptyStub
                };
            },
            setCatalogFeedLocale: emptyStub,
            writeCSV: emptyStub,
            setCurrencyCode: emptyStub
        };
        generateCatalog(object);
    });
});
