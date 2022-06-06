'use strict';

var Site = require('dw/system/Site');

/**
 * Function return header & header object of all attribute
 * @returns {Object} - return header & header object of all product attribute
 */
function getProductAttributes() {
    var header = [];
    var headerObject = [];
    var lengowMandatoryAttrObject = [];
    var lengowAdditionalAttrObject = [];
    try {
        var lengowMandatoryAttributes = Site.getCurrent().getCustomPreferenceValue('lengowMandatoryAttributes');
        var lengowAdditionalAttributes = Site.getCurrent().getCustomPreferenceValue('lengowAdditionalAttributes');
        if (lengowMandatoryAttributes && !empty(lengowMandatoryAttributes)) { // eslint-disable-line
            lengowMandatoryAttrObject = JSON.parse(lengowMandatoryAttributes);
        }
        if (lengowAdditionalAttributes && !empty(lengowAdditionalAttributes)) { // eslint-disable-line
            lengowAdditionalAttrObject = JSON.parse(lengowAdditionalAttributes);
        }

        require('*/cartridge/config/productAttr').forEach(function (item) {
            header.push(item.id);
            headerObject.push(item);
        });

        lengowMandatoryAttrObject.system.forEach(function (item) {
            if (header.indexOf(item.id) === -1) {
                header.push(item.id);
                headerObject.push(item);
            }
        });

        lengowAdditionalAttrObject.system.forEach(function (item) {
            if (header.indexOf(item.id) === -1) {
                header.push(item.id);
                headerObject.push(item);
            }
        });
        lengowMandatoryAttrObject.custom.forEach(function (item) {
            if (header.indexOf(item.id) === -1) {
                header.push(item.id);
                headerObject.push(item);
            }
        });
        lengowAdditionalAttrObject.custom.forEach(function (item) {
            if (header.indexOf(item.id) === -1) {
                header.push(item.id);
                headerObject.push(item);
            }
        });
    } catch (e) {
        // Do Nothing
    }
    return {
        header: header,
        headerObject: headerObject
    };
}

/**
 * Get Job Config from Job params
 * @param {Object} jobParams - job parameter
 * @returns {Object} config object
 */
function getJobConfig(jobParams) {
    var config = getProductAttributes();
    config.impexFolderName = jobParams.ImpexFolderName;
    config.fileName = jobParams.FileNamePrefix;
    config.catalogId = jobParams.CatalogID;
    config.timeStamp = jobParams.IncludeTimeStamp;
    config.archiveFolderName = 'archive';
    config.siteID = Site.getCurrent().getID();
    config.skipMaster = jobParams.SkipMaster;
    config.availableOnly = jobParams.AvailableOnly;
    config.onlineOnly = jobParams.OnlineOnly;
    config.isDisabled = jobParams.IsDisabled;
    return config;
}

/**
 * Get SFTP Job Config from Job params
 * @param {Object} jobParams - job parameter
 * @returns {Object} - sftp config object
 */
function getSFTPJobConfig(jobParams) {
    var config = {};
    config.sftpFolderName = jobParams.SftpFolderName;
    config.serviceID = jobParams.ServiceID;
    return config;
}

module.exports = function (object, jobParams) {
    var lengowHelpers = require('*/cartridge/scripts/helpers/lengowHelpers');
    Object.defineProperties(object, {
        logger: {
            enumerable: true,
            value: lengowHelpers.getLogger()
        },
        config: {
            enumerable: true,
            writable: true,
            value: getJobConfig(jobParams)
        },
        sftpConfig: {
            enumerable: true,
            writable: true,
            value: getSFTPJobConfig(jobParams)
        }
    });
};
