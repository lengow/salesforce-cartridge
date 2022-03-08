'use strict';

var File = require('dw/io/File');
var SFTPClient = require('dw/net/SFTPClient');

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
        // upload csv files to Lengow SFTP folder
        var sftp = new SFTPClient();
        sftp.setTimeout(sftpConfig.sftpTimeout);
        if (!sftp.connect(sftpConfig.sftpHost, sftpConfig.sftpPort, sftpConfig.sftpUser, sftpConfig.sftpPass)) {
            throw new Error('Cannot connect to SFTP host ' + sftpConfig.sftpHost + ', Error:\n' + sftp.getErrorMessage());
        }
        if (sftpPath && sftpPath !== '/' && !sftp.cd(sftpPath)) {
            // try to create SFTP folder if it does not exist, if created do a cd
            if (sftp.mkdir(sftpPath) && !sftp.cd(sftpPath)) {
                throw new Error('Cannot cd to SFTP folder ' + sftpPath + ', Error:\n' + sftp.getErrorMessage());
            }
        }
        logger.info('Successfully connected to SFTP host: {0}, path: {1}', sftpConfig.sftpHost, sftpPath);

        // upload csv files to SFTP folder
        var uploadedCsvFiles = [];
        var failedCsvFiles = [];
        var uploadToPath = sftpPath || '/';
        var uploadingCsvFiles = csvFiles.iterator();
        while (uploadingCsvFiles.hasNext()) {
            var csvFile = uploadingCsvFiles.next();
            try {
                sftp.putBinary((uploadToPath + csvFile.name), csvFile);
                uploadedCsvFiles.push(csvFile);
            } catch (e) {
                failedCsvFiles.push(csvFile);
            }
        }
        sftp.disconnect();

        if (uploadedCsvFiles.length > 0) {
            logger.info('Successfully Uploaded CSV Files:\n{0}',
                uploadedCsvFiles.map(function (uploadCsvFile) {
                    return (uploadCsvFile.fullPath + ' => ' + (sftpConfig.sftpHost + uploadToPath + uploadCsvFile.name));
                }).join('\n') // eslint-disable-line no-shadow
            );
        }

        if (failedCsvFiles.length > 0) {
            logger.error('Failed Upload CSV Files:\n{0}',
                failedCsvFiles.map(function (failedCsvFile) {
                    return (failedCsvFile.fullPath + '=> ' + (sftpConfig.sftpHost + uploadToPath + failedCsvFile.name));
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
