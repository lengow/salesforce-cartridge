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
});
