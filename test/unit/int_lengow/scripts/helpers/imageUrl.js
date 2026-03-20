'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var imageUrl;

describe('int_lengow/cartridge/scripts/helpers: imageUrl.js', function () {
    before(function () {
        imageUrl = proxyquire('int_lengow/cartridge/scripts/helpers/imageUrl', {});
    });

    it('should return the HTTPS URL of the first large image', function () {
        var product = {
            getImages: function (viewType) {
                if (viewType === 'large') {
                    return [{
                        httpsURL: { toString: function () { return 'https://example.com/image1.jpg'; } }
                    }];
                }
                return [];
            }
        };
        assert.equal(imageUrl.getImageURL(product), 'https://example.com/image1.jpg');
    });

    it('should return empty string when no large images exist', function () {
        var product = {
            getImages: function () { return []; }
        };
        assert.equal(imageUrl.getImageURL(product), '');
    });
});

