'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
var lengowHelpers;

describe('int_lengow/cartridge/scripts/helpers: lengowHelpers.js', function () {
    var loggerStub;

    before(function () {
        loggerStub = {
            info: sinon.stub(),
            debug: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            fatal: sinon.stub()
        };

        lengowHelpers = proxyquire('int_lengow/cartridge/scripts/helpers/lengowHelpers', {
            'dw/system/Logger': {
                getLogger: function () {
                    return loggerStub;
                }
            }
        });
    });

    it('should return a logger with info, debug, warn, error, fatal methods', function () {
        var logger = lengowHelpers.getLogger();
        assert.isFunction(logger.info);
        assert.isFunction(logger.debug);
        assert.isFunction(logger.warn);
        assert.isFunction(logger.error);
        assert.isFunction(logger.fatal);
    });

    it('should return a logger with a message helper', function () {
        var logger = lengowHelpers.getLogger();
        assert.isFunction(logger.message);
    });

    it('should use default category LENGOW when no category is provided', function () {
        var logger = lengowHelpers.getLogger();
        logger.info('test message');
        assert.isTrue(loggerStub.info.called);
    });

    it('should format error object using message()', function () {
        var logger = lengowHelpers.getLogger();
        var err = { message: 'something failed', code: 500 };
        var formatted = logger.message(err);
        assert.include(formatted, 'message: something failed');
        assert.include(formatted, 'code: 500');
    });

    it('should delegate all log methods to the underlying logger', function () {
        var logger = lengowHelpers.getLogger('CustomCategory');
        logger.info('info');
        logger.debug('debug');
        logger.warn('warn');
        logger.error('error');
        logger.fatal('fatal');
        assert.isTrue(loggerStub.info.called);
        assert.isTrue(loggerStub.debug.called);
        assert.isTrue(loggerStub.warn.called);
        assert.isTrue(loggerStub.error.called);
        assert.isTrue(loggerStub.fatal.called);
    });
});

