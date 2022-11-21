'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var setCurrencyCode;

var countriesConfig = [{
    id: 'en_US',
    currencyCode: 'USD'
}];

describe('cartridge/models/lengow/decorators: setCurrencyCode.js', function () {
    global.session = {
        setCurrency: emptyStub
    };

    before(function () {
        setCurrencyCode = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCurrencyCode', {
            'dw/system/Transaction': {
                wrap: function (callBack) {
                    return callBack.call();
                },
                begin: function () {},
                commit: function () {}
            },
            'dw/util/Locale': {
                getLocale: function (localeID) {
                    return {
                        ID: localeID,
                        currencyCode: 'USD'
                    };
                }
            },
            'dw/util/Currency': {
                getCurrency: function () {
                    return {};
                }
            },
            '*/cartridge/config/countries': countriesConfig
        });
    });

    afterEach(function () {
        global.session.setCurrency.reset();
    });

    it('should Set Currency Code', function () {
        var object = {};
        setCurrencyCode(object);
        object.setCurrencyCode('en_US');
    });
});
