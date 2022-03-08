'use strict';

var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var File = require('dw/io/File');

/**
 * Creates IMPEX folder
 * @throws {Error}
 * @param {string} impexFolderName - IMPEX folder name
 * @return {dw.io.File} - IMPEX folder
 */
function createImpexFolder(impexFolderName) {
    var folderFile = new File(File.getRootDirectory(File.IMPEX), impexFolderName);
    if (!folderFile.exists() && !folderFile.mkdirs()) {
        throw new Error('Cannot create IMPEX folders {0}', (File.getRootDirectory(File.IMPEX).fullPath + impexFolderName));
    }

    return folderFile;
}

/**
 * Creates export file in IMPEX folder
 * @param {string} fileName - export file name pattern
 * @param {dw.io.File} folderFile - folder in which the file will be created
 * @param {string} siteID - current site id
 * @param {boolean} timeStamp - time stamp need to add or not
 * @param {string} localeID - current locale id
 * @returns {dw.io.File} - export file
 */
function createExportFile(fileName, folderFile, siteID, timeStamp, localeID) {
    fileName += '_' + siteID;
    if (timeStamp && timeStamp === 'true') {
        fileName += StringUtils.formatCalendar(new Calendar(), '_yyyyMMdd_HHmmss_S');
    }
    if (localeID !== 'undefined') {
        fileName += '_' + localeID;
    }

    var csvFile = new File(folderFile.fullPath + File.SEPARATOR + fileName + '.csv');

    return csvFile;
}

/**
 * Creates writable export file
 * @param {string} localeID - locale ID
 * @returns {dw.io.File} - writable export file
 */
function createCSVFile(localeID) {
    var folderFile = createImpexFolder(this.config.impexFolderName);
    var csvFile = createExportFile(this.config.fileName, folderFile, this.config.siteID, this.config.timeStamp, localeID);

    this.logger.info('---CSV file {0} has been created---', csvFile.fullPath);

    return csvFile;
}

module.exports = function (object) {
    Object.defineProperties(object, {
        createCSVFile: {
            enumerable: true,
            value: function () {
                return createCSVFile.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
};
