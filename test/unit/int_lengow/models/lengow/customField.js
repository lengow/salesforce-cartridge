'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var assert = require('chai').assert;
var customField;

var product = {
    name: 'Lengow Product',
    custom: {
        brand: 'Lengow'
    }
};

describe('cartridge/models/lengow: customField.js', function () {
    global.empty = emptyStub;
    global.request = {
        setLocale: emptyStub
    };

    before(function () {
        customField = proxyquire('int_lengow/cartridge/models/lengow/customField', {
            'dw/content/MarkupText': {},
            'dw/util/StringUtils': {},
            'dw/util/Calendar': {},
            'dw/value/EnumValue': {},
            'dw/content/MediaFile': {},
            'dw/value/Quantity': {}
        });
    });

    afterEach(function () {
        global.empty.reset();
        global.request.setLocale.reset();
    });

    it('should Get Product Attribute Value', function () {
        var attrObject = {
            id: 'name'
        };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'Lengow Product');
    });

    it('should Get Product Custom Attribute Value', function () {
        var attrObject = {
            id: 'brand'
        };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'Lengow');
    });
});
