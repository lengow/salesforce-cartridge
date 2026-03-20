'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var category;

describe('int_lengow/cartridge/scripts/helpers: category.js', function () {
    before(function () {
        category = proxyquire('int_lengow/cartridge/scripts/helpers/category', {});
    });

    it('should return primaryCategory ID when product has a primaryCategory', function () {
        var product = {
            primaryCategory: { ID: 'cat-primary' },
            allCategories: { size: function () { return 0; } }
        };
        assert.equal(category.getCategory(product), 'cat-primary');
    });

    it('should return masterProduct primaryCategory ID when product has no primaryCategory but masterProduct does', function () {
        var product = {
            primaryCategory: null,
            masterProduct: {
                primaryCategory: { ID: 'cat-master-primary' },
                allCategories: { size: function () { return 0; } }
            },
            allCategories: { size: function () { return 0; } }
        };
        assert.equal(category.getCategory(product), 'cat-master-primary');
    });

    it('should return first allCategories ID when no primaryCategory exists', function () {
        var product = {
            primaryCategory: null,
            allCategories: {
                size: function () { return 1; },
                iterator: function () {
                    var items = [{ ID: 'cat-all-first' }];
                    var idx = 0;
                    return {
                        hasNext: function () { return idx < items.length; },
                        next: function () { return items[idx++]; }
                    };
                }
            }
        };
        assert.equal(category.getCategory(product), 'cat-all-first');
    });

    it('should return masterProduct first allCategories ID as last fallback', function () {
        var product = {
            primaryCategory: null,
            masterProduct: {
                primaryCategory: null,
                allCategories: {
                    size: function () { return 1; },
                    iterator: function () {
                        var items = [{ ID: 'cat-master-all' }];
                        var idx = 0;
                        return {
                            hasNext: function () { return idx < items.length; },
                            next: function () { return items[idx++]; }
                        };
                    }
                }
            },
            allCategories: { size: function () { return 0; } }
        };
        assert.equal(category.getCategory(product), 'cat-master-all');
    });

    it('should return empty string when no category is found', function () {
        var product = {
            primaryCategory: null,
            allCategories: { size: function () { return 0; } }
        };
        assert.equal(category.getCategory(product), '');
    });
});

