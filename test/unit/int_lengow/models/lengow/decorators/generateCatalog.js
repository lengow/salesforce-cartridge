'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');

var realCollections = require('int_lengow/cartridge/scripts/helpers/collections');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
var emptyStub = sinon.stub();
var generateCatalog;

describe('cartridge/models/lengow/decorators: generateCatalog.js', function () {
    describe('Compatibility Mode 21.7 (Collection with toArray)', function () {
        before(function () {
            generateCatalog = proxyquire('int_lengow/cartridge/models/lengow/decorators/generateCatalog', {
                '*/cartridge/scripts/helpers/collections': realCollections,
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

    describe('Compatibility Mode 22.7+ (Native Set)', function () {
        before(function () {
            generateCatalog = proxyquire('int_lengow/cartridge/models/lengow/decorators/generateCatalog', {
                '*/cartridge/scripts/helpers/collections': realCollections,
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getAllowedLocales: function () {
                                // Return a native Set (like in Compatibility Mode 22.7+)
                                return new Set(['LengowLocale']);
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

        it('should Generate Catalog Feed For Given Locale & Catalog with Set API', function () {
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

    describe('Compatibility Mode 22.7 (Java String Array simulation)', function () {
        function createJavaArrayLike(items) {
            var obj = { length: items.length };
            items.forEach(function (item, i) { obj[i] = item; });
            return new Proxy(obj, {
                get: function (target, prop) {
                    if (prop in target || typeof prop === 'symbol') {
                        return target[prop];
                    }
                    if (prop === 'toArray' || prop === 'size' || prop === 'forEach') {
                        throw new Error('Java class "[Ljava.lang.String;" has no field "' + String(prop) + '"');
                    }
                    return undefined;
                }
            });
        }

        before(function () {
            generateCatalog = proxyquire('int_lengow/cartridge/models/lengow/decorators/generateCatalog', {
                '*/cartridge/scripts/helpers/collections': realCollections,
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getAllowedLocales: function () {
                                return createJavaArrayLike(['LengowLocale']);
                            },
                            getCustomPreferenceValue: function () {
                                return createJavaArrayLike(['LengowLocale']);
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

        it('should Generate Catalog Feed with Java String Array locales', function () {
            var setCatalogFeedLocaleStub = sinon.stub();
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
                setCatalogFeedLocale: setCatalogFeedLocaleStub,
                writeCSV: emptyStub,
                setCurrencyCode: emptyStub
            };
            generateCatalog(object);
            assert.isTrue(setCatalogFeedLocaleStub.called, 'setCatalogFeedLocale should be called for matching locale');
        });
    });

    describe('Edge case: null/empty locales', function () {
        before(function () {
            generateCatalog = proxyquire('int_lengow/cartridge/models/lengow/decorators/generateCatalog', {
                '*/cartridge/scripts/helpers/collections': realCollections,
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getAllowedLocales: function () {
                                return ['en_US'];
                            },
                            getCustomPreferenceValue: function () {
                                return null;
                            }
                        };
                    }
                },
                'dw/catalog/ProductMgr': {
                    queryAllSiteProducts: function () { return []; },
                    queryProductsInCatalog: function () { return []; }
                },
                '*/cartridge/scripts/helpers/inventory': {
                    getInventoryLevel: function () { return 0; }
                }
            });
        });

        it('should handle null lengowSeletedLocales gracefully', function () {
            var writeCSVStub = sinon.stub();
            var object = {
                config: { catalogId: 'test' },
                logger: { error: emptyStub, info: emptyStub },
                createCSVFile: emptyStub,
                createFileWriter: function () { return { close: emptyStub }; },
                createCSVStreamWriter: function () { return { close: emptyStub }; },
                setCatalogFeedLocale: emptyStub,
                writeCSV: writeCSVStub,
                setCurrencyCode: emptyStub
            };
            assert.doesNotThrow(function () {
                generateCatalog(object);
            });
            assert.isFalse(writeCSVStub.called, 'No CSV should be written when selectedLocales is null');
        });
    });
});
