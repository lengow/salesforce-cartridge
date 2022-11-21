'use strict';

/**
 * Get Image URL for currenct API Product
 * @param {dw.catalog.Product} product - sfcc api product
 * @returns {string} image url
 */
function getImageURL(product) {
    var images = product.getImages('large');
    if (images.length > 0) {
        return images[0].httpsURL.toString();
    }
    return '';
}

module.exports = {
    getImageURL: getImageURL
};
