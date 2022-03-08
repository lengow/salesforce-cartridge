'use strict';

/**
 * Get product URL
 * @param {dw.catalog.Product} product - sfcc api product
 * @returns {string} product url
 */
function getProductURL(product) {
    var URLUtils = require('dw/web/URLUtils');
    return URLUtils.https('Product-Show', 'pid', product.ID).toLocaleString();
}

module.exports = {
    getProductURL: getProductURL
};
