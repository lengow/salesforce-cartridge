'use strict';

var markuptext = require('dw/content/MarkupText');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var EnumValue = require('dw/value/EnumValue');
var MediaFile = require('dw/content/MediaFile');
var Quantity = require('dw/value/Quantity');

/**
 * Get the attribute value based on its type
 * @param {Object|string}  attribute -containing the custom attributes of the product.
 * @returns {Object|string} result - containing the custom attributes of the product handles multitype or string type.
 */
function getAttributeValue(attribute) {
    var result = '';
    if (attribute !== null) {
        if ((typeof attribute) === 'object' && !(attribute instanceof markuptext)) {
            if (attribute instanceof Array) {
                result = attribute.join(', ');
            } else if (attribute instanceof MediaFile) {
                result = attribute.httpURL;
            } else if (attribute instanceof EnumValue || attribute instanceof Quantity) {
                result = attribute.value;
            } else if (attribute instanceof Date) {
                result = StringUtils.formatCalendar(new Calendar(attribute), 'dd/MM/yyyy HH:MM:SS');
            }
        } else {
            return attribute;
        }
    }
    return result;
}

/**
 * Get Default Value of attribute object
 * @param {Object} attrObject - attr object with id & value_type
 * @returns {string} attrValue
 */
function getDefaultValue(attrObject) {
    var attrValue = '';

    if (attrObject.value_type === 'boolean') {
        attrValue = false;
    }

    return attrValue;
}

/**
 * Get Custom Field Value
 * @param {dw.catalog.Product} product - api product
 * @param {Object} attrObject - attr object with id & value_type
 * @returns {string} attrValue
 */
function customField(product, attrObject) {
    var attrName = attrObject.id;
    if (attrName in product) {
        return getAttributeValue(product[attrName]);
    } else if (attrName in product.custom) {
        return getAttributeValue(product.custom[attrName]);
    }

    var attrValue = '';
    switch (attrName) {
        case 'productType':
            attrValue = require('*/cartridge/scripts/helpers/productType').getProductType(product);
            break;
        case 'category':
            attrValue = require('*/cartridge/scripts/helpers/category').getCategory(product);
            break;
        case 'inventory_status':
            attrValue = require('*/cartridge/scripts/helpers/inventory').getInventoryStatus(product);
            break;
        case 'inventory_level':
            attrValue = require('*/cartridge/scripts/helpers/inventory').getInventoryLevel(product);
            break;
        case 'sale_price':
            attrValue = require('*/cartridge/scripts/helpers/price').getPrice(product);
            break;
        case 'currencyCode':
            attrValue = session.currency.currencyCode; // eslint-disable-line
            break;
        case 'productURL':
            attrValue = require('*/cartridge/scripts/helpers/productUrl').getProductURL(product);
            break;
        case 'imageURL':
            attrValue = require('*/cartridge/scripts/helpers/imageUrl').getImageURL(product);
            break;
        default:
            attrValue = getDefaultValue(attrObject);
            break;
    }
    return attrValue;
}

module.exports = customField;
