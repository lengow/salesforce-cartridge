'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
var setCatalogFeedLocale;

describe('cartridge/models/lengow/decorators: setCatalogFeedLocale.js', function () {
    before(function () {
        setCatalogFeedLocale = proxyquire('int_lengow/cartridge/models/lengow/decorators/setCatalogFeedLocale', {});
    });

    beforeEach(function () {
        global.empty = function (val) {
            return val === undefined || val === null || val === '';
        };
        global.request = {
            setLocale: sinon.stub()
        };
    });

    afterEach(function () {
        delete global.empty;
        delete global.request;
    });

    it('should Set locale when localeID is provided', function () {
        var object = {};
        setCatalogFeedLocale(object);
        object.setCatalogFeedLocale('en_US');
        assert.isTrue(global.request.setLocale.calledOnce);
        assert.isTrue(global.request.setLocale.calledWith('en_US'));
    });

    it('should not set locale when localeID is empty', function () {
        var object = {};
        setCatalogFeedLocale(object);
        object.setCatalogFeedLocale('');
        assert.isFalse(global.request.setLocale.called);
    });

    it('should not set locale when localeID is null', function () {
        var object = {};
        setCatalogFeedLocale(object);
        object.setCatalogFeedLocale(null);
        assert.isFalse(global.request.setLocale.called);
    });

    it('should not set locale when localeID is undefined', function () {
        var object = {};
        setCatalogFeedLocale(object);
        object.setCatalogFeedLocale(undefined);
        assert.isFalse(global.request.setLocale.called);
    });
});
