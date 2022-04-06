'use strict';

var ISML = require('dw/template/ISML');
var Site = require('dw/system/Site');
var currentSite = Site.getCurrent();
var URLUtils = require('dw/web/URLUtils');
var StringUtils = require('dw/util/StringUtils');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
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
 * @description Get the OAuth token for Client Credentials Grant
 * @returns {(Object|string)} Auth Token or object based on service response
 */
function getOCAPIOAuth2Token() {
    var tokenResponse;
    if (empty(currentSite.getCustomPreferenceValue('ocapiClientId')) || empty(currentSite.getCustomPreferenceValue('ocapiClientPassword'))) { // eslint-disable-line no-undef
        return {
            error: true,
            message: Resource.msg('lengow.ocapi.params.missing', 'lengow', null)
        };
    }
    var createRequest = function (ocapiService, _args) { // eslint-disable-line no-unused-vars
        var base64Credentials = StringUtils.encodeBase64(currentSite.getCustomPreferenceValue('ocapiClientId') + ':' + currentSite.getCustomPreferenceValue('ocapiClientPassword'));
        var url = StringUtils.format(ocapiService.URL, [currentSite.getCustomPreferenceValue('ocapiClientId')]);
        ocapiService.URL = url;
        ocapiService.addHeader('Content-Type', 'application/x-www-form-urlencoded');
        ocapiService.addHeader('Authorization', 'Basic ' + base64Credentials);
        ocapiService.setRequestMethod('POST');

        return ocapiService;
    };

    var parseResponse = function (_service, args) {
        return args.text;
    };

    var filterLogMessage = function (message) {
        return message;
    };

    var serviceCallback = {
        createRequest: createRequest,
        parseResponse: parseResponse,
        filterLogMessage: filterLogMessage
    };

    var service = LocalServiceRegistry.createService('LengowOAuthService', serviceCallback);
    var response = service.call();
    var responseObj = JSON.parse(response.object);
    if (responseObj) {
        tokenResponse = responseObj.access_token;
    } else {
        tokenResponse = {
            error: true,
            message: JSON.parse(response.errorMessage).error_description
        };
    }
    return tokenResponse;
}

/**
 * @description This function get the system object definitions for the OCAPI service passed
 * @param {string} serviceName Service Name
 * @returns {(Object|Null)} returns the response of OCAPI service called
 */
function callSystemObjectDefinitions(serviceName) {
    var authToken = getOCAPIOAuth2Token();
    var response;
    var createRequest = function (ocapiService, _args) { // eslint-disable-line no-unused-vars
        var host = currentSite.httpsHostName;
        var url = StringUtils.format(ocapiService.URL, [host, 'Product']);
        ocapiService.URL = url;
        ocapiService.addHeader('Content-Type', 'application/json');
        ocapiService.addHeader('Authorization', 'Bearer ' + authToken);
        ocapiService.setRequestMethod('GET');
        return ocapiService;
    };

    var parseResponse = function (_service, args) {
        return args.text;
    };

    var filterLogMessage = function (message) {
        return message;
    };

    var serviceCallback = {
        createRequest: createRequest,
        parseResponse: parseResponse,
        filterLogMessage: filterLogMessage
    };

    if (authToken && !authToken.error) {
        var service = LocalServiceRegistry.createService(serviceName, serviceCallback);
        response = service.call();
    } else {
        response = {
            error: true,
            message: authToken.message
        };
    }
    return response;
}

/**
 * @description This function get the system object definitions for the Product table with certain useful attributes
 * @returns {(Object|Null)} returns the attributes of product table in the required format
 */
function getProductSystemObjectDefinitions() {
    var cache = require('dw/system/CacheMgr').getCache('SystemObjectDefinitions');
    var pSystemObjectDefinitions = cache.get('productSystemObjectDefinitions', function loadProductSystemObjectDefinitions() {
        var sysObjResponse;
        var response = callSystemObjectDefinitions('LengowGetSystemObjectDefinitions');

        if (response.error) {
            var message = Resource.msg('api.error.occured', 'lengow', null);
            if (response.msg) {
                message = response.msg;
            } else if (response.message) {
                message = response.message;
            }
            sysObjResponse = {
                success: false,
                message: message
            };
        } else {
            var productSystemObjectDefinitions = JSON.parse(response.object).data;
            var output = [];
            productSystemObjectDefinitions.forEach(function (element) {
                if (element.id !== 'image' && element.id !== 'thumbnail') {
                    output.push({
                        id: element.id,
                        display_name: element.display_name,
                        system: element.system,
                        value_type: element.value_type,
                        valueTypeName: valueTypeNameMapping[element.value_type]
                    });
                }
            });
            sysObjResponse = {
                success: true,
                attributes: output
            };
        }
        return sysObjResponse;
    });
    if (!pSystemObjectDefinitions.success) {
        cache.invalidate('productSystemObjectDefinitions');
    }
    return pSystemObjectDefinitions;
}

/**
 * @description This Endpoint renders the main dasboard page where the merchant can choose mandatory and additional attributes
 */
function manage() {
    var productSystemObjectDefinitions = getProductSystemObjectDefinitions();
    var lengowMandatoryAttributesArray = getAttributes('lengowMandatoryAttributes');
    var lengowAdditionalAttributesArray = getAttributes('lengowAdditionalAttributes');
    var allowedLocales = Site.getCurrent().getAllowedLocales().toArray();
    var selectedLocales = currentSite.getCustomPreferenceValue('lengowSeletedLocales');
    // Should Be Valid Locales
    selectedLocales = selectedLocales.filter(function (localeID) {
        return allowedLocales.indexOf(localeID) >= 0;
    });

    var impexUrl = StringUtils.format('https://{0}/on/demandware.servlet/webdav/Sites/Impex', [currentSite.httpsHostName]);
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
        jobURL: jobURL
    });
}

/**
 * @description This Endpoint saves the selected attributes and renders the inner section of main dasboard page
 */
function submit() {
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
    var allowedLocales = Site.getCurrent().getAllowedLocales().toArray();
    var selectedLocales = currentSite.getCustomPreferenceValue('lengowSeletedLocales');
    // Should Be Valid Locales
    selectedLocales = selectedLocales.filter(function (localeID) {
        return allowedLocales.indexOf(localeID) >= 0;
    });

    var impexUrl = StringUtils.format('https://{0}/on/demandware.servlet/webdav/Sites/Impex', [currentSite.httpsHostName]);
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
        jobURL: jobURL
    });
}

/**
 * @description This Endpoint add or remove locale
 */
function updateLocale() {
    var params = request.httpParameterMap; // eslint-disable-line no-undef
    var localeID = params.localeID.value;
    var checked = params.checked.value === 'true';
    var allowedLocales = Site.getCurrent().getAllowedLocales().toArray();
    var selectedLocales = currentSite.getCustomPreferenceValue('lengowSeletedLocales');

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
        isAjax: true
    });
}

module.exports.Manage = manage;
module.exports.Manage.public = true;

module.exports.Submit = submit;
module.exports.Submit.public = true;

module.exports.UpdateLocale = updateLocale;
module.exports.UpdateLocale.public = true;
