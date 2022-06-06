'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var emptyStub = sinon.stub();
var uploadCSV;

function File() {
    this.exists = function () {
        return true;
    };
    this.mkdirs = function () {
        return true;
    };
    this.isDirectory = function () {
        return true;
    };
    this.mkdirs = function () {
        return true;
    };
    this.listFiles = function () {
        return null;
    };
    this.fullPath = 'impex/src/lengow/';
}

File.SEPARATOR = ',';
File.IMPEX = '/impex/';
File.getRootDirectory = function () {
    return '/impex/';
};

function SFTPClient() {
    this.setTimeout = emptyStub;
    this.connect = function () {
        return true;
    };
    this.cd = emptyStub;
    this.mkdir = emptyStub;
}

describe('cartridge/models/lengow/decorators: uploadCSV.js', function () {
    global.Error = emptyStub;

    before(function () {
        uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
            'dw/io/File': File,
            '~/cartridge/scripts/init/lengowSFTPService': {
                getService: function () {
                    return SFTPClient;
                }
            }
        });
    });

    afterEach(function () {
        global.Error.reset();
    });

    it('should Upload File to SFTP Location', function () {
        var object = {
            config: {
                catalogId: 'Lengow-catalog-Id'
            },
            sftpConfig: {

            },
            logger: {
                error: emptyStub,
                info: emptyStub
            }
        };
        uploadCSV(object);
    });
});
