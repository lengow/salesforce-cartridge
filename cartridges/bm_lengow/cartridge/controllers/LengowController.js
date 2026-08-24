'use strict';

var ISML = require('dw/template/ISML');
var Site = require('dw/system/Site');
var currentSite = Site.getCurrent();
var URLUtils = require('dw/web/URLUtils');
var StringUtils = require('dw/util/StringUtils');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var CSRFProtection = require('dw/web/CSRFProtection');
var collections = require('*/cartridge/scripts/helpers/collections');
var valueTypeNameMapping = {
    string: 'String',
    text: 'Text',
    html: 'HTML',
    int: 'Integer',
    double: 'Number',
    boolean: 'Boolean',
    date: 'Date',
    datetime: 'Date+Time',
    image: 'Image',
    email: 'Email',
    password: 'Password',
    set_of_string: 'Set of Strings',
    set_of_int: 'Set of Integers',
    set_of_double: 'Set of Numbers',
    enum_of_string: 'Enum of Strings',
    enum_of_int: 'Enum of Integers',
    quantity: 'Quantity'
};

/**
 * @description parse json object without throwing error. In case invalid JSON String returns null
 * @param {string} str JSON string
 * @returns {(Object|Null)} Parsed JSON object or null in case of the exception during parsing
 */
function parseJSON(str) {
    var response;
    try {
        if (!empty(str)) { // eslint-disable-line no-undef
            response = JSON.parse(str);
        } else {
            response = {
                system: [],
                custom: []
            };
        }
    } catch (e) {
        response = null;
    }
    return response;
}

/**
 * @description This function get the attribute ids present in the site preference passed
 * @param {string} attributeName Attribute Name
 * @returns {Array} array of attributes present in the site preference
 */
function getAttributes(attributeName) {
    var attributeJson = parseJSON(currentSite.getCustomPreferenceValue(attributeName));
    var attributeArray = [];

    if (attributeJson) {
        attributeJson.system.forEach(function (element) {
            attributeArray.push(element.id);
        });
        attributeJson.custom.forEach(function (element) {
            attributeArray.push(element.id);
        });
    }
    return attributeArray;
}

/**
 * @description This function get the system object definitions for the Product table with certain useful attributes
 * Uses the native SFCC SystemObjectMgr API — no OCAPI or OAuth required.
 * @returns {(Object|Null)} returns the attributes of product table in the required format
 */
function getProductSystemObjectDefinitions() {
    var cache = require('dw/system/CacheMgr').getCache('SystemObjectDefinitions');
    var pSystemObjectDefinitions = cache.get('productSystemObjectDefinitions', function loadProductSystemObjectDefinitions() {
        var SystemObjectMgr = require('dw/object/SystemObjectMgr');
        var ObjectAttributeDefinition = require('dw/object/ObjectAttributeDefinition');

        var valueTypeCodeMapping = {};
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_INT] = 'int';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_NUMBER] = 'double';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_STRING] = 'string';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_TEXT] = 'text';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_HTML] = 'html';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_DATE] = 'date';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_IMAGE] = 'image';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_BOOLEAN] = 'boolean';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_QUANTITY] = 'quantity';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_DATETIME] = 'datetime';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_EMAIL] = 'email';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_PASSWORD] = 'password';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_SET_OF_INT] = 'set_of_int';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_SET_OF_NUMBER] = 'set_of_double';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_SET_OF_STRING] = 'set_of_string';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_INT] = 'enum_of_int';
        valueTypeCodeMapping[ObjectAttributeDefinition.VALUE_TYPE_ENUM_OF_STRING] = 'enum_of_string';

        try {
            var typeDefinition = SystemObjectMgr.describe('Product');
            var attributeDefs = collections.toArray(typeDefinition.getAttributeDefinitions());
            var output = [];
            attributeDefs.forEach(function (attrDef) {
                var attrId = attrDef.getID();
                if (attrId !== 'image' && attrId !== 'thumbnail') {
                    var valueType = valueTypeCodeMapping[attrDef.getValueTypeCode()] || 'string';
                    output.push({
                        id: attrId,
                        display_name: { default: attrDef.getDisplayName() },
                        system: attrDef.isSystem(),
                        value_type: valueType,
                        valueTypeName: valueTypeNameMapping[valueType] || valueType
                    });
                }
            });
            return {
                success: true,
                attributes: output
            };
        } catch (e) {
            return {
                success: false,
                message: e.message || e.toString()
            };
        }
    });
    if (!pSystemObjectDefinitions.success) {
        cache.invalidate('productSystemObjectDefinitions');
    }
    return pSystemObjectDefinitions;
}

/**
 * @description Renders a minimal error fragment when a POST fails CSRF validation.
 * Both write endpoints are AJAX, so the response replaces a page region; a bare
 * message is enough and avoids leaking any state to a forged request.
 */
function renderCsrfFailure() {
    ISML.renderTemplate('lengow/csrffailure', {
        errorMessage: Resource.msg('csrf.validation.failed', 'lengow', null)
    });
}

/**
 * @description This Endpoint renders the main dasboard page where the merchant can choose mandatory and additional attributes
 */
function manage() {
    try {
        var productSystemObjectDefinitions = getProductSystemObjectDefinitions();
        var lengowMandatoryAttributesArray = getAttributes('lengowMandatoryAttributes');
        var lengowAdditionalAttributesArray = getAttributes('lengowAdditionalAttributes');
        var allowedLocales = collections.toArray(currentSite.getAllowedLocales());
        var selectedLocales = collections.toArray(currentSite.getCustomPreferenceValue('lengowSeletedLocales'));
        // Should Be Valid Locales
        selectedLocales = selectedLocales.filter(function (localeID) {
            return allowedLocales.indexOf(localeID) >= 0;
        });

        var impexUrl = StringUtils.format('https://{0}/on/demandware.servlet/webdav/Sites/Impex', currentSite.httpsHostName);
        var jobURL = URLUtils.url('ViewApplication-BM', 'SelectedMenuItem', 'operations', 'CurrentMenuItemId', 'operations', 'screen', 'job', 'menuactionid', 'jobschedules').toString();

        ISML.renderTemplate('lengow/lengowMainDashboard', {
            success: productSystemObjectDefinitions.success,
            errorMessage: productSystemObjectDefinitions.success ? '' : productSystemObjectDefinitions.message,
            productSystemObjectDefinitions: productSystemObjectDefinitions,
            lengowMandatoryAttributesArray: lengowMandatoryAttributesArray,
            lengowAdditionalAttributesArray: lengowAdditionalAttributesArray,
            allowedLocales: allowedLocales,
            selectedLocales: selectedLocales,
            impexUrl: impexUrl,
            jobURL: jobURL,
            csrfToken: CSRFProtection.generateToken()
        });
    } catch (e) {
        ISML.renderTemplate('lengow/lengowMainDashboard', {
            success: false,
            errorMessage: Resource.msg('api.error.occured', 'lengow', null) + ' (' + (e.message || e.toString()) + ')',
            productSystemObjectDefinitions: { success: false, attributes: [] },
            lengowMandatoryAttributesArray: [],
            lengowAdditionalAttributesArray: [],
            allowedLocales: [],
            selectedLocales: [],
            impexUrl: '',
            jobURL: '',
            csrfToken: CSRFProtection.generateToken()
        });
    }
}

/**
 * @description This Endpoint saves the selected attributes and renders the inner section of main dasboard page
 */
function submit() {
    if (!CSRFProtection.validateRequest()) {
        renderCsrfFailure();
        return;
    }
    var params = request.httpParameterMap;// eslint-disable-line no-undef
    if (params.type.stringValue !== 'reset') {
        Transaction.wrap(function () {
            if (params.type.stringValue === 'mandatory') {
                currentSite.preferences.custom.lengowMandatoryAttributes = params.attributesJSON.stringValue;
            } else {
                currentSite.preferences.custom.lengowAdditionalAttributes = params.attributesJSON.stringValue;
            }
        });
    }

    var productSystemObjectDefinitions = getProductSystemObjectDefinitions();
    var lengowMandatoryAttributesArray = getAttributes('lengowMandatoryAttributes');
    var lengowAdditionalAttributesArray = getAttributes('lengowAdditionalAttributes');
    var allowedLocales = collections.toArray(currentSite.getAllowedLocales());
    var selectedLocales = collections.toArray(currentSite.getCustomPreferenceValue('lengowSeletedLocales'));
    // Should Be Valid Locales
    selectedLocales = selectedLocales.filter(function (localeID) {
        return allowedLocales.indexOf(localeID) >= 0;
    });

    var impexUrl = StringUtils.format('https://{0}/on/demandware.servlet/webdav/Sites/Impex', currentSite.httpsHostName);
    var jobURL = URLUtils.url('ViewApplication-BM', 'SelectedMenuItem', 'operations', 'CurrentMenuItemId', 'operations', 'screen', 'job', 'menuactionid', 'jobschedules').toString();

    ISML.renderTemplate('lengow/lengowContent', {
        success: productSystemObjectDefinitions.success,
        errorMessage: productSystemObjectDefinitions.success ? '' : productSystemObjectDefinitions.message,
        productSystemObjectDefinitions: productSystemObjectDefinitions,
        lengowMandatoryAttributesArray: lengowMandatoryAttributesArray,
        lengowAdditionalAttributesArray: lengowAdditionalAttributesArray,
        allowedLocales: allowedLocales,
        selectedLocales: selectedLocales,
        impexUrl: impexUrl,
        jobURL: jobURL,
        csrfToken: CSRFProtection.generateToken()
    });
}

/**
 * @description This Endpoint add or remove locale
 */
function updateLocale() {
    if (!CSRFProtection.validateRequest()) {
        renderCsrfFailure();
        return;
    }
    var params = request.httpParameterMap; // eslint-disable-line no-undef
    var localeID = params.localeID.value;
    var checked = params.checked.value === 'true';
    var allowedLocales = collections.toArray(currentSite.getAllowedLocales());
    var selectedLocales = collections.toArray(currentSite.getCustomPreferenceValue('lengowSeletedLocales'));

    selectedLocales = selectedLocales.filter(function (item) {
        return allowedLocales.indexOf(item) >= 0;
    });

    if (allowedLocales.indexOf(localeID) >= 0) {
        if (checked && selectedLocales.indexOf(localeID) === -1) {
            selectedLocales.push(localeID);
        } else if (!checked && selectedLocales.indexOf(localeID) >= 0) {
            selectedLocales = selectedLocales.filter(function (item) {
                return item !== localeID;
            });
        }
    }

    Transaction.wrap(function () {
        currentSite.preferences.custom.lengowSeletedLocales = selectedLocales;
    });

    ISML.renderTemplate('lengow/tabs/localedropdown', {
        allowedLocales: allowedLocales,
        selectedLocales: selectedLocales,
        isAjax: true,
        csrfToken: CSRFProtection.generateToken()
    });
}

module.exports.Manage = manage;
module.exports.Manage.public = true;

module.exports.Submit = submit;
module.exports.Submit.public = true;

module.exports.UpdateLocale = updateLocale;
module.exports.UpdateLocale.public = true;
