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
            createDomElement( 'tr', {
                html: [
                    createDomElement( 'td', {
                        text: getMessage( `sfs_engine_${info.id}` ),
                    } ),
                    this.#createRadioCell( `sfs_mode_${info.id}`, 'sfs_rewrite', `sfs.${info.id}.mode`, 'rewrite',
                        false ),
                    this.#createRadioCell( `sfs_mode_${info.id}`, 'sfs_filter', `sfs.${info.id}.mode`, 'filter',
                        false ),
                    this.#createRadioCell( `sfs_mode_${info.id}`, 'sfs_rewrite', `sfs.${info.id}.mode`, 'none',
                        true ),
                ],
                appendTo: tbody
            } );
        }
    }


    static #createRadioCell( id, tooltipMsg, key, settingValue, meansInactive ) {
        return createDomElement( 'td', {
            html: createDomElement( 'input', {
                attributes: {
                    type: 'radio',
                    name: id,
                    title: getMessage( tooltipMsg ),
                    'data-component': 'DeclarativeSettings',
                    'data-key': key,
                    'data-value': settingValue,
                    'data-means-inactive': meansInactive ? true : null
                }
            } )
        } );
    }
}
