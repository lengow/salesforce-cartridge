'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var assert = require('chai').assert;
var customField;

// Stub classes for instanceof checks
function MarkupText(val) { this.value = val; }
function EnumValue(val) { this.value = val; }
function MediaFile(url) { this.httpURL = url; }
function Quantity(val) { this.value = val; }

var product = {
    name: 'Lengow Product',
    custom: {
        brand: 'Lengow'
    },
    getAvailabilityModel: function () {
        return {
            isInStock: function () { return true; }
        };
    }
};

describe('cartridge/models/lengow: customField.js', function () {
    before(function () {
        customField = proxyquire('int_lengow/cartridge/models/lengow/customField', {
            'dw/content/MarkupText': MarkupText,
            'dw/util/StringUtils': {
                formatCalendar: function () {
                    return '11/03/2026 10:30:00';
                }
            },
            'dw/util/Calendar': function () { return {}; },
            'dw/value/EnumValue': EnumValue,
            'dw/content/MediaFile': MediaFile,
            'dw/value/Quantity': Quantity,
            '*/cartridge/scripts/helpers/productType': {
                getProductType: function () { return 'master'; }
            },
            '*/cartridge/scripts/helpers/category': {
                getCategory: function () { return 'Electronics'; }
            },
            '*/cartridge/scripts/helpers/inventory': {
                getInventoryStatus: function () { return 'IN_STOCK'; },
                getInventoryLevel: function () { return 10; }
            },
            '*/cartridge/scripts/helpers/price': {
                getPrice: function () { return 29.99; }
            },
            '*/cartridge/scripts/helpers/productUrl': {
                getProductURL: function () { return 'https://example.com/product'; }
            },
            '*/cartridge/scripts/helpers/imageUrl': {
                getImageURL: function () { return 'https://example.com/image.jpg'; }
            }
        });
    });

    beforeEach(function () {
        global.empty = emptyStub;
        global.request = {
            setLocale: emptyStub
        };
        global.session = {
            currency: {
                currencyCode: 'EUR'
            }
        };
    });

    afterEach(function () {
        emptyStub.reset();
        delete global.empty;
        delete global.request;
        delete global.session;
    });

    // --- getAttributeValue branches ---
    it('should Get Product Attribute Value (string)', function () {
        var attrObject = { id: 'name' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'Lengow Product');
    });

    it('should Get Product Custom Attribute Value', function () {
        var attrObject = { id: 'brand' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'Lengow');
    });

    it('should return isInStock for "available" attribute', function () {
        var attrObject = { id: 'available' };
        var attValue = customField(product, attrObject);
        assert.isTrue(attValue);
    });

    it('should handle Array attribute value', function () {
        var productWithArray = {
            tags: ['red', 'blue', 'green'],
            custom: {}
        };
        var attrObject = { id: 'tags' };
        var attValue = customField(productWithArray, attrObject);
        assert.equal(attValue, 'red, blue, green');
    });

    it('should handle MarkupText attribute value (returns it directly)', function () {
        var markupVal = new MarkupText('<b>Hello</b>');
        var productWithMarkup = {
            description: markupVal,
            custom: {}
        };
        var attrObject = { id: 'description' };
        var attValue = customField(productWithMarkup, attrObject);
        assert.equal(attValue, markupVal);
    });

    it('should handle MediaFile attribute value', function () {
        var mediaVal = new MediaFile('https://example.com/media.jpg');
        var productWithMedia = {
            mediaField: mediaVal,
            custom: {}
        };
        var attrObject = { id: 'mediaField' };
        var attValue = customField(productWithMedia, attrObject);
        assert.equal(attValue, 'https://example.com/media.jpg');
    });

    it('should handle EnumValue attribute value', function () {
        var enumVal = new EnumValue('SIZE_L');
        var productWithEnum = {
            sizeEnum: enumVal,
            custom: {}
        };
        var attrObject = { id: 'sizeEnum' };
        var attValue = customField(productWithEnum, attrObject);
        assert.equal(attValue, 'SIZE_L');
    });

    it('should handle Quantity attribute value', function () {
        var qtyVal = new Quantity(5);
        var productWithQty = {
            weight: qtyVal,
            custom: {}
        };
        var attrObject = { id: 'weight' };
        var attValue = customField(productWithQty, attrObject);
        assert.equal(attValue, 5);
    });

    it('should handle Date attribute value', function () {
        var dateVal = new Date('2026-03-11');
        var productWithDate = {
            creationDate: dateVal,
            custom: {}
        };
        var attrObject = { id: 'creationDate' };
        var attValue = customField(productWithDate, attrObject);
        assert.equal(attValue, '11/03/2026 10:30:00');
    });

    it('should handle null attribute value', function () {
        var productWithNull = {
            nullField: null,
            custom: {}
        };
        var attrObject = { id: 'nullField' };
        var attValue = customField(productWithNull, attrObject);
        assert.equal(attValue, '');
    });

    it('should handle unknown object attribute (no matching instanceof)', function () {
        var unknownObj = { foo: 'bar' };
        var productWithUnknown = {
            unknownAttr: unknownObj,
            custom: {}
        };
        var attrObject = { id: 'unknownAttr' };
        var attValue = customField(productWithUnknown, attrObject);
        assert.equal(attValue, '');
    });

    // --- switch cases ---
    it('should return productType via helper', function () {
        var attrObject = { id: 'productType' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'master');
    });

    it('should return category via helper', function () {
        var attrObject = { id: 'category' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'Electronics');
    });

    it('should return inventory_status via helper', function () {
        var attrObject = { id: 'inventory_status' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'IN_STOCK');
    });

    it('should return inventory_level via helper', function () {
        var attrObject = { id: 'inventory_level' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 10);
    });

    it('should return sale_price via helper', function () {
        var attrObject = { id: 'sale_price' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 29.99);
    });

    it('should return currencyCode from session', function () {
        var attrObject = { id: 'currencyCode' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'EUR');
    });

    it('should return productURL via helper', function () {
        var attrObject = { id: 'productURL' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'https://example.com/product');
    });

    it('should return imageURL via helper', function () {
        var attrObject = { id: 'imageURL' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, 'https://example.com/image.jpg');
    });

    it('should return default empty string for unknown attribute', function () {
        var attrObject = { id: 'unknownSwitch', value_type: 'string' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, '');
    });

    it('should return false for unknown boolean attribute (getDefaultValue)', function () {
        var attrObject = { id: 'unknownBool', value_type: 'boolean' };
        var attValue = customField(product, attrObject);
        assert.equal(attValue, false);
    });

    it('should handle custom attribute with Array value', function () {
        var productWithCustomArray = {
            custom: {
                colors: ['red', 'green']
            }
        };
        var attrObject = { id: 'colors' };
        var attValue = customField(productWithCustomArray, attrObject);
        assert.equal(attValue, 'red, green');
    });
});
