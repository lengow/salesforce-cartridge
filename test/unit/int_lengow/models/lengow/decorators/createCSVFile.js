'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
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
    describe('basic file creation without timestamp', function () {
        before(function () {
            createCSVFile = proxyquire('int_lengow/cartridge/models/lengow/decorators/createCSVFile', {
                'dw/util/StringUtils': {
                    formatCalendar: function () {
                        return '28_02_2022';
                    }
                },
                'dw/util/Calendar': function () { return {}; },
                'dw/io/File': File
            });
        });

        it('should Create CSV File without timestamp', function () {
            var object = {
                config: {
                    impexFolderName: 'lengow',
                    fileName: 'lengow',
                    siteID: 'MFRA',
                    timeStamp: false
                },
                logger: {
                    info: sinon.stub()
                }
            };
            createCSVFile(object);
            var result = object.createCSVFile('en_US');
            assert.isDefined(result);
        });
    });

    describe('file creation with timestamp', function () {
        before(function () {
            createCSVFile = proxyquire('int_lengow/cartridge/models/lengow/decorators/createCSVFile', {
                'dw/util/StringUtils': {
                    formatCalendar: function () {
                        return '_20260311_103000_123';
                    }
                },
                'dw/util/Calendar': function () { return {}; },
                'dw/io/File': File
            });
        });

        it('should Create CSV File with timestamp when timeStamp is "true"', function () {
            var infoStub = sinon.stub();
            var object = {
                config: {
                    impexFolderName: 'lengow',
                    fileName: 'lengow',
                    siteID: 'MFRA',
                    timeStamp: 'true'
                },
                logger: { info: infoStub }
            };
            createCSVFile(object);
            object.createCSVFile('en_US');
            assert.isTrue(infoStub.calledOnce);
        });
    });

    describe('file creation with undefined locale', function () {
        before(function () {
            createCSVFile = proxyquire('int_lengow/cartridge/models/lengow/decorators/createCSVFile', {
                'dw/util/StringUtils': {
                    formatCalendar: function () { return ''; }
                },
                'dw/util/Calendar': function () { return {}; },
                'dw/io/File': File
            });
        });

        it('should not append locale when localeID is "undefined"', function () {
            var object = {
                config: {
                    impexFolderName: 'lengow',
                    fileName: 'lengow',
                    siteID: 'MFRA',
                    timeStamp: false
                },
                logger: { info: sinon.stub() }
            };
            createCSVFile(object);
            object.createCSVFile('undefined');
        });
    });

    describe('IMPEX folder does not exist and mkdirs fails', function () {
        function FailingFile() {
            this.exists = function () { return false; };
            this.mkdirs = function () { return false; };
            this.fullPath = 'impex/src/lengow/';
        }
        FailingFile.SEPARATOR = ',';
        FailingFile.IMPEX = '/impex/';
        FailingFile.getRootDirectory = function () { return '/impex/'; };

        before(function () {
            createCSVFile = proxyquire('int_lengow/cartridge/models/lengow/decorators/createCSVFile', {
                'dw/util/StringUtils': { formatCalendar: function () { return ''; } },
                'dw/util/Calendar': function () { return {}; },
                'dw/io/File': FailingFile
            });
        });

        it('should throw when IMPEX folder cannot be created', function () {
            var object = {
                config: {
                    impexFolderName: 'lengow',
                    fileName: 'lengow',
                    siteID: 'MFRA',
                    timeStamp: false
                },
                logger: { info: sinon.stub() }
            };
            createCSVFile(object);
            assert.throws(function () { object.createCSVFile('en_US'); }, Error);
        });
    });
});
