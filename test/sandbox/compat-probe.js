'use strict';

/* eslint-disable no-eval, no-undef, vars-on-top, no-var */

/**
 * Lengow — sonde de mode de compatibilité SFCC.
 *
 * Répond à deux questions sur une instance donnée, sans rien deviner :
 *   1. Quel mode de compatibilité est réellement actif ?
 *   2. Les hypothèses du cartridge sur l'interop Java <-> JS tiennent-elles ici ?
 *
 * CE FICHIER N'EST PAS LIVRÉ DANS LE CARTRIDGE. C'est un outil de diagnostic.
 *
 * Contraintes d'écriture :
 *   - ES5 strict, parseable par TOUS les modes de compatibilité (10.4 → 22.7).
 *     Toute syntaxe ES6 écrite littéralement ferait échouer la compilation du
 *     fichier entier sur un mode ancien — les tests de syntaxe passent donc
 *     obligatoirement par eval().
 *   - Aucune écriture, aucune transaction. Lecture seule.
 *
 * Deux façons de l'exécuter :
 *   A. MCP sfcc-dev  → outil `evaluate_script`, coller le corps de probe()
 *   B. Job step      → déclarer un script-module-step pointant sur `run`
 */

/**
 * Teste si un fragment de syntaxe compile et s'exécute.
 * @param {string} src - source à évaluer
 * @returns {boolean} true si la syntaxe est supportée
 */
function syntaxWorks(src) {
    try {
        eval(src);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Teste si un module dw peut être requis.
 * @param {string} path - chemin du module, ex. 'dw/svc/ServiceRegistry'
 * @returns {boolean} true si le module existe
 */
function moduleExists(path) {
    try {
        return !!require(path);
    } catch (e) {
        return false;
    }
}

/**
 * Décrit ce qu'une valeur renvoyée par une API dw ressemble côté JS.
 * C'est exactement l'information qui change entre le mode 21.7 et le mode 22.7
 * et qui a cassé la sélection de locales (PCMT-1347).
 * @param {*} value - valeur à inspecter
 * @returns {Object} description structurée
 */
function shapeOf(value) {
    function attempt(fn) {
        try {
            return fn();
        } catch (e) {
            return 'THROWS: ' + (e.message || e);
        }
    }
    return {
        typeof: attempt(function () { return typeof value; }),
        isJSArray: attempt(function () { return Array.isArray(value); }),
        hasIterator: attempt(function () { return typeof value.iterator === 'function'; }),
        hasToArray: attempt(function () { return typeof value.toArray === 'function'; }),
        hasForEach: attempt(function () { return typeof value.forEach === 'function'; }),
        hasLength: attempt(function () { return typeof value.length; }),
        // Le point qui casse en 22.7 : toArray() renvoie un Object[] Java,
        // dépourvu de .filter et .indexOf.
        toArrayIsUsableJSArray: attempt(function () {
            if (typeof value.toArray !== 'function') { return 'n/a'; }
            var a = value.toArray();
            return typeof a.filter === 'function' && typeof a.indexOf === 'function';
        })
    };
}

/**
 * Détermine le mode de compatibilité actif par détection de capacités.
 *
 * L'échelle utilisée :
 *   22.7   globalThis, String.raw, Object.entries, littéraux de gabarit
 *   21.2   Symbol, Map, Set, Array.from, fonctions fléchées, let/const
 *   21.7   indiscernable de 21.2 côté langage — ses changements sont
 *          au niveau API (validation des cookies, ProductInventoryRecord).
 *          On le sépare via la disparition de getOnHand().
 *   19.10  dw.svc.ServiceRegistry supprimé
 *   <19.10 tout le reste
 *
 * @returns {Object} verdict et preuves
 */
function detectCompatibilityMode() {
    var ev = {
        globalThis: typeof globalThis !== 'undefined',
        stringRaw: typeof String !== 'undefined' && typeof String.raw === 'function',
        objectEntries: typeof Object.entries === 'function',
        objectValues: typeof Object.values === 'function',
        templateLiteral: syntaxWorks('var t = 1; `x${t}`;'),
        exponentOperator: syntaxWorks('2 ** 3;'),
        shorthandProps: syntaxWorks('var a = 1; ({ a });'),

        symbol: typeof Symbol !== 'undefined',
        map: typeof Map !== 'undefined',
        set: typeof Set !== 'undefined',
        arrayFrom: typeof Array !== 'undefined' && typeof Array.from === 'function',
        arrowFn: syntaxWorks('(function () { return eval("(() => 1)()"); })();'),
        letConst: syntaxWorks('eval("let x = 1; const y = 2; x + y;");'),
        forOf: syntaxWorks('eval("for (const v of [1]) { v; }");'),
        destructuring: syntaxWorks('eval("var [a] = [1]; a;");'),

        serviceRegistryStillPresent: moduleExists('dw/svc/ServiceRegistry'),
        localServiceRegistry: moduleExists('dw/svc/LocalServiceRegistry'),
        inventoryRecordHasGetOnHand: (function () {
            try {
                var PIR = require('dw/catalog/ProductInventoryRecord');
                return typeof PIR.prototype.getOnHand === 'function';
            } catch (e) {
                return 'undetermined';
            }
        }()),

        // ES5 — devrait être vrai partout à partir du mode 15.5
        objectDefineProperties: typeof Object.defineProperties === 'function',
        arrayForEach: typeof [].forEach === 'function',
        jsonParse: typeof JSON !== 'undefined' && typeof JSON.parse === 'function'
    };

    var verdict;
    var confidence;

    var isES6Plus = ev.symbol && ev.map && ev.set && ev.arrayFrom && ev.arrowFn && ev.letConst;
    var is227 = ev.globalThis && ev.stringRaw && ev.objectEntries && ev.templateLiteral;

    if (is227) {
        verdict = '22.7';
        confidence = 'high';
    } else if (isES6Plus) {
        if (ev.inventoryRecordHasGetOnHand === false) {
            verdict = '21.7';
            confidence = 'medium';
        } else if (ev.inventoryRecordHasGetOnHand === true) {
            verdict = '21.2';
            confidence = 'medium';
        } else {
            verdict = '21.2 ou 21.7';
            confidence = 'low — getOnHand() indéterminable';
        }
    } else if (!ev.serviceRegistryStillPresent && ev.localServiceRegistry) {
        verdict = '19.10 ou plus récent, mais < 21.2';
        confidence = 'medium';
    } else {
        verdict = '< 19.10';
        confidence = 'low';
    }

    return {
        activeCompatibilityMode: verdict,
        confidence: confidence,
        evidence: ev
    };
}

/**
 * Rejoue les hypothèses exactes sur lesquelles repose le cartridge.
 * @returns {Object} formes observées des collections critiques
 */
function probeCartridgeAssumptions() {
    var out = {};

    try {
        var Site = require('dw/system/Site');
        var site = Site.getCurrent();
        out.site = site ? site.getID() : null;
        out.getAllowedLocales = shapeOf(site.getAllowedLocales());
        out.lengowSeletedLocales = shapeOf(site.getCustomPreferenceValue('lengowSeletedLocales'));
    } catch (e) {
        out.siteError = e.message || String(e);
    }

    try {
        var SystemObjectMgr = require('dw/object/SystemObjectMgr');
        var def = SystemObjectMgr.describe('Product');
        out.getAttributeDefinitions = shapeOf(def.getAttributeDefinitions());
    } catch (e) {
        out.systemObjectMgrError = e.message || String(e);
    }

    // F4 — Site.getCurrent() est-il utilisable en contexte Organization ?
    // Exécuter ce probe dans un step org-scope tranche la question.
    try {
        var Site2 = require('dw/system/Site');
        var cur = Site2.getCurrent();
        out.siteGetCurrentInThisContext = cur === null ? 'null' : ('site:' + cur.getID());
    } catch (e) {
        out.siteGetCurrentInThisContext = 'THROWS: ' + (e.message || String(e));
    }

    return out;
}

/**
 * Point d'entrée unique.
 * @returns {string} rapport JSON
 */
function probe() {
    var report;
    try {
        report = {
            instance: (function () {
                try {
                    return require('dw/system/System').getInstanceType();
                } catch (e) { return 'unknown'; }
            }()),
            mode: detectCompatibilityMode(),
            cartridgeAssumptions: probeCartridgeAssumptions()
        };
    } catch (e) {
        report = { fatal: e.message || String(e) };
    }
    return JSON.stringify(report, null, 2);
}

/**
 * Enveloppe job step : écrit le rapport dans le log custom LENGOW.
 * @returns {dw.system.Status} statut OK
 */
function run() {
    var Status = require('dw/system/Status');
    var Logger = require('dw/system/Logger');
    Logger.getLogger('LENGOW', 'compatProbe').error('COMPAT PROBE\n{0}', probe());
    return new Status(Status.OK);
}

module.exports = {
    probe: probe,
    run: run,
    detectCompatibilityMode: detectCompatibilityMode,
    probeCartridgeAssumptions: probeCartridgeAssumptions
};
