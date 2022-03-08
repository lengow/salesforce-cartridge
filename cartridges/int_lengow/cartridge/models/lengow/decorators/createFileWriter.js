'use strict';

/**
 * Creates FileWriter instance
 * @param {dw.io.File} csvFile - file to write
 * @returns {dw.io.FileWriter} - FileWriter
 */
function createFileWriter(csvFile) {
    var FileWriter = require('dw/io/FileWriter');
    return new FileWriter(csvFile, false);
}

module.exports = function (object) {
    Object.defineProperties(object, {
        createFileWriter: {
            enumerable: true,
            value: function () {
                return createFileWriter.apply(object, Array.prototype.slice.call(arguments));
            }
        }
    });
};
