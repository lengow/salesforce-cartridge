'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
var setCurrencyCode;

var countriesConfig = [
    { id: 'en_US', currencyCode: 'USD' },
    { id: 'fr_FR', currencyCode: 'EUR' }
];

describe('cartridge/models/lengow/decorators: setCurrencyCode.js', function () {
    beforeEach(function () {
        global.session = {
            setCurrency: sinon.stub()
        };
    });

    afterEach(function () {
        delete global.session;
    });

    describe('with valid locale', function () {
        before(function () {
            setCurrencyCode = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCurrencyCode', {
                'dw/system/Transaction': {
                    wrap: function (callBack) { return callBack.call(); }
                },
                'dw/util/Locale': {
                    getLocale: function (localeID) {
                        return { ID: localeID };
                    }
                },
                'dw/util/Currency': {
                    getCurrency: function (code) { return { code: code }; }
                },
                '*/cartridge/config/countries': countriesConfig
            });
        });

        it('should Set Currency Code for matching locale', function () {
            var object = {};
            setCurrencyCode(object);
            object.setCurrencyCode('en_US');
            assert.isTrue(global.session.setCurrency.calledOnce);
        });

        it('should Set Currency Code for fr_FR locale', function () {
            var object = {};
            setCurrencyCode(object);
            object.setCurrencyCode('fr_FR');
            assert.isTrue(global.session.setCurrency.calledOnce);
        });
    });

    describe('with null locale (fallback to first country)', function () {
        before(function () {
            setCurrencyCode = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCurrencyCode', {
                'dw/system/Transaction': {
                    wrap: function (callBack) { return callBack.call(); }
                },
                'dw/util/Locale': {
                    getLocale: function () {
                        return null; // Simulate null locale
                    }
                },
                'dw/util/Currency': {
                    getCurrency: function (code) { return { code: code }; }
                },
                '*/cartridge/config/countries': countriesConfig
            });
        });

        it('should use first country when locale is null', function () {
            var object = {};
            setCurrencyCode(object);
            object.setCurrencyCode('unknown');
            assert.isTrue(global.session.setCurrency.calledOnce);
        });
    });

    describe('locale absent from countries.json', function () {
        before(function () {
            setCurrencyCode = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCurrencyCode', {
                'dw/system/Transaction': {
                    wrap: function (callBack) { return callBack.call(); }
                },
                'dw/util/Locale': {
                    getLocale: function (localeID) { return { ID: localeID }; }
                },
                'dw/util/Currency': {
                    getCurrency: function (code) { return { code: code }; }
                },
                '*/cartridge/config/countries': countriesConfig
            });
        });

        it('should warn and report failure instead of failing silently', function () {
            var warnStub = sinon.stub();
            var object = { logger: { warn: warnStub } };
            setCurrencyCode(object);

            var result = object.setCurrencyCode('ja_JP');

            assert.isFalse(result, 'should report that the currency was not applied');
            assert.isTrue(global.session.setCurrency.notCalled, 'should not touch the session currency');
            assert.isTrue(warnStub.calledOnce, 'should log a warning');
            assert.include(warnStub.firstCall.args[0], 'countries.json');
        });
    });

    describe('currency not allowed on the site', function () {
        before(function () {
            setCurrencyCode = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCurrencyCode', {
                'dw/system/Transaction': {
                    wrap: function (callBack) { return callBack.call(); }
                },
                'dw/util/Locale': {
                    getLocale: function (localeID) { return { ID: localeID }; }
                },
                'dw/util/Currency': {
                    getCurrency: function () {
                        throw new Error('Currency EUR is not allowed for this site');
                    }
                },
                '*/cartridge/config/countries': countriesConfig
            });
        });

        it('should warn and report failure rather than swallowing the exception', function () {
            var warnStub = sinon.stub();
            var object = { logger: { warn: warnStub } };
            setCurrencyCode(object);

            var result = object.setCurrencyCode('fr_FR');

            assert.isFalse(result, 'should report that the currency was not applied');
            assert.isTrue(warnStub.calledOnce, 'should log a warning');
            assert.include(warnStub.firstCall.args[0], 'Allowed Currencies');
        });
    });

    describe('without a logger on the object', function () {
        before(function () {
            setCurrencyCode = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCurrencyCode', {
                'dw/system/Transaction': {
                    wrap: function (callBack) { return callBack.call(); }
                },
                'dw/util/Locale': {
                    getLocale: function (localeID) { return { ID: localeID }; }
                },
                'dw/util/Currency': {
                    getCurrency: function (code) { return { code: code }; }
                },
                '*/cartridge/config/countries': countriesConfig
            });
        });

        it('should not blow up when there is nothing to log to', function () {
            var object = {};
            setCurrencyCode(object);
            assert.doesNotThrow(function () { object.setCurrencyCode('ja_JP'); });
        });
    });
});
