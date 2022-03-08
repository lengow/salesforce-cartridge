'use strict';

require('app-module-path').addPath(process.cwd());
require('app-module-path').addPath(process.cwd() + '/cartridges');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();
var assert = require('chai').assert;
var base;

var lengowMandatoryAttributes = [];
var lengowAdditionalAttributes = [];
var JobParams = {
    ImpexFolderName: 'src/lengow',
    FileNamePrefix: 'lengow',
    IncludeTimeStamp: true,
    SkipMaster: true,
    AvailableOnly: false,
    OnlineOnly: true,
    IsDisabled: false
};

describe('cartridge/models/lengow/decorators: base.js', function () {
    before(function () {
        base = proxyquire('int_lengow/cartridge/models/lengow/decorators/base', {
            'dw/system/Site': {
                getCurrent: function () {
                    return {
                        getCustomPreferenceValue: function (siteID) {
                            if (siteID === 'lengowMandatoryAttributes') {
                                return lengowMandatoryAttributes;
                            } else if (siteID === 'lengowAdditionalAttributes') {
                                return lengowAdditionalAttributes;
                            }
                            return [];
                        },
                        getID: function () {
                            return 'ReAfrchGlobal';
                        }
                    };
                }
            },
            '*/cartridge/config/productAttr': [],
            '*/cartridge/scripts/helpers/lengowHelpers': {
                getLogger: function () {
                    return;
                }
            }
        });
    });

    it('should Get All Job Config', function () {
        var object = {};
        base(object, JobParams);

        assert.isTrue(object.config.timeStamp);
        assert.isTrue(object.config.skipMaster);
    });
});
