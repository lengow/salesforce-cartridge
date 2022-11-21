'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var createFileWriter;

function FileWriter(csvFile) {
    this.filewriter = csvFile;
}


describe('cartridge/models/lengow/decorators: createFileWriter.js', function () {
    before(function () {
        createFileWriter = proxyquire('int_lengow/cartridge/models/lengow/decorators/createFileWriter', {
            'dw/io/FileWriter': FileWriter
        });
    });

    it('should Create File Writer', function () {
        var object = {};
        createFileWriter(object);
        object.createFileWriter({});
    });
});
