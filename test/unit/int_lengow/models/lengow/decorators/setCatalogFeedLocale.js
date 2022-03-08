'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var setCatalogFeedLocale;

describe('cartridge/models/lengow/decorators: setCatalogFeedLocale.js', function () {
    global.empty = emptyStub;
    global.request = {
        setLocale: emptyStub
    };

    before(function () {
        setCatalogFeedLocale = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCatalogFeedLocale', {});
    });

    afterEach(function () {
        global.empty.reset();
        global.request.setLocale.reset();
    });

    it('should Set locale', function () {
        var object = {};
        setCatalogFeedLocale(object);
        object.setCatalogFeedLocale('en_us');
    });
});
