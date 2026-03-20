'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var productUrl;

describe('int_lengow/cartridge/scripts/helpers: productUrl.js', function () {
    before(function () {
        productUrl = proxyquire('int_lengow/cartridge/scripts/helpers/productUrl', {
            'dw/web/URLUtils': {
                https: function (action, param, value) {
                    return {
                        toLocaleString: function () {
                            return 'https://example.com/' + action + '?' + param + '=' + value;
                        }
                    };
                }
            }
        });
    });

    it('should return product URL using URLUtils.https', function () {
        var product = { ID: 'prod-123' };
        var url = productUrl.getProductURL(product);
        assert.include(url, 'Product-Show');
        assert.include(url, 'pid=prod-123');
    });
});

