import {
    createDomElement,
    getMessage
} from "../util.js";


/**
 * @typedef {Object} SearchEngineInfo
 * @property {string} id
 * @property {boolean} supportsFilter
 * @property {boolean} supportsRewrite
 */


export default class SearchFilterSettings {
    /** @type {SearchEngineInfo[]} */
    static engines = [
        {
            id: 'google',
            supportsFilter: true,
            supportsRewrite: true,
        },
        {
            id: 'ddg',
            supportsFilter: true,
            supportsRewrite: true,
        },
    ];


    /**
     * @param {HTMLTableElement} table
     */
    static initialise( table ) {
        const tbody = table.tBodies[ 0 ];
        for ( const info of this.engines ) {
            // TODO: settings integration doesn't do sub-keys yet
            createDomElement( 'tr', {
                html: [
                    createDomElement( 'td', {
                        text: getMessage( `sfs_engine_${info.id}` ),
                    } ),
                    createDomElement( 'td', {
                        html: this.#createRadio( `sfs_mode_${info.id}`, 'sfs_rewrite', `sfs.${info.id}`, 'rewrite',
                            false ),
                    } ),
                    createDomElement( 'td', {
                        html: this.#createRadio( `sfs_mode_${info.id}`, 'sfs_filter', `sfs.${info.id}`, 'filter',
                            false ),
                    } ),
                    createDomElement( 'td', {
                        html: this.#createRadio( `sfs_mode_${info.id}`, 'sfs_rewrite', `sfs.${info.id}`, 'none',
                            true ),
                    } ),
                ],
                appendTo: tbody
            } );
        }
    }


    static #createRadio( id, tooltipMsg, settingId, settingValue, meansInactive ) {
        return createDomElement( 'input', {
            attributes: {
                type: 'radio',
                name: id,
                title: getMessage( tooltipMsg ),
                'data-setting-id': settingId,
                'data-value': settingValue,
                'data-means-inactive': meansInactive ? true : null
            }
        } );
    }
}
