'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var createCSVFile;

function File() {
    this.exists = function () {
        return true;
    };
    this.mkdirs = function () {
        return true;
    };
    this.fullPath = 'impex/src/lengow/';
}

File.SEPARATOR = ',';
File.IMPEX = '/impex/';
File.getRootDirectory = function () {
    return '/impex/';
};

describe('cartridge/models/lengow/decorators: createCSVFile.js', function () {
    global.Error = emptyStub;

    before(function () {
        createCSVFile = proxyquire('int_lengow/cartridge/models/lengow/decorators/createCSVFile', {
            'dw/util/StringUtils': {
                formatCalendar: function () {
                    return '28_02_2022';
                }
            },
            'dw/util/Calendar': function () {
                return {};
            },
            'dw/io/File': File
        });
    });

    afterEach(function () {
        global.Error.reset();
    });

    it('should Create CSV File', function () {
        var object = {
            config: {
                impexFolderName: 'lengow',
                fileName: 'lengow',
                siteID: 'MFRA',
                timeStamp: false
            },
            logger: {
                info: emptyStub
            }
        };
        createCSVFile(object);
        object.createCSVFile('en_US');
    });
});
