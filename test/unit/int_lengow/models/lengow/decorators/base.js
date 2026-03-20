'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var base;

var JobParams = {
    ImpexFolderName: 'src/lengow',
    FileNamePrefix: 'lengow',
    CatalogID: 'storefront-catalog',
    IncludeTimeStamp: true,
    SkipMaster: true,
    AvailableOnly: false,
    OnlineOnly: true,
    IsDisabled: false,
    SftpFolderName: '/upload',
    ServiceID: 'LengowSFTP'
};

describe('cartridge/models/lengow/decorators: base.js', function () {
    beforeEach(function () {
        global.empty = function (val) {
            return val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
        };
    });

    afterEach(function () {
        delete global.empty;
    });

    describe('with valid mandatory and additional attributes', function () {
        before(function () {
            var lengowMandatoryAttributes = JSON.stringify({
                system: [{ id: 'brand', value_type: 'string' }],
                custom: [{ id: 'customAttr1', value_type: 'string' }]
            });
            var lengowAdditionalAttributes = JSON.stringify({
                system: [{ id: 'shortDescription', value_type: 'string' }],
                custom: [{ id: 'customAttr2', value_type: 'boolean' }]
            });

            base = proxyquire('int_lengow/cartridge/models/lengow/decorators/base', {
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getCustomPreferenceValue: function (prefName) {
                                if (prefName === 'lengowMandatoryAttributes') {
                                    return lengowMandatoryAttributes;
                                } else if (prefName === 'lengowAdditionalAttributes') {
                                    return lengowAdditionalAttributes;
                                }
                                return null;
                            },
                            getID: function () {
                                return 'TestSite';
                            }
                        };
                    }
                },
                '*/cartridge/config/productAttr': [
                    { id: 'ID', value_type: 'string' },
                    { id: 'name', value_type: 'string' }
                ],
                '*/cartridge/scripts/helpers/lengowHelpers': {
                    getLogger: function () {
                        return { info: function () {}, error: function () {} };
                    }
                }
            });
        });

        it('should get all job config including header, headerObject, and job params', function () {
            var object = {};
            base(object, JobParams);

            assert.isTrue(object.config.timeStamp);
            assert.isTrue(object.config.skipMaster);
            assert.isFalse(object.config.availableOnly);
            assert.isTrue(object.config.onlineOnly);
            assert.isFalse(object.config.isDisabled);
            assert.equal(object.config.impexFolderName, 'src/lengow');
            assert.equal(object.config.fileName, 'lengow');
            assert.equal(object.config.catalogId, 'storefront-catalog');
            assert.equal(object.config.siteID, 'TestSite');
            assert.equal(object.config.archiveFolderName, 'archive');
        });

        it('should merge productAttr, mandatory and additional attributes into header', function () {
            var object = {};
            base(object, JobParams);

            assert.include(object.config.header, 'ID');
            assert.include(object.config.header, 'name');
            assert.include(object.config.header, 'brand');
            assert.include(object.config.header, 'shortDescription');
            assert.include(object.config.header, 'customAttr1');
            assert.include(object.config.header, 'customAttr2');
            assert.equal(object.config.headerObject.length, 6);
        });

        it('should not duplicate attributes already in productAttr', function () {
            var baseWithDuplicates = proxyquire('int_lengow/cartridge/models/lengow/decorators/base', {
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getCustomPreferenceValue: function (prefName) {
                                if (prefName === 'lengowMandatoryAttributes') {
                                    return JSON.stringify({
                                        system: [{ id: 'ID', value_type: 'string' }],
                                        custom: []
                                    });
                                } else if (prefName === 'lengowAdditionalAttributes') {
                                    return JSON.stringify({
                                        system: [{ id: 'name', value_type: 'string' }],
                                        custom: []
                                    });
                                }
                                return null;
                            },
                            getID: function () { return 'TestSite'; }
                        };
                    }
                },
                '*/cartridge/config/productAttr': [
                    { id: 'ID', value_type: 'string' },
                    { id: 'name', value_type: 'string' }
                ],
                '*/cartridge/scripts/helpers/lengowHelpers': {
                    getLogger: function () { return { info: function () {}, error: function () {} }; }
                }
            });
            var object = {};
            baseWithDuplicates(object, JobParams);

            var idCount = object.config.header.filter(function (h) { return h === 'ID'; }).length;
            assert.equal(idCount, 1, 'ID should not be duplicated');
        });

        it('should set sftpConfig correctly', function () {
            var object = {};
            base(object, JobParams);

            assert.equal(object.sftpConfig.sftpFolderName, '/upload');
            assert.equal(object.sftpConfig.serviceID, 'LengowSFTP');
        });

        it('should set logger on the object', function () {
            var object = {};
            base(object, JobParams);

            assert.isDefined(object.logger);
        });
    });

    describe('with empty/null attributes', function () {
        before(function () {
            base = proxyquire('int_lengow/cartridge/models/lengow/decorators/base', {
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getCustomPreferenceValue: function () {
                                return null;
                            },
                            getID: function () { return 'TestSite'; }
                        };
                    }
                },
                '*/cartridge/config/productAttr': [
                    { id: 'ID', value_type: 'string' }
                ],
                '*/cartridge/scripts/helpers/lengowHelpers': {
                    getLogger: function () { return { info: function () {}, error: function () {} }; }
                }
            });
        });

        it('should handle null preference values gracefully', function () {
            var object = {};
            base(object, JobParams);

            // Should still have productAttr entries
            assert.include(object.config.header, 'ID');
        });
    });

    describe('with empty string attributes (triggers empty() = true)', function () {
        before(function () {
            base = proxyquire('int_lengow/cartridge/models/lengow/decorators/base', {
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getCustomPreferenceValue: function () {
                                return '';
                            },
                            getID: function () { return 'TestSite'; }
                        };
                    }
                },
                '*/cartridge/config/productAttr': [],
                '*/cartridge/scripts/helpers/lengowHelpers': {
                    getLogger: function () { return { info: function () {}, error: function () {} }; }
                }
            });
        });

        it('should handle empty string preference values', function () {
            var object = {};
            base(object, JobParams);

            assert.isArray(object.config.header);
            assert.equal(object.config.header.length, 0);
        });
    });

    describe('with invalid JSON (triggers catch block)', function () {
        before(function () {
            base = proxyquire('int_lengow/cartridge/models/lengow/decorators/base', {
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getCustomPreferenceValue: function () {
                                return 'NOT_VALID_JSON{{{';
                            },
                            getID: function () { return 'TestSite'; }
                        };
                    }
                },
                '*/cartridge/config/productAttr': [],
                '*/cartridge/scripts/helpers/lengowHelpers': {
                    getLogger: function () { return { info: function () {}, error: function () {} }; }
                }
            });
        });

        it('should catch JSON parse errors and return empty header', function () {
            var object = {};
            base(object, JobParams);

            assert.isArray(object.config.header);
            assert.equal(object.config.header.length, 0);
        });
    });
});
