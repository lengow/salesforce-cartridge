'use strict';

var File = require('dw/io/File');
var LengowSFTPService = require('~/cartridge/scripts/init/lengowSFTPService');

/**
 * Joins a remote SFTP path with a file name, guaranteeing exactly one separator.
 * Without this the log messages read like "sftp://hostfolderfile.csv", which is
 * the only place a merchant can diagnose a failed upload.
 * @param {string} base - service URL or remote folder
 * @param {string} name - file name
 * @returns {string} joined path
 */
function joinRemote(base, name) {
    var left = base ? String(base) : '';
    var right = name ? String(name) : '';
    if (left.charAt(left.length - 1) === '/') {
        left = left.substring(0, left.length - 1);
    }
    if (right.charAt(0) === '/') {
        right = right.substring(1);
    }
    return left + '/' + right;
}

/**
 * Uploads generated catalog(s) found at IMPEX/src/lengow folder
 * and uploads it Lengow SFTP folder, configured in Lengow Site Preferences.
 */
function uploadCSV() {
    var logger = this.logger;
    var config = this.config;
    var sftpConfig = this.sftpConfig;

    // get the CSV files in IMPEX
    var folderFile = new File(File.getRootDirectory(File.IMPEX), config.impexFolderName);
    if (!folderFile || !folderFile.isDirectory()) {
        throw new Error('Cannot find IMPEX folder: ' + (File.getRootDirectory(File.IMPEX).fullPath + config.impexFolderName));
    }
    var testFileName = new RegExp('.*\.csv$', 'i'); // eslint-disable-line no-useless-escape
    var csvFiles = folderFile.listFiles(function (file) {
        return testFileName.test(file.name);
    });
    if (!csvFiles || csvFiles.empty) {
        logger.info('Nothing to upload to SFTP folder!');
    } else {
        logger.info('Found {0} *.csv files ready to be uploaded to SFTP folder', csvFiles.length);

        var archiveFolderName = (config.impexFolderName + File.SEPARATOR + config.archiveFolderName);
        var archiveFolderFile = new File(File.getRootDirectory(File.IMPEX), archiveFolderName);
        if (!archiveFolderFile || (!archiveFolderFile.isDirectory() && !archiveFolderFile.mkdirs())) {
            throw new Error('Cannot create IMPEX Archive folder: ' + archiveFolderName + '!');
        }
        var sftpPath = sftpConfig.sftpFolderName;
        var sftpService = LengowSFTPService.getService(sftpConfig.serviceID);

        // upload csv files to Lengow SFTP folder
        if (sftpPath && sftpPath !== '/' && !sftpService.call('cd', sftpPath).ok) {
            // try to create SFTP folder if it does not exist, if created do a cd
            if (sftpService.call('mkdir', sftpPath).ok && !sftpService.call('cd', sftpPath).ok) {
                throw new Error('Cannot cd to SFTP folder ' + sftpPath);
            }
        }

        // upload csv files to SFTP folder
        var uploadedCsvFiles = [];
        var failedCsvFiles = [];
        var uploadToPath = sftpPath || '/';
        var uploadingCsvFiles = csvFiles.iterator();
        while (uploadingCsvFiles.hasNext()) {
            var csvFile = uploadingCsvFiles.next();
            try {
                var serviceResult = sftpService.call('putBinary', (uploadToPath + csvFile.name), csvFile);
                var isUploadSuccessful = serviceResult.getObject();
                if (!serviceResult.isOk() || !isUploadSuccessful) {
                    throw new Error('SFTP Service: couldn\'t upload file: ' + csvFile.getFullPath() + ' error: ' + serviceResult.getErrorMessage());
                }
                uploadedCsvFiles.push(csvFile);
            } catch (e) {
                failedCsvFiles.push(csvFile);
            }
        }

        if (uploadedCsvFiles.length > 0) {
            logger.info('Successfully Uploaded CSV Files:\n{0}',
                uploadedCsvFiles.map(function (uploadCsvFile) {
                    return (uploadCsvFile.fullPath + ' => ' + joinRemote(joinRemote(sftpService.getURL(), uploadToPath), uploadCsvFile.name));
                }).join('\n') // eslint-disable-line no-shadow
            );
        }

        if (failedCsvFiles.length > 0) {
            logger.error('Failed Upload CSV Files:\n{0}',
                failedCsvFiles.map(function (failedCsvFile) {
                    return (failedCsvFile.fullPath + ' => ' + joinRemote(joinRemote(sftpService.getURL(), uploadToPath), failedCsvFile.name));
                }).join('\n') // eslint-disable-line no-shadow
            );
        }

        // move uploaded csv files into Archive folder Zip Archive in IMPEX
        var zippedCsvFiles = [];
        var failedZippedCsvFiles = [];
        if (uploadedCsvFiles && uploadedCsvFiles.length > 0) {
            uploadedCsvFiles.forEach(function (zippingFile) {
                var filePath = zippingFile.fullPath;
                var zipArchiveFile = new File(archiveFolderFile.fullPath + File.SEPARATOR + zippingFile.name + '.zip');
                if (!zipArchiveFile.exists()) {
                    if (!zipArchiveFile.createNewFile()) {
                        logger.error('Cannot create zip archive {0} for uploaded CSV file {1}!', zipArchiveFile.fullPath, zippingFile.name);
                    }
                }

                try {
                    zippingFile.zip(zipArchiveFile);
                    zippedCsvFiles.push(filePath + '.zip');
                    zippingFile.remove();
                } catch (e) {
                    failedZippedCsvFiles.push(filePath);
                }
            });
            if (zippedCsvFiles.length > 0) {
                logger.info('Successfully Zipped CSV Files:\n{0}', zippedCsvFiles.join('\n'));
            }
            if (failedZippedCsvFiles.length > 0) {
                logger.error('Failed Zip CSV Files:\n{0}', failedZippedCsvFiles.join('\n'));
            }
        }

        // Surface upload failures to the job framework. Without this the step returns
        // Status.OK even when every single transfer failed, so the merchant sees a green
        // job while Lengow receives nothing. Archiving of the files that DID upload has
        // already happened above, so throwing here loses no work.
        if (failedCsvFiles.length > 0) {
            throw new Error('SFTP upload failed for ' + failedCsvFiles.length + ' of ' + csvFiles.length
                + ' file(s). See the LENGOW custom log for the list.');
        }
    }
}

module.exports = function (object) {
    Object.defineProperties(object, {
        uploadCSV: {
            enumerable: true,
            value: function () {
                return uploadCSV.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
    object.uploadCSV();
};
