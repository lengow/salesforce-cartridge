'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var sinon = require('sinon');
var assert = require('chai').assert;
var lengowSFTPService;

describe('int_lengow/cartridge/scripts/init: lengowSFTPService.js', function () {
    var setOperationStub;

    before(function () {
        setOperationStub = sinon.stub();

        lengowSFTPService = proxyquire('int_lengow/cartridge/scripts/init/lengowSFTPService', {
            'dw/svc/LocalServiceRegistry': {
                createService: function (serviceID, callbacks) {
                    // Simulate the service creation and test the callbacks
                    var mockService = {
                        setOperation: setOperationStub
                    };

                    // Test createRequest callback
                    var requestResult = callbacks.createRequest(mockService, 'cd', '/path');
                    assert.equal(requestResult, mockService, 'createRequest should return the service');

                    // Test parseResponse callback
                    var responseResult = callbacks.parseResponse(mockService, 'response-data');
                    assert.equal(responseResult, 'response-data', 'parseResponse should return the result');

                    // Test filterLogMessage callback
                    var filteredMsg = callbacks.filterLogMessage('log message');
                    assert.equal(filteredMsg, 'log message', 'filterLogMessage should return the message as-is');

                    return { serviceID: serviceID };
                }
            }
        });
    });

    it('should create an SFTP service with the given serviceID', function () {
        var service = lengowSFTPService.getService('TestSFTPService');
        assert.equal(service.serviceID, 'TestSFTPService');
    });

    it('should call setOperation with forwarded arguments on createRequest', function () {
        assert.isTrue(setOperationStub.called, 'setOperation should be called by createRequest');
    });
});

