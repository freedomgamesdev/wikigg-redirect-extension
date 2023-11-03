import { supportsDNR } from './js/util.js';


/**
 * @typedef {Object} ExtensionSettings
 * @property {false|banner|true} isRedirectDisabled Whether Fandom sites should be redirected.
 * @property {'none'|'filter'|'rewrite'} searchMode Search integration behaviour choice.
 * @property {boolean} ddgEnable Whether DuckDuckGo search integration should be enabled.
 * @property {string[]} disabledWikis List of disabled wikis, by ID.
 * @property {boolean} useTabRedirect Whether legacy redirection method should be used. Not implemented.
 */


/**
 * Returns default extension settings.
 *
 * @return {ExtensionSettings}
 */
export default function () {
    return {
        isRedirectDisabled: false,
        searchMode: 'rewrite',
        ddgEnable: true,
        disabledWikis: [],
        useTabRedirect: !supportsDNR()
    };
}
