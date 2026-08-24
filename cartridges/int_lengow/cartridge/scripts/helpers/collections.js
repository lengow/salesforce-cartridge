'use strict';

/**
 * Collection interop helpers.
 *
 * This module is the SINGLE source of truth for converting SFCC/Java collections
 * into plain JavaScript arrays. It used to be copy-pasted into both
 * bm_lengow/.../LengowController.js and int_lengow/.../decorators/generateCatalog.js,
 * and the two copies had already drifted apart once (see commit d49fbe1,
 * "align toArray() in generateCatalog.js with robust controller version").
 * Since this is the exact code that fixes the compatibility mode 22.7 locale bug
 * (PCMT-1347), a second divergence would silently reintroduce that bug.
 *
 * Written in strict ES5 so it parses under every compatibility mode, and deliberately
 * free of any dw.* dependency so it stays trivially testable and reusable from both cartridges.
 */

/**
 * @description Converts a Collection, Set, Java array or other iterable to a plain Array.
 *
 * Behaviour differs across compatibility modes:
 *  - up to 21.7: dw.util.Collection exposes toArray() returning a JS-friendly array
 *  - 22.7:       Java interop changed. Collection.toArray() returns a Java Object[]
 *                which does NOT carry JS Array methods (.filter, .indexOf, .push...),
 *                so calling .filter() on it throws.
 *
 * Accessing a non-existent property on a Java object can throw rather than return
 * undefined, so every probe is wrapped in try/catch.
 *
 * Strategy order matters:
 *  1. Java iterator  — works for every Java Collection in both 21.7 and 22.7 and
 *                      always yields a real JS Array.
 *  2. toArray() + manual copy — must come before Array.from(), because
 *                      Array.from({toArray: fn}) silently returns [] instead of failing.
 *  3. Array.from()   — native JS Sets (22.7+) and Java arrays. ES6 only, hence the typeof guard.
 *  4. forEach()      — JS Sets and some Java collections.
 *  5. length/index   — array-like fallback.
 *
 * @param {(dw.util.Collection|dw.util.Set|Array|Object)} value The value to convert
 * @returns {Array} Plain JavaScript Array, never null
 */
function toArray(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }

    try {
        if (typeof value.iterator === 'function') {
            var iter = value.iterator();
            var items = [];
            while (iter.hasNext()) {
                items.push(iter.next());
            }
            return items;
        }
    } catch (e) {
        // fallthrough
    }

    try {
        if (typeof value.toArray === 'function') {
            var javaArr = value.toArray();
            var arr = [];
            for (var i = 0; i < javaArr.length; i++) {
                arr.push(javaArr[i]);
            }
            return arr;
        }
    } catch (e) {
        // fallthrough
    }

    try {
        if (typeof Array.from === 'function') {
            return Array.from(value);
        }
    } catch (e) {
        // fallthrough
    }

    try {
        if (typeof value.forEach === 'function') {
            var forEachResult = [];
            value.forEach(function (item) {
                forEachResult.push(item);
            });
            return forEachResult;
        }
    } catch (e) {
        // fallthrough
    }

    try {
        var len = value.length;
        if (typeof len === 'number') {
            var result = [];
            for (var j = 0; j < len; j++) {
                result.push(value[j]);
            }
            return result;
        }
    } catch (e) {
        // fallthrough
    }

    return [];
}

module.exports = {
    toArray: toArray
};
