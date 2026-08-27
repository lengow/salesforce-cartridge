'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
var uploadCSV;

function createFileConstructor(options) {
    var opts = options || {};

    function File(rootOrPath, name) {
        this._root = rootOrPath;
        this._name = name;
        this.name = name || 'test.csv';
        this.fullPath = (rootOrPath || '/impex/') + (name || '');
    }

    File.prototype.exists = function () {
        return opts.fileExists !== undefined ? opts.fileExists : true;
    };
    File.prototype.mkdirs = function () {
        return opts.mkdirsResult !== undefined ? opts.mkdirsResult : true;
    };
    File.prototype.isDirectory = function () {
        return opts.isDirectory !== undefined ? opts.isDirectory : true;
    };
    File.prototype.listFiles = function (filter) {
        if (opts.csvFiles === null) return null;
        if (!opts.csvFiles) return { empty: true };
        var files = opts.csvFiles.filter(function (f) { return !filter || filter(f); });
        return {
            empty: files.length === 0,
            length: files.length,
            iterator: function () {
                var idx = 0;
                return {
                    hasNext: function () { return idx < files.length; },
                    next: function () { return files[idx++]; }
                };
            }
        };
    };
    File.prototype.createNewFile = function () {
        return opts.createNewFileResult !== undefined ? opts.createNewFileResult : true;
    };
    File.prototype.zip = function () {
        if (opts.zipThrows) throw new Error('Zip failed');
    };
    File.prototype.remove = function () {};
    File.prototype.getFullPath = function () { return this.fullPath; };

    File.SEPARATOR = '/';
    File.IMPEX = '/impex/';
    File.getRootDirectory = function () {
        return { fullPath: '/impex/' };
    };

    return File;
}

function createSFTPService(options) {
    var opts = options || {};

    return {
        getService: function () {
            return {
                call: function (method, path) {
                    if (method === 'cd') {
                        return { ok: opts.cdOk !== undefined ? opts.cdOk : true };
                    }
                    if (method === 'mkdir') {
                        return { ok: opts.mkdirOk !== undefined ? opts.mkdirOk : true };
                    }
                    if (method === 'putBinary') {
                        return {
                            getObject: function () { return opts.uploadSuccess !== undefined ? opts.uploadSuccess : true; },
                            isOk: function () { return opts.uploadOk !== undefined ? opts.uploadOk : true; },
                            getErrorMessage: function () { return 'Upload error'; }
                        };
                    }
                    return { ok: true };
                },
                getURL: function () { return 'sftp://lengow.io'; }
            };
        }
    };
}

describe('cartridge/models/lengow/decorators: uploadCSV.js', function () {
    describe('folder not found (not a directory)', function () {
        before(function () {
            var FileStub = createFileConstructor({ isDirectory: false });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService()
            });
        });

        it('should throw when IMPEX folder is not a directory', function () {
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            assert.throws(function () { uploadCSV(object); }, Error);
        });
    });

    describe('no CSV files found (null)', function () {
        before(function () {
            var FileStub = createFileConstructor({ csvFiles: null });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService()
            });
        });

        it('should log info when no files to upload', function () {
            var infoStub = sinon.stub();
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: infoStub }
            };
            uploadCSV(object);
            object.uploadCSV();
            assert.isTrue(infoStub.calledWith('Nothing to upload to SFTP folder!'));
        });
    });

    describe('no CSV files found (empty list)', function () {
        before(function () {
            var FileStub = createFileConstructor({
                csvFiles: []
            });
            // Override listFiles to return { empty: true }
            FileStub.prototype.listFiles = function () { return { empty: true }; };
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService()
            });
        });

        it('should log info when csv list is empty', function () {
            var infoStub = sinon.stub();
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: infoStub }
            };
            uploadCSV(object);
            object.uploadCSV();
            assert.isTrue(infoStub.calledWith('Nothing to upload to SFTP folder!'));
        });
    });

    describe('successful upload and archive', function () {
        before(function () {
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({
                csvFiles: [csvFile1],
                fileExists: false
            });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService({ uploadSuccess: true, uploadOk: true })
            });
        });

        it('should upload files and log success', function () {
            var infoStub = sinon.stub();
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: infoStub }
            };
            uploadCSV(object);
            object.uploadCSV();
            assert.isTrue(infoStub.called);
            // Check for success message
            var hasSuccessMsg = infoStub.getCalls().some(function (call) {
                return typeof call.args[0] === 'string' && call.args[0].indexOf('Successfully Uploaded') > -1;
            });
            assert.isTrue(hasSuccessMsg, 'Should log successful upload');
        });
    });

    describe('upload failure', function () {
        before(function () {
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvFile1] });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService({ uploadSuccess: false, uploadOk: true })
            });
        });

        it('should log failed uploads AND throw so the job reports ERROR', function () {
            var errorStub = sinon.stub();
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: errorStub, info: sinon.stub() }
            };
            // uploadCSV() is invoked by the decorator itself, so the throw surfaces here
            assert.throws(function () { uploadCSV(object); }, /SFTP upload failed for 1 of 1/);

            var hasFailMsg = errorStub.getCalls().some(function (call) {
                return typeof call.args[0] === 'string' && call.args[0].indexOf('Failed Upload') > -1;
            });
            assert.isTrue(hasFailMsg, 'Should log failed upload');
        });
    });

    describe('partial upload failure', function () {
        var csvOk;
        var csvKo;

        before(function () {
            csvOk = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            csvKo = {
                name: 'catalog_fr.csv',
                fullPath: '/impex/src/lengow/catalog_fr.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvOk, csvKo] });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': {
                    getService: function () {
                        return {
                            // Only the French file fails, so the batch is genuinely partial.
                            call: function (method, path) {
                                if (method === 'putBinary') {
                                    var failing = String(path).indexOf('catalog_fr.csv') > -1;
                                    return {
                                        getObject: function () { return !failing; },
                                        isOk: function () { return !failing; },
                                        getErrorMessage: function () { return 'Permission denied'; }
                                    };
                                }
                                return { ok: true };
                            },
                            getURL: function () { return 'sftp://lengow.io'; }
                        };
                    }
                }
            });
        });

        it('should archive what uploaded, keep what failed, and still throw', function () {
            var errorStub = sinon.stub();
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: errorStub, info: sinon.stub() }
            };

            // The contract: archiving runs *before* the throw, so a partial batch loses no work.
            assert.throws(function () { uploadCSV(object); }, /SFTP upload failed for 1 of 2/);

            assert.isTrue(csvOk.zip.called, 'the transferred file should be zipped into archive/');
            assert.isTrue(csvOk.remove.called, 'the transferred file should be removed from IMPEX');
            assert.isFalse(csvKo.zip.called, 'the failed file must not be archived');
            assert.isFalse(csvKo.remove.called, 'the failed file must stay in IMPEX for the next run');

            // The reason has to reach the log, otherwise auth, network, permission and
            // bad-path failures are indistinguishable to whoever reads it.
            var failLog = errorStub.getCalls().filter(function (call) {
                return typeof call.args[0] === 'string' && call.args[0].indexOf('Failed Upload') > -1;
            });
            assert.lengthOf(failLog, 1, 'Should log the failed upload');
            assert.include(failLog[0].args[1], 'Permission denied', 'the failure reason should be logged');
            assert.include(failLog[0].args[1], 'catalog_fr.csv', 'the failing file should be named');
        });
    });

    describe('SFTP cd fails, mkdir + cd succeeds', function () {
        before(function () {
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvFile1] });
            var cdCallCount = 0;
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': {
                    getService: function () {
                        return {
                            call: function (method) {
                                if (method === 'cd') {
                                    cdCallCount++;
                                    // First cd fails, second succeeds
                                    return { ok: cdCallCount > 1 };
                                }
                                if (method === 'mkdir') { return { ok: true }; }
                                if (method === 'putBinary') {
                                    return {
                                        getObject: function () { return true; },
                                        isOk: function () { return true; },
                                        getErrorMessage: function () { return ''; }
                                    };
                                }
                                return { ok: true };
                            },
                            getURL: function () { return 'sftp://lengow.io'; }
                        };
                    }
                }
            });
        });

        it('should create SFTP folder and cd into it', function () {
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            uploadCSV(object);
            assert.doesNotThrow(function () { object.uploadCSV(); });
        });
    });

    describe('SFTP cd fails, mkdir fails => throw', function () {
        before(function () {
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvFile1] });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': {
                    getService: function () {
                        return {
                            call: function (method) {
                                if (method === 'cd') return { ok: false };
                                if (method === 'mkdir') return { ok: false };
                                return { ok: true };
                            },
                            getURL: function () { return 'sftp://lengow.io'; }
                        };
                    }
                }
            });
        });

        it('should fail immediately with the folder error when mkdir fails', function () {
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            // The destination folder does not exist and cannot be created, so there is nowhere
            // to upload to. The step must say that, not fall through and report a generic
            // transfer failure — which is what it used to do, because a failed mkdir
            // short-circuited the compound condition and raised nothing at all.
            assert.throws(function () { uploadCSV(object); }, /Cannot create SFTP folder \/upload/);
        });
    });

    describe('sftpPath is root /', function () {
        before(function () {
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvFile1] });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService()
            });
        });

        it('should skip cd when sftpPath is /', function () {
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            uploadCSV(object);
            assert.doesNotThrow(function () { object.uploadCSV(); });
        });
    });

    describe('zip failure', function () {
        before(function () {
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: function () { throw new Error('Zip error'); },
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvFile1] });
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService()
            });
        });

        it('should log failed zip', function () {
            var errorStub = sinon.stub();
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: errorStub, info: sinon.stub() }
            };
            uploadCSV(object);
            object.uploadCSV();
            var hasZipFailMsg = errorStub.getCalls().some(function (call) {
                return typeof call.args[0] === 'string' && call.args[0].indexOf('Failed Zip') > -1;
            });
            assert.isTrue(hasZipFailMsg, 'Should log failed zip');
        });
    });

    describe('archive folder cannot create new file', function () {
        before(function () {
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({
                csvFiles: [csvFile1],
                fileExists: false
            });
            FileStub.prototype.createNewFile = function () { return false; };
            uploadCSV = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': createSFTPService()
            });
        });

        it('should log error when cannot create zip archive file', function () {
            var errorStub = sinon.stub();
            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: errorStub, info: sinon.stub() }
            };
            uploadCSV(object);
            object.uploadCSV();
            var hasCreateFailMsg = errorStub.getCalls().some(function (call) {
                return typeof call.args[0] === 'string' && call.args[0].indexOf('Cannot create zip archive') > -1;
            });
            assert.isTrue(hasCreateFailMsg, 'Should log cannot create zip archive');
        });
    });
    describe('remote path construction (F15)', function () {
        it('should join the SFTP folder and the file name with exactly one slash', function () {
            var putPaths = [];
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvFile1], fileExists: false });
            var capturingService = {
                getService: function () {
                    return {
                        call: function (method, path) {
                            if (method === 'putBinary') {
                                putPaths.push(path);
                                return {
                                    getObject: function () { return true; },
                                    isOk: function () { return true; },
                                    getErrorMessage: function () { return ''; }
                                };
                            }
                            return { ok: true };
                        },
                        getURL: function () { return 'sftp://lengow.io'; }
                    };
                }
            };
            var mod = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': capturingService
            });

            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                // no trailing slash - this is what the README and the metadata default look like
                sftpConfig: { sftpFolderName: '/upload', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            mod(object);

            assert.deepEqual(putPaths, ['/upload/catalog_en.csv'],
                'must not produce /uploadcatalog_en.csv');
        });

        it('should not double the slash when the folder already ends with one', function () {
            var putPaths = [];
            var csvFile1 = {
                name: 'catalog_en.csv',
                fullPath: '/impex/src/lengow/catalog_en.csv',
                getFullPath: function () { return this.fullPath; },
                zip: sinon.stub(),
                remove: sinon.stub()
            };
            var FileStub = createFileConstructor({ csvFiles: [csvFile1], fileExists: false });
            var capturingService = {
                getService: function () {
                    return {
                        call: function (method, path) {
                            if (method === 'putBinary') {
                                putPaths.push(path);
                                return {
                                    getObject: function () { return true; },
                                    isOk: function () { return true; },
                                    getErrorMessage: function () { return ''; }
                                };
                            }
                            return { ok: true };
                        },
                        getURL: function () { return 'sftp://lengow.io'; }
                    };
                }
            };
            var mod = proxyquire('int_lengow/cartridge/models/lengow/decorators/uploadCSV', {
                'dw/io/File': FileStub,
                '~/cartridge/scripts/init/lengowSFTPService': capturingService
            });

            var object = {
                config: { impexFolderName: 'src/lengow', archiveFolderName: 'archive' },
                sftpConfig: { sftpFolderName: '/upload/', serviceID: 'LengowSFTP' },
                logger: { error: sinon.stub(), info: sinon.stub() }
            };
            mod(object);

            assert.deepEqual(putPaths, ['/upload/catalog_en.csv']);
        });
    });
});
