'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;

var emptyStub = sinon.stub();

function Status(code, detail, message) {
    this.code = code;
    this.detail = detail || '';
    this.message = message || '';
}
Status.OK = 0;
Status.ERROR = 1;

describe('int_lengow/cartridge/scripts/jobs: generateLengowCatalog.js', function () {
    var generateLengowCatalog;

    var baseStub, setCatalogFeedLocaleStub, setCurrencyCodeStub;
    var createCSVFileStub, createFileWriterStub, createCSVStreamWriterStub;
    var writeCSVStub, generateCatalogStub, uploadCSVStub;

    beforeEach(function () {
        baseStub = sinon.stub();
        setCatalogFeedLocaleStub = sinon.stub();
        setCurrencyCodeStub = sinon.stub();
        createCSVFileStub = sinon.stub();
        createFileWriterStub = sinon.stub();
        createCSVStreamWriterStub = sinon.stub();
        writeCSVStub = sinon.stub();
        generateCatalogStub = sinon.stub();
        uploadCSVStub = sinon.stub();

        generateLengowCatalog = proxyquire('int_lengow/cartridge/scripts/jobs/generateLengowCatalog', {
            'dw/system/Status': Status,
            '*/cartridge/models/lengow/decorators/index': {
                base: function (object, params) {
                    baseStub(object, params);
                    object.config = { isDisabled: params.IsDisabled };
                    object.logger = { error: emptyStub, info: emptyStub, message: function (e) { return e.message || ''; } };
                },
                setCatalogFeedLocale: setCatalogFeedLocaleStub,
                setCurrencyCode: setCurrencyCodeStub,
                createCSVFile: createCSVFileStub,
                createFileWriter: createFileWriterStub,
                createCSVStreamWriter: createCSVStreamWriterStub,
                writeCSV: writeCSVStub,
                generateCatalog: generateCatalogStub,
                uploadCSV: uploadCSVStub
            }
        });
    });

    describe('generate()', function () {
        it('should return OK status when generation succeeds', function () {
            var params = { IsDisabled: false };
            var result = generateLengowCatalog.generate(params);
            assert.equal(result.code, Status.OK);
            assert.isTrue(baseStub.calledOnce);
            assert.isTrue(generateCatalogStub.calledOnce);
        });

        it('should skip when isDisabled is true', function () {
            var params = { IsDisabled: true };
            var result = generateLengowCatalog.generate(params);
            assert.equal(result.code, Status.OK);
            assert.equal(result.message, 'Step Skipped');
            assert.isFalse(generateCatalogStub.called);
        });

        it('should return ERROR status when generateCatalog throws', function () {
            generateCatalogStub.throws(new Error('catalog generation failed'));
            var params = { IsDisabled: false };
            var result = generateLengowCatalog.generate(params);
            assert.equal(result.code, Status.ERROR);
        });

        it('should call all decorators in the correct order', function () {
            var params = { IsDisabled: false };
            generateLengowCatalog.generate(params);
            assert.isTrue(baseStub.calledOnce);
            assert.isTrue(setCatalogFeedLocaleStub.calledOnce);
            assert.isTrue(setCurrencyCodeStub.calledOnce);
            assert.isTrue(createCSVFileStub.calledOnce);
            assert.isTrue(createFileWriterStub.calledOnce);
            assert.isTrue(createCSVStreamWriterStub.calledOnce);
            assert.isTrue(writeCSVStub.calledOnce);
            assert.isTrue(generateCatalogStub.calledOnce);
        });
    });

    describe('upload()', function () {
        it('should return OK status when upload succeeds', function () {
            var params = { IsDisabled: false };
            var result = generateLengowCatalog.upload(params);
            assert.equal(result.code, Status.OK);
            assert.isTrue(uploadCSVStub.calledOnce);
        });

        it('should skip when isDisabled is true', function () {
            var params = { IsDisabled: true };
            var result = generateLengowCatalog.upload(params);
            assert.equal(result.code, Status.OK);
            assert.equal(result.message, 'Step Skipped');
            assert.isFalse(uploadCSVStub.called);
        });

        it('should return ERROR status when uploadCSV throws', function () {
            uploadCSVStub.throws(new Error('upload failed'));
            var params = { IsDisabled: false };
            var result = generateLengowCatalog.upload(params);
            assert.equal(result.code, Status.ERROR);
        });
    });
});

