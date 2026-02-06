'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;

describe('bm_lengow/cartridge/controllers: LengowController.js - getAllowedLocalesArray compatibility', function () {
    var LengowController;
    var siteStub;
    var transactionStub;
    var ismlStub;

    beforeEach(function () {
        siteStub = {
            getCustomPreferenceValue: sinon.stub(),
            preferences: {
                custom: {
                    lengowMandatoryAttributes: '',
                    lengowAdditionalAttributes: '',
                    lengowSeletedLocales: []
                }
            },
            httpsHostName: 'test.demandware.net'
        };

        transactionStub = {
            wrap: function (callback) {
                callback();
            }
        };

        ismlStub = {
            renderTemplate: sinon.stub()
        };

        // Mock the request global
        global.request = {
            httpParameterMap: {
                type: { stringValue: 'mandatory' },
                attributesJSON: { stringValue: '{"system":[],"custom":[]}' },
                localeID: { value: 'en_US' },
                checked: { value: 'true' }
            }
        };

        // Mock the empty global
        global.empty = function (val) {
            return val === undefined || val === null || val === '';
        };
    });

    afterEach(function () {
        delete global.request;
        delete global.empty;
    });

    describe('Compatibility Mode 21.7 (Collection with toArray)', function () {
        beforeEach(function () {
            LengowController = proxyquire('bm_lengow/cartridge/controllers/LengowController', {
                'dw/template/ISML': ismlStub,
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getAllowedLocales: function () {
                                // Return a Collection-like object with toArray method (21.7 API)
                                return {
                                    toArray: function () {
                                        return ['en_US', 'fr_FR', 'de_DE'];
                                    }
                                };
                            },
                            getCustomPreferenceValue: function (key) {
                                if (key === 'lengowMandatoryAttributes') {
                                    return '{"system":[],"custom":[]}';
                                }
                                if (key === 'lengowAdditionalAttributes') {
                                    return '{"system":[],"custom":[]}';
                                }
                                if (key === 'lengowSeletedLocales') {
                                    return ['en_US', 'fr_FR'];
                                }
                                return siteStub.getCustomPreferenceValue(key);
                            },
                            preferences: siteStub.preferences,
                            httpsHostName: siteStub.httpsHostName
                        };
                    }
                },
                'dw/web/URLUtils': {
                    url: function () {
                        return {
                            toString: function () {
                                return 'http://test.url';
                            }
                        };
                    }
                },
                'dw/util/StringUtils': {
                    format: function (str, args) {
                        return str.replace('{0}', args[0]);
                    },
                    encodeBase64: function (str) {
                        return 'encoded_' + str;
                    }
                },
                'dw/web/Resource': {
                    msg: function (key, bundle, defaultValue) {
                        return 'message';
                    }
                },
                'dw/system/Transaction': transactionStub,
                'dw/svc/LocalServiceRegistry': {
                    createService: function () {
                        return {
                            call: function () {
                                return {
                                    object: '{"data":[{"id":"test","display_name":"Test","system":true,"value_type":"string"}]}'
                                };
                            }
                        };
                    }
                },
                'dw/system/CacheMgr': {
                    getCache: function () {
                        return {
                            get: function (key, callback) {
                                return callback();
                            },
                            invalidate: function () {}
                        };
                    }
                }
            });
        });

        it('should handle manage() with Collection API (21.7)', function () {
            LengowController.Manage();
            assert(ismlStub.renderTemplate.called, 'ISML renderTemplate should be called');
        });

        it('should handle submit() with Collection API (21.7)', function () {
            LengowController.Submit();
            assert(ismlStub.renderTemplate.called, 'ISML renderTemplate should be called');
        });

        it('should handle updateLocale() with Collection API (21.7)', function () {
            LengowController.UpdateLocale();
            assert(ismlStub.renderTemplate.called, 'ISML renderTemplate should be called');
        });
    });

    describe('Compatibility Mode 22.7+ (Native Set)', function () {
        beforeEach(function () {
            LengowController = proxyquire('bm_lengow/cartridge/controllers/LengowController', {
                'dw/template/ISML': ismlStub,
                'dw/system/Site': {
                    getCurrent: function () {
                        return {
                            getAllowedLocales: function () {
                                // Return a native Set (22.7+ API)
                                return new Set(['en_US', 'fr_FR', 'de_DE']);
                            },
                            getCustomPreferenceValue: function (key) {
                                if (key === 'lengowMandatoryAttributes') {
                                    return '{"system":[],"custom":[]}';
                                }
                                if (key === 'lengowAdditionalAttributes') {
                                    return '{"system":[],"custom":[]}';
                                }
                                if (key === 'lengowSeletedLocales') {
                                    return ['en_US', 'fr_FR'];
                                }
                                return siteStub.getCustomPreferenceValue(key);
                            },
                            preferences: siteStub.preferences,
                            httpsHostName: siteStub.httpsHostName
                        };
                    }
                },
                'dw/web/URLUtils': {
                    url: function () {
                        return {
                            toString: function () {
                                return 'http://test.url';
                            }
                        };
                    }
                },
                'dw/util/StringUtils': {
                    format: function (str, args) {
                        return str.replace('{0}', args[0]);
                    },
                    encodeBase64: function (str) {
                        return 'encoded_' + str;
                    }
                },
                'dw/web/Resource': {
                    msg: function (key, bundle, defaultValue) {
                        return 'message';
                    }
                },
                'dw/system/Transaction': transactionStub,
                'dw/svc/LocalServiceRegistry': {
                    createService: function () {
                        return {
                            call: function () {
                                return {
                                    object: '{"data":[{"id":"test","display_name":"Test","system":true,"value_type":"string"}]}'
                                };
                            }
                        };
                    }
                },
                'dw/system/CacheMgr': {
                    getCache: function () {
                        return {
                            get: function (key, callback) {
                                return callback();
                            },
                            invalidate: function () {}
                        };
                    }
                }
            });
        });

        it('should handle manage() with Set API (22.7+)', function () {
            LengowController.Manage();
            assert(ismlStub.renderTemplate.called, 'ISML renderTemplate should be called');
        });

        it('should handle submit() with Set API (22.7+)', function () {
            LengowController.Submit();
            assert(ismlStub.renderTemplate.called, 'ISML renderTemplate should be called');
        });

        it('should handle updateLocale() with Set API (22.7+)', function () {
            LengowController.UpdateLocale();
            assert(ismlStub.renderTemplate.called, 'ISML renderTemplate should be called');
        });
    });
});
