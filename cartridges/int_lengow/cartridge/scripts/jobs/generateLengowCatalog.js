'use strict';

/**
 * This script handles Lengow Catalog Feed Job.
 */

var Status = require('dw/system/Status');

/**
 * Generates Master Catalog and stores it in IMPEX lengow folder.
 * @param {dw.util.HashMap} params - Job Parameters
 * @returns {dw.system.Status} - SFCC Status
 */
function generateCatalog(params) {
    var decorators = require('*/cartridge/models/lengow/decorators/index');
    var object = {};
    decorators.base(object, params);
    if (object.config.isDisabled) {
        return new Status(Status.OK, 'OK', 'Step Skipped');
    }
    decorators.setCatalogFeedLocale(object);
    decorators.setCurrencyCode(object);
    decorators.createCSVFile(object);
    decorators.createFileWriter(object);
    decorators.createCSVStreamWriter(object);
    decorators.writeCSV(object);
    try {
        decorators.generateCatalog(object);
    } catch (e) {
        object.logger.error('>>>ERROR:\n{0}<<<', object.logger.message(e));
        return new Status(Status.ERROR);
    }
    return new Status(Status.OK);
}

/**
 * Uploads generated catalog(s) found at IMPEX/lengow/catalog/ folder
 * and uploads it Lengow SFTP folder, configured in Lengow Site Preferences.
 * @param {dw.util.HashMap} params - Job Parameters
 * @returns {dw.system.Status} - SFCC Status
 */
function uploadCatalog(params) {
    var decorators = require('*/cartridge/models/lengow/decorators/index');
    var object = Object.create(null);
    decorators.base(object, params);
    if (object.config.isDisabled) {
        return new Status(Status.OK, 'OK', 'Step Skipped');
    }
    try {
        decorators.uploadCSV(object);
    } catch (e) {
        object.logger.error('>>>ERROR:\n{0}<<<', object.logger.message(e));
        return new Status(Status.ERROR);
    }
    return new Status(Status.OK);
}

module.exports = {
    generate: generateCatalog,
    upload: uploadCatalog
};
