'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');

var realCollections = require('int_lengow/cartridge/scripts/helpers/collections');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;

/**
 * Creates a mock SFCC site object with configurable behavior.
 * Preference values are stored in a writable object so Transaction.wrap writes can be verified.
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.getAllowedLocalesReturn - factory returning the value for getAllowedLocales()
 * @param {Object} options.preferenceValues - initial map of prefName → value
 * @returns {Object} site mock
 */
function createSiteMock(options) {
    var opts = options || {};
    // Mutable preference store – Transaction.wrap writes go here
    var prefStore = Object.assign({
        lengowMandatoryAttributes: '{"system":[],"custom":[]}',
        lengowAdditionalAttributes: '{"system":[],"custom":[]}',
        lengowSeletedLocales: ['en_US'],
        ocapiClientId: 'test-client-id',
        ocapiClientPassword: 'test-client-password'
    }, opts.preferenceValues || {});

    var site = {
        getAllowedLocales: opts.getAllowedLocalesReturn || function () {
            return ['en_US', 'fr_FR', 'de_DE'];
        },
        getCustomPreferenceValue: function (key) {
            if (!(key in prefStore)) {
                return null;
            }
            return prefStore[key];
        },
        preferences: {
            custom: prefStore
        },
        httpsHostName: 'test.demandware.net'
    };

    return site;
}

/**
 * Builds the full set of proxyquire stubs needed by LengowController.
 *
 * @param {Object} siteMock – the object returned by createSiteMock
 * @param {Object} [overrides] – optional per-module overrides
 * @returns {Object} stubs hash
 */
function buildStubs(siteMock, overrides) {
    var ov = overrides || {};
    var ismlStub = ov.isml || { renderTemplate: sinon.stub() };

    return {
        isml: ismlStub,
        stubs: {
            'dw/template/ISML': ismlStub,
            // The real helper is injected on purpose: toArray() is the code that fixes the
            // CM 22.7 locale bug (PCMT-1347), so the controller tests must exercise it,
            // not a stub of it.
            '*/cartridge/scripts/helpers/collections': realCollections,
            'dw/system/Site': {
                getCurrent: function () { return siteMock; }
            },
            'dw/web/URLUtils': ov.urlUtils || {
                url: function () {
                    return { toString: function () { return 'http://test.url'; } };
                }
            },
            'dw/util/StringUtils': ov.stringUtils || {
                format: function (str) {
                    var result = str;
                    var args = Array.prototype.slice.call(arguments, 1);
                    args.forEach(function (arg, i) {
                        result = result.replace('{' + i + '}', arg);
                    });
                    return result;
                },
                encodeBase64: function (str) { return 'encoded_' + str; }
            },
            'dw/web/Resource': ov.resource || {
                msg: function (key) { return key; }
            },
            'dw/system/Transaction': ov.transaction || {
                wrap: function (cb) { cb(); }
            },
            'dw/web/CSRFProtection': ov.csrfProtection || {
                generateToken: function () { return 'test-csrf-token'; },
                // Deliberately not 'csrf_token': the clients must use the name the platform
                // reports rather than a hard-coded one, and the tests should catch a regression
                // to hard-coding.
                getTokenName: function () { return 'test_csrf_name'; },
                validateRequest: function () { return true; }
            },
            'dw/svc/LocalServiceRegistry': ov.serviceRegistry || {
                createService: function (serviceName) {
                    return {
                        call: function () {
                            if (serviceName === 'LengowOAuthService') {
                                // OAuth service returns access_token
                                return {
                                    object: JSON.stringify({
                                        access_token: 'test-bearer-token'
                                    })
                                };
                            }
                            // LengowGetSystemObjectDefinitions returns attribute data
                            return {
                                object: JSON.stringify({
                                    data: [
                                        { id: 'ID', display_name: { default: 'Product ID' }, system: true, value_type: 'string' },
                                        { id: 'name', display_name: { default: 'Name' }, system: true, value_type: 'string' },
                                        { id: 'brand', display_name: { default: 'Brand' }, system: true, value_type: 'string' },
                                        { id: 'image', display_name: { default: 'Image' }, system: true, value_type: 'image' },
                                        { id: 'thumbnail', display_name: { default: 'Thumbnail' }, system: true, value_type: 'image' }
                                    ]
                                })
                            };
                        }
                    };
                }
            },
            'dw/system/CacheMgr': ov.cacheMgr || {
                getCache: function () {
                    return {
                        get: function (_key, callback) { return callback(); },
                        invalidate: function () {}
                    };
                }
            },
            'dw/object/ObjectAttributeDefinition': ov.objectAttributeDefinition || {
                VALUE_TYPE_INT: 1,
                VALUE_TYPE_NUMBER: 2,
                VALUE_TYPE_STRING: 3,
                VALUE_TYPE_TEXT: 4,
                VALUE_TYPE_HTML: 5,
                VALUE_TYPE_DATE: 6,
                VALUE_TYPE_IMAGE: 7,
                VALUE_TYPE_BOOLEAN: 8,
                VALUE_TYPE_QUANTITY: 10,
                VALUE_TYPE_DATETIME: 11,
                VALUE_TYPE_EMAIL: 12,
                VALUE_TYPE_PASSWORD: 13,
                VALUE_TYPE_SET_OF_INT: 21,
                VALUE_TYPE_SET_OF_NUMBER: 22,
                VALUE_TYPE_SET_OF_STRING: 23,
                VALUE_TYPE_ENUM_OF_INT: 31,
                VALUE_TYPE_ENUM_OF_STRING: 33
            },
            'dw/object/SystemObjectMgr': ov.systemObjectMgr || {
                describe: function () {
                    var attrs = [
                        { getID: function () { return 'ID'; }, getDisplayName: function () { return 'Product ID'; }, isSystem: function () { return true; }, getValueTypeCode: function () { return 3; } },
                        { getID: function () { return 'name'; }, getDisplayName: function () { return 'Name'; }, isSystem: function () { return true; }, getValueTypeCode: function () { return 3; } },
                        { getID: function () { return 'brand'; }, getDisplayName: function () { return 'Brand'; }, isSystem: function () { return true; }, getValueTypeCode: function () { return 3; } },
                        { getID: function () { return 'image'; }, getDisplayName: function () { return 'Image'; }, isSystem: function () { return true; }, getValueTypeCode: function () { return 7; } },
                        { getID: function () { return 'thumbnail'; }, getDisplayName: function () { return 'Thumbnail'; }, isSystem: function () { return true; }, getValueTypeCode: function () { return 7; } }
                    ];
                    return {
                        getAttributeDefinitions: function () {
                            var i = 0;
                            return {
                                iterator: function () {
                                    return {
                                        hasNext: function () { return i < attrs.length; },
                                        next: function () { return attrs[i++]; }
                                    };
                                }
                            };
                        }
                    };
                }
            }
        }
    };
}

// ─────────────────────────────────────────────────────────────────────
// 1. BASIC COMPATIBILITY TESTS  (improved with data checks)
// ─────────────────────────────────────────────────────────────────────

describe('bm_lengow/cartridge/controllers: LengowController.js', function () {
    beforeEach(function () {
        global.request = {
            httpParameterMap: {
                type: { stringValue: 'mandatory' },
                attributesJSON: { stringValue: '{"system":[{"id":"name","value_type":"string"}],"custom":[]}' },
                localeID: { value: 'en_US' },
                checked: { value: 'true' }
            }
        };
        global.empty = function (val) {
            return val === undefined || val === null || val === '';
        };
    });

    afterEach(function () {
        delete global.request;
        delete global.empty;
    });

    // ─── 1a. Compatibility Mode 21.7 (Collection with toArray) ───────
    describe('Compatibility Mode 21.7 (Collection with toArray)', function () {
        var ctrl,
            isml,
            site;

        beforeEach(function () {
            site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    return {
                        toArray: function () { return ['en_US', 'fr_FR', 'de_DE']; }
                    };
                },
                preferenceValues: { lengowSeletedLocales: { toArray: function () { return ['en_US']; } } }
            });
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);
        });

        it('manage() should render with correct allowedLocales and selectedLocales', function () {
            ctrl.Manage();
            assert(isml.renderTemplate.calledOnce, 'renderTemplate called');
            var args = isml.renderTemplate.firstCall.args;
            assert.isTrue(args[1].success, 'manage should succeed');
            assert.deepEqual(args[1].allowedLocales, ['en_US', 'fr_FR', 'de_DE']);
            assert.deepEqual(args[1].selectedLocales, ['en_US']);
        });

        it('submit() should render with correct data', function () {
            ctrl.Submit();
            assert(isml.renderTemplate.calledOnce);
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isTrue(data.success);
            assert.isArray(data.allowedLocales);
            assert.isArray(data.selectedLocales);
        });

        it('updateLocale() should render with correct data', function () {
            ctrl.UpdateLocale();
            assert(isml.renderTemplate.calledOnce);
            var data = isml.renderTemplate.firstCall.args[1];
            assert.deepEqual(data.allowedLocales, ['en_US', 'fr_FR', 'de_DE']);
        });
    });

    // ─── 1b. Compatibility Mode 22.7+ (Native Set) ──────────────────
    describe('Compatibility Mode 22.7+ (Native Set)', function () {
        var ctrl,
            isml,
            site;

        beforeEach(function () {
            site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    return new Set(['en_US', 'fr_FR', 'de_DE']);
                },
                preferenceValues: { lengowSeletedLocales: new Set(['en_US', 'fr_FR']) }
            });
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);
        });

        it('manage() should convert Set to Array for allowedLocales', function () {
            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isArray(data.allowedLocales);
            assert.includeMembers(data.allowedLocales, ['en_US', 'fr_FR', 'de_DE']);
        });

        it('manage() should convert Set to Array for selectedLocales', function () {
            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isArray(data.selectedLocales);
            assert.includeMembers(data.selectedLocales, ['en_US', 'fr_FR']);
        });

        it('submit() should work with Set-based locales', function () {
            ctrl.Submit();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isTrue(data.success);
            assert.isArray(data.allowedLocales);
        });

        it('updateLocale() should work with Set-based locales', function () {
            ctrl.UpdateLocale();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isArray(data.allowedLocales);
            assert.isArray(data.selectedLocales);
        });
    });

    // ─── 1c. Compatibility Mode 22.7 (Java String Array simulation) ─
    describe('Compatibility Mode 22.7 (Java String Array)', function () {
        var ctrl,
            isml;

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

        beforeEach(function () {
            var site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    return createJavaArrayLike(['en_US', 'fr_FR', 'de_DE']);
                },
                preferenceValues: {
                    lengowSeletedLocales: createJavaArrayLike(['en_US', 'fr_FR'])
                }
            });
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);
        });

        it('manage() should convert Java array to JS array for allowedLocales', function () {
            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isArray(data.allowedLocales);
            assert.deepEqual(data.allowedLocales, ['en_US', 'fr_FR', 'de_DE']);
        });

        it('manage() should convert Java array to JS array for selectedLocales', function () {
            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isArray(data.selectedLocales);
            assert.deepEqual(data.selectedLocales, ['en_US', 'fr_FR']);
        });

        it('submit() should work with Java array locales', function () {
            ctrl.Submit();
            assert.isTrue(isml.renderTemplate.calledOnce);
            var data = isml.renderTemplate.firstCall.args[1];
            assert.isTrue(data.success);
        });

        it('updateLocale() should work with Java array locales', function () {
            ctrl.UpdateLocale();
            assert.isTrue(isml.renderTemplate.calledOnce);
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // 2. TEMPLATE ARGUMENTS VERIFICATION
    // ─────────────────────────────────────────────────────────────────

    describe('Template arguments verification', function () {
        var ctrl,
            isml,
            site;

        beforeEach(function () {
            site = createSiteMock({
                preferenceValues: {
                    lengowMandatoryAttributes: '{"system":[{"id":"name"}],"custom":[{"id":"customAttr"}]}',
                    lengowAdditionalAttributes: '{"system":[{"id":"brand"}],"custom":[]}',
                    lengowSeletedLocales: ['en_US', 'fr_FR']
                }
            });
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);
        });

        it('manage() should pass productSystemObjectDefinitions with filtered attributes (no image/thumbnail)', function () {
            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            var attrs = data.productSystemObjectDefinitions.attributes;
            assert.isTrue(data.success);
            var ids = attrs.map(function (a) { return a.id; });
            assert.notInclude(ids, 'image');
            assert.notInclude(ids, 'thumbnail');
            assert.include(ids, 'ID');
            assert.include(ids, 'name');
            assert.include(ids, 'brand');
        });

        it('manage() should pass correct mandatory and additional attribute arrays', function () {
            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.deepEqual(data.lengowMandatoryAttributesArray, ['name', 'customAttr']);
            assert.deepEqual(data.lengowAdditionalAttributesArray, ['brand']);
        });

        it('manage() should filter selectedLocales to only include allowed locales', function () {
            site.preferences.custom.lengowSeletedLocales = ['en_US', 'invalid_XX', 'fr_FR'];
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.deepEqual(data.selectedLocales, ['en_US', 'fr_FR']);
            assert.notInclude(data.selectedLocales, 'invalid_XX');
        });

        it('manage() should pass impexUrl with correct hostname', function () {
            ctrl.Manage();
            var data = isml.renderTemplate.firstCall.args[1];
            assert.include(data.impexUrl, 'test.demandware.net');
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // 3. submit() – SAVE FLOW & ERROR HANDLING
    //    BUG: submit() has NO try-catch (unlike manage())
    // ─────────────────────────────────────────────────────────────────

    describe('submit() – save flow', function () {
        var ctrl,
            isml,
            site;

        beforeEach(function () {
            site = createSiteMock({
                preferenceValues: {
                    lengowMandatoryAttributes: '{"system":[],"custom":[]}',
                    lengowAdditionalAttributes: '{"system":[],"custom":[]}',
                    lengowSeletedLocales: ['en_US']
                }
            });
        });

        it('should save mandatory attributes to preference store', function () {
            global.request.httpParameterMap.type.stringValue = 'mandatory';
            global.request.httpParameterMap.attributesJSON.stringValue = '{"system":[{"id":"name"}],"custom":[]}';

            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Submit();
            assert.equal(site.preferences.custom.lengowMandatoryAttributes, '{"system":[{"id":"name"}],"custom":[]}');
        });

        it('should save additional attributes to preference store', function () {
            global.request.httpParameterMap.type.stringValue = 'additional';
            global.request.httpParameterMap.attributesJSON.stringValue = '{"system":[{"id":"brand"}],"custom":[]}';

            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Submit();
            assert.equal(site.preferences.custom.lengowAdditionalAttributes, '{"system":[{"id":"brand"}],"custom":[]}');
        });

        it('should NOT modify preferences when type is "reset"', function () {
            global.request.httpParameterMap.type.stringValue = 'reset';
            site.preferences.custom.lengowMandatoryAttributes = '{"system":[{"id":"original"}],"custom":[]}';

            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Submit();
            assert.equal(site.preferences.custom.lengowMandatoryAttributes, '{"system":[{"id":"original"}],"custom":[]}');
        });

        it('should render lengowContent template (not lengowMainDashboard)', function () {
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Submit();
            assert.equal(isml.renderTemplate.firstCall.args[0], 'lengow/lengowContent');
        });
    });

    describe('submit() – BUG: missing error handling (no try-catch)', function () {
        it('should CRASH if getProductSystemObjectDefinitions throws (unlike manage which catches)', function () {
            var site = createSiteMock();
            var b = buildStubs(site, {
                cacheMgr: {
                    getCache: function () {
                        return {
                            get: function () {
                                throw new Error('OCAPI service unavailable');
                            },
                            invalidate: function () {}
                        };
                    }
                }
            });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            // manage() should NOT throw – it has try-catch
            assert.doesNotThrow(function () {
                ctrl.Manage();
            }, 'manage() should catch errors gracefully');

            // submit() SHOULD throw – BUG: no try-catch
            assert.throws(function () {
                ctrl.Submit();
            }, /OCAPI service unavailable/, 'submit() crashes because it lacks try-catch error handling');
        });

        it('should CRASH if getAllowedLocalesArray throws inside submit', function () {
            var site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    return new Proxy({}, {
                        get: function () {
                            throw new TypeError('Cannot read properties of Java object');
                        }
                    });
                }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            // manage() catches the error
            assert.doesNotThrow(function () {
                ctrl.Manage();
            });

            // submit() does NOT catch – but toArray absorbs the error and returns []
            // So submit itself doesn't crash from getAllowedLocalesArray,
            // but the result is WRONG (empty locales) - a SILENT failure
            assert.doesNotThrow(function () {
                ctrl.Submit();
            }, 'submit() does not crash because toArray absorbs errors');

            // Verify the SILENT BUG: locales are silently emptied
            var data = b.isml.renderTemplate.secondCall.args[1];
            assert.deepEqual(data.allowedLocales, [], 'BUG: allowedLocales silently becomes empty');
            assert.deepEqual(data.selectedLocales, [], 'BUG: selectedLocales silently emptied because allowedLocales is empty');
        });

        it('manage() should show error message when OCAPI fails, not crash', function () {
            var site = createSiteMock();
            var b = buildStubs(site, {
                cacheMgr: {
                    getCache: function () {
                        return {
                            get: function () {
                                throw new Error('OCAPI auth failed');
                            },
                            invalidate: function () {}
                        };
                    }
                }
            });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.isFalse(data.success);
            assert.include(data.errorMessage, 'OCAPI auth failed');
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // 4. updateLocale() – LOCALE SELECTION LOGIC
    //    Tests the exact merchant scenario: selecting/deselecting locales
    // ─────────────────────────────────────────────────────────────────

    describe('updateLocale() – locale selection logic', function () {
        var ctrl,
            isml,
            site;

        beforeEach(function () {
            site = createSiteMock({
                preferenceValues: {
                    lengowSeletedLocales: ['en_US']
                }
            });
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);
        });

        it('should ADD a locale when checked=true and locale is allowed', function () {
            global.request.httpParameterMap.localeID.value = 'fr_FR';
            global.request.httpParameterMap.checked.value = 'true';

            ctrl.UpdateLocale();

            var data = isml.renderTemplate.firstCall.args[1];
            assert.include(data.selectedLocales, 'fr_FR', 'fr_FR should be added');
            assert.include(data.selectedLocales, 'en_US', 'en_US should still be there');
        });

        it('should REMOVE a locale when checked=false', function () {
            global.request.httpParameterMap.localeID.value = 'en_US';
            global.request.httpParameterMap.checked.value = 'false';

            ctrl.UpdateLocale();

            var data = isml.renderTemplate.firstCall.args[1];
            assert.notInclude(data.selectedLocales, 'en_US', 'en_US should be removed');
        });

        it('should NOT add a locale that is NOT in allowedLocales', function () {
            global.request.httpParameterMap.localeID.value = 'xx_XX';
            global.request.httpParameterMap.checked.value = 'true';

            ctrl.UpdateLocale();

            var data = isml.renderTemplate.firstCall.args[1];
            assert.notInclude(data.selectedLocales, 'xx_XX', 'invalid locale should not be added');
        });

        it('should NOT duplicate a locale that is already selected', function () {
            global.request.httpParameterMap.localeID.value = 'en_US';
            global.request.httpParameterMap.checked.value = 'true';

            ctrl.UpdateLocale();

            var data = isml.renderTemplate.firstCall.args[1];
            var count = data.selectedLocales.filter(function (l) { return l === 'en_US'; }).length;
            assert.equal(count, 1, 'en_US should appear only once');
        });

        it('should persist updated locales to preference store', function () {
            global.request.httpParameterMap.localeID.value = 'fr_FR';
            global.request.httpParameterMap.checked.value = 'true';

            ctrl.UpdateLocale();

            assert.include(site.preferences.custom.lengowSeletedLocales, 'fr_FR');
            assert.include(site.preferences.custom.lengowSeletedLocales, 'en_US');
        });

        it('should render localedropdown template with isAjax=true', function () {
            ctrl.UpdateLocale();
            var args = isml.renderTemplate.firstCall.args;
            assert.equal(args[0], 'lengow/tabs/localedropdown');
            assert.isTrue(args[1].isAjax);
        });

        it('should filter out invalid locales from existing selectedLocales before processing', function () {
            site.preferences.custom.lengowSeletedLocales = ['en_US', 'stale_XX'];
            var b = buildStubs(site);
            isml = b.isml;
            ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            global.request.httpParameterMap.localeID.value = 'fr_FR';
            global.request.httpParameterMap.checked.value = 'true';

            ctrl.UpdateLocale();

            var data = isml.renderTemplate.firstCall.args[1];
            assert.notInclude(data.selectedLocales, 'stale_XX', 'stale locale should be cleaned up');
            assert.include(data.selectedLocales, 'en_US');
            assert.include(data.selectedLocales, 'fr_FR');
        });
    });

    describe('updateLocale() – BUG: missing error handling (no try-catch)', function () {
        it('should NOT crash if getAllowedLocalesArray returns empty (toArray absorbs errors)', function () {
            // toArray() catches all errors internally and returns []
            // So updateLocale() doesn't crash, but SILENTLY fails
            var site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    return new Proxy({}, {
                        get: function () {
                            throw new TypeError('Java interop error in GraalJS');
                        }
                    });
                }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            // Does NOT crash – toArray absorbs the error
            assert.doesNotThrow(function () {
                ctrl.UpdateLocale();
            });

            // But the result is WRONG – locale was NOT added
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.deepEqual(data.allowedLocales, [], 'allowedLocales is empty due to absorbed error');
            assert.deepEqual(data.selectedLocales, [], 'selectedLocales filtered to nothing');
        });

        it('should CRASH if Transaction.wrap throws (no try-catch)', function () {
            var site = createSiteMock();
            var b = buildStubs(site, {
                transaction: {
                    wrap: function () {
                        throw new Error('Transaction failed: type mismatch for set-of-string');
                    }
                }
            });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            assert.throws(function () {
                ctrl.UpdateLocale();
            }, /Transaction failed/, 'updateLocale() crashes on Transaction error');
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // 5. EDGE CASES – null/empty/undefined preference values
    // ─────────────────────────────────────────────────────────────────

    describe('Edge cases – null/empty preferences', function () {
        it('manage() should handle null lengowSeletedLocales gracefully', function () {
            var site = createSiteMock({
                preferenceValues: { lengowSeletedLocales: null }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            assert.doesNotThrow(function () {
                ctrl.Manage();
            });
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.isArray(data.selectedLocales);
            assert.lengthOf(data.selectedLocales, 0);
        });

        it('manage() should handle empty string lengowMandatoryAttributes', function () {
            var site = createSiteMock({
                preferenceValues: {
                    lengowMandatoryAttributes: '',
                    lengowAdditionalAttributes: ''
                }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            assert.doesNotThrow(function () {
                ctrl.Manage();
            });
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.deepEqual(data.lengowMandatoryAttributesArray, []);
            assert.deepEqual(data.lengowAdditionalAttributesArray, []);
        });

        it('manage() should handle malformed JSON in attributes preference', function () {
            var site = createSiteMock({
                preferenceValues: {
                    lengowMandatoryAttributes: '{invalid json',
                    lengowAdditionalAttributes: null
                }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            assert.doesNotThrow(function () {
                ctrl.Manage();
            });
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.deepEqual(data.lengowMandatoryAttributesArray, []);
        });

        it('updateLocale() should handle null lengowSeletedLocales (first time use)', function () {
            var site = createSiteMock({
                preferenceValues: { lengowSeletedLocales: null }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            global.request.httpParameterMap.localeID.value = 'en_US';
            global.request.httpParameterMap.checked.value = 'true';

            assert.doesNotThrow(function () {
                ctrl.UpdateLocale();
            });
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.include(data.selectedLocales, 'en_US');
        });

        it('updateLocale() should handle undefined lengowSeletedLocales', function () {
            var site = createSiteMock({
                preferenceValues: { lengowSeletedLocales: undefined }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            global.request.httpParameterMap.localeID.value = 'fr_FR';
            global.request.httpParameterMap.checked.value = 'true';

            assert.doesNotThrow(function () {
                ctrl.UpdateLocale();
            });
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.include(data.selectedLocales, 'fr_FR');
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // 6. SystemObjectMgr – getProductSystemObjectDefinitions
    // ─────────────────────────────────────────────────────────────────

    describe('getProductSystemObjectDefinitions – SystemObjectMgr', function () {
        it('should filter out image and thumbnail from product attributes', function () {
            var site = createSiteMock();
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();
            var data = b.isml.renderTemplate.firstCall.args[1];
            var ids = data.productSystemObjectDefinitions.attributes.map(function (a) { return a.id; });
            assert.notInclude(ids, 'image');
            assert.notInclude(ids, 'thumbnail');
            assert.equal(ids.length, 3); // ID, name, brand
        });

        it('should map valueTypeCode to human-readable valueTypeName', function () {
            var site = createSiteMock();
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();
            var data = b.isml.renderTemplate.firstCall.args[1];
            var nameAttr = data.productSystemObjectDefinitions.attributes.find(function (a) { return a.id === 'name'; });
            assert.equal(nameAttr.valueTypeName, 'String');
        });

        it('should return success:false and invalidate cache when SystemObjectMgr throws', function () {
            var cacheInvalidated = false;
            var site = createSiteMock();
            var b = buildStubs(site, {
                cacheMgr: {
                    getCache: function () {
                        return {
                            get: function (_key, callback) { return callback(); },
                            invalidate: function () { cacheInvalidated = true; }
                        };
                    }
                },
                systemObjectMgr: {
                    describe: function () {
                        throw new Error('SystemObjectMgr unavailable');
                    }
                }
            });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();
            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.isFalse(data.success);
            assert.isTrue(cacheInvalidated, 'cache should be invalidated on failure');
        });
    });

    // ─────────────────────────────────────────────────────────────────
    // 7. MERCHANT BUG SCENARIO – PCMT-1351 – SFCC 25.10 (GraalJS)
    //    Reproducing: "can't save attributes" + "can't select locale"
    // ─────────────────────────────────────────────────────────────────

    describe('PCMT-1351 Merchant Bug – SFCC 25.10 scenarios', function () {
        it('Scenario 1: OCAPI fails during submit() → merchant thinks save failed but data was actually saved', function () {
            // This is the most likely bug scenario:
            // 1. manage() works (OCAPI result is cached on first load)
            // 2. Merchant selects attributes and clicks Save
            // 3. submit() saves data (Transaction.wrap succeeds)
            // 4. submit() calls getProductSystemObjectDefinitions() → cache expired → OCAPI fails
            // 5. submit() THROWS (no try-catch) → AJAX gets 500
            // 6. Merchant sees "An error occurred while saving attributes"
            // 7. Data WAS saved but merchant doesn't know

            var firstCall = true;
            var site = createSiteMock();
            var b = buildStubs(site, {
                cacheMgr: {
                    getCache: function () {
                        return {
                            get: function (_key, callback) {
                                if (firstCall) {
                                    firstCall = false;
                                    return callback(); // First call succeeds (manage)
                                }
                                throw new Error('Cache expired, OCAPI re-call fails');
                            },
                            invalidate: function () {}
                        };
                    }
                }
            });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            // manage() works (first call, cache populated)
            assert.doesNotThrow(function () {
                ctrl.Manage();
            });

            // submit() CRASHES on second call
            global.request.httpParameterMap.type.stringValue = 'mandatory';
            global.request.httpParameterMap.attributesJSON.stringValue = '{"system":[{"id":"name"}],"custom":[]}';

            assert.throws(function () {
                ctrl.Submit();
            }, /Cache expired/, 'submit() crashes because cache expired and OCAPI fails, and there is no try-catch');

            // But the data WAS saved before the crash
            assert.equal(
                site.preferences.custom.lengowMandatoryAttributes,
                '{"system":[{"id":"name"}],"custom":[]}',
                'Data was actually saved before the crash, but merchant does not know'
            );
        });

        it('Scenario 2: toArray returns empty array for unhandled Java type → all locales filtered out', function () {
            // If toArray can't convert getAllowedLocales() result → returns []
            // Then selectedLocales.filter() removes ALL locales (none are "allowed")
            // The locale dropdown shows "0 Locales Selected"
            // Clicking a locale: allowedLocales.indexOf(localeID) is always -1 → nothing happens

            var site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    return 42; // non-null, not array, not iterable, no length
                },
                preferenceValues: { lengowSeletedLocales: ['en_US', 'fr_FR'] }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();
            var data = b.isml.renderTemplate.firstCall.args[1];

            // allowedLocales is empty → all selectedLocales are filtered out!
            assert.deepEqual(data.allowedLocales, [], 'toArray returns [] for unhandled type');
            assert.deepEqual(data.selectedLocales, [], 'ALL locales are removed because none are "allowed"');
        });

        it('Scenario 3: updateLocale() with empty allowedLocales → locale can never be added', function () {
            var site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    return 42; // unhandled → toArray returns []
                },
                preferenceValues: { lengowSeletedLocales: [] }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            global.request.httpParameterMap.localeID.value = 'en_US';
            global.request.httpParameterMap.checked.value = 'true';

            ctrl.UpdateLocale();
            var data = b.isml.renderTemplate.firstCall.args[1];

            assert.notInclude(data.selectedLocales, 'en_US',
                'Locale cannot be added when allowedLocales is empty');
        });

        it('Scenario 4: GraalJS Java String comparison issue – indexOf fails with strict equality', function () {
            // In GraalJS, Array.from(javaStringArray) might produce Java String objects
            // which are objects, not primitives. indexOf uses === which fails for
            // object-wrapped strings vs primitive strings.

            function JavaString(val) {
                this._val = val;
                this.toString = function () { return val; };
                this.valueOf = function () { return val; };
            }

            var site = createSiteMock({
                getAllowedLocalesReturn: function () {
                    // Simulate toArray producing wrapper objects instead of primitive strings
                    return [new JavaString('en_US'), new JavaString('fr_FR'), new JavaString('de_DE')];
                },
                preferenceValues: {
                    lengowSeletedLocales: [new JavaString('en_US')]
                }
            });
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            global.request.httpParameterMap.localeID.value = 'fr_FR'; // JS primitive string
            global.request.httpParameterMap.checked.value = 'true';

            ctrl.UpdateLocale();
            var data = b.isml.renderTemplate.firstCall.args[1];

            // indexOf uses === (strict equality)
            // JavaString('en_US') === 'en_US' is FALSE (object !== primitive)
            // So selectedLocales.filter() removes everything!
            // And allowedLocales.indexOf('fr_FR') returns -1 → locale not added!

            // Verify the bug: fr_FR should NOT have been added because indexOf fails
            var frFound = data.selectedLocales.indexOf('fr_FR') >= 0;
            var frFoundViaString = data.selectedLocales.some(function (l) {
                return String(l) === 'fr_FR';
            });

            // If strict equality fails (object !== primitive), locale cannot be added
            assert.isFalse(frFound,
                'BUG CONFIRMED: indexOf("fr_FR") fails because array contains JavaString objects, not primitive strings');
            assert.isFalse(frFoundViaString,
                'Locale was never added to the array at all because allowedLocales.indexOf(localeID) returned -1');
        });

        it('Scenario 5: manage() shows error message when SystemObjectMgr fails', function () {
            var site = createSiteMock();
            var resourceMessages = {
                'api.error.occured': 'An error occurred'
            };
            var b = buildStubs(site, {
                resource: {
                    msg: function (key) {
                        return resourceMessages[key] || key;
                    }
                },
                systemObjectMgr: {
                    describe: function () {
                        throw new Error('SystemObjectMgr unavailable');
                    }
                }
            });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();
            var data = b.isml.renderTemplate.firstCall.args[1];

            assert.isFalse(data.success);
            assert.isString(data.errorMessage);
            assert.ok(data.errorMessage.length > 0, 'errorMessage should not be empty');
        });
    });
    describe('CSRF protection', function () {
        var rejectingCsrf = {
            generateToken: function () { return 'test-csrf-token'; },
            getTokenName: function () { return 'test_csrf_name'; },
            validateRequest: function () { return false; }
        };

        it('should hand a CSRF token to the Manage template so the client can echo it back', function () {
            var site = createSiteMock({});
            var b = buildStubs(site);
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            ctrl.Manage();

            var data = b.isml.renderTemplate.firstCall.args[1];
            assert.equal(data.csrfToken, 'test-csrf-token');
            // The name travels with the token: validateRequest() looks the parameter up by
            // the name the platform reports, so the client must not hard-code 'csrf_token'.
            assert.equal(data.csrfTokenName, 'test_csrf_name');
        });

        it('should refuse Submit and write nothing when the token is invalid', function () {
            var site = createSiteMock({
                preferenceValues: { lengowMandatoryAttributes: '{"system":[],"custom":[]}' }
            });
            var b = buildStubs(site, { csrfProtection: rejectingCsrf });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            global.request = {
                httpParameterMap: {
                    type: { stringValue: 'mandatory' },
                    attributesJSON: { stringValue: '{"system":[{"id":"EAN"}],"custom":[]}' }
                }
            };

            ctrl.Submit();

            assert.equal(b.isml.renderTemplate.firstCall.args[0], 'lengow/csrffailure');
            assert.equal(
                site.preferences.custom.lengowMandatoryAttributes,
                '{"system":[],"custom":[]}',
                'the forged request must not have written the preference'
            );
            delete global.request;
        });

        it('should refuse UpdateLocale and write nothing when the token is invalid', function () {
            var site = createSiteMock({ preferenceValues: { lengowSeletedLocales: ['en_US'] } });
            var b = buildStubs(site, { csrfProtection: rejectingCsrf });
            var ctrl = proxyquire('bm_lengow/cartridge/controllers/LengowController', b.stubs);

            global.request = {
                httpParameterMap: {
                    localeID: { value: 'fr_FR' },
                    checked: { value: 'true' }
                }
            };

            ctrl.UpdateLocale();

            assert.equal(b.isml.renderTemplate.firstCall.args[0], 'lengow/csrffailure');
            assert.deepEqual(
                site.preferences.custom.lengowSeletedLocales,
                ['en_US'],
                'the forged request must not have changed the selected locales'
            );
            delete global.request;
        });
    });
});
