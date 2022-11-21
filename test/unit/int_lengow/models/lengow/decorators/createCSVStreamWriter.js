'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var createCSVStreamWriter;

function CSVStreamWriter() {
    this.constructorname = 'CSVStreamWriter';
}


describe('cartridge/models/lengow/decorators: createCSVStreamWriter.js', function () {
    before(function () {
        createCSVStreamWriter = proxyquire('int_lengow/cartridge/models/lengow/decorators/createCSVStreamWriter', {
            'dw/io/CSVStreamWriter': CSVStreamWriter
        });
    });

    it('should Create CSV Stream Writer', function () {
        var object = {};
        createCSVStreamWriter(object);
        object.createCSVStreamWriter({});
    });
});
