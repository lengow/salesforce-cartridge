'use strict';

/**
 * Get category Id of current api product
 * @param {dw.catalog.Product} product - api product
 * @returns {string} - catgory id
 */
function getCategory(product) {
    var categoryExternalId = '';
    var allCategories;
    if (product.primaryCategory !== null) {
        categoryExternalId = product.primaryCategory.ID;
    } else if ('masterProduct' in product && product.masterProduct && product.masterProduct.primaryCategory !== null) {
        categoryExternalId = product.masterProduct.primaryCategory.ID;
    } else if (product.allCategories.size() > 0) {
        allCategories = product.allCategories;
        categoryExternalId = allCategories.iterator().next().ID;
    } else if ('masterProduct' in product && product.masterProduct && product.masterProduct.allCategories.size() > 0) {
        allCategories = product.masterProduct.allCategories;
        categoryExternalId = allCategories.iterator().next().ID;
    }
    return categoryExternalId;
}

module.exports = {
    getCategory: getCategory
};
