/** @typedef {import( '../util.js' ).SiteListEntity} SiteListEntity */

import {
    getWikis,
    createDomElement,
    getMessage
} from "../util.js";
import {
    getForKey,
    setAtKey
} from './DeclarativeSettings.js';


const
    DEPRECATED_ENABLE_LEGACY_GROUPING = false,
    ENABLE_SEARCH = false,
    ENABLE_QC = true;


function debounce( callback, wait ) {
    let timeoutId = null;
    return ( ...args ) => {
        clearTimeout( timeoutId );
        timeoutId = setTimeout( () => callback( ...args ), wait );
    };
}


export default class WikiList {
    /**
     * @param {HTMLElement} container
     */
    static initialise( container ) {
        const wikis = getWikis( DEPRECATED_ENABLE_LEGACY_GROUPING, false, !DEPRECATED_ENABLE_LEGACY_GROUPING );
        const siteList = this.#createSiteList( wikis );

        createDomElement( 'div', {
            classes: [ 'site-list-wrapper' ],
            html: [
                createDomElement( 'div', {
                    classes: [ 'site-list__shelf' ],
                    html: [
                        ENABLE_QC ? this.#createQuickControls( wikis, siteList ) : null,
                    ],
                } ),
                ENABLE_SEARCH ? this.#createSearch( siteList ) : null,
                siteList
            ],
            appendTo: container,
        } );
    }


    static #createSearch( container ) {
        return createDomElement( 'div', {
            classes: [ 'site-list__search-box' ],
            html: createDomElement( 'input', {
                attributes: {
                    type: 'text',
                    placeholder: getMessage( 'sites_search_pl' ),
                },
                events: {
                    keydown: debounce( event => {
                        const value = event.target.value.trim().toLowerCase();
                        for ( const element of container.querySelectorAll( '.site-list__entry > label' ) ) {
                            const isVisible = element.innerText.toLowerCase().includes( value );
                            element.parentNode.setAttribute( 'data-is-filtered-out', !isVisible );
                        }
                    }, 50 ),
                }
            } ),
        } );
    }

    
    static #createQuickControls( wikis ) {
        const processGlobalToggleClick = value => {
            if ( value ) {
                setAtKey( 'disabledWikis', [] );
            } else {
                const allKeys = wikis.map( el => el.id );
                setAtKey( 'disabledWikis', allKeys );
            }
        };

        return createDomElement( 'div', {
            classes: [ 'site-list__qc' ],
            html: [
                createDomElement( 'button', {
                    attributes: {
                        'aria-label': 'More options...',
                    },
                    events: {
                        click: event => {
                            event.target.parentNode.classList.toggle( 'site-list__qc--is-open' );
                        },
                    },
                } ),
                createDomElement( 'div', {
                    html: [
                        createDomElement( 'button', {
                            text: 'Select all',
                            events: {
                                click: event => {
                                    processGlobalToggleClick( true );
                                },
                            },
                        } ),
                        createDomElement( 'button', {
                            text: 'Deselect all',
                            events: {
                                click: event => {
                                    processGlobalToggleClick( false );
                                },
                            },
                        } ),
                    ],
                } ),
            ]
        } );
    }


    /**
     * @param {( SiteListEntity[] | SiteListEntity )[]} wikis
     * @return {HTMLElement}
     */
    static #createSiteList( wikis ) {
        const result = createDomElement( 'div', {
            classes: [ 'site-list' ],
        } );

        for ( const pack of wikis ) {
            // Recurse if this is a site group
            if ( Array.isArray( pack ) ) {
                result.appendChild( this.#createSiteList( pack ) );
            } else if ( 'spacer' in pack ) {
                createDomElement( 'h3', {
                    classes: [ 'site-list__heading' ],
                    text: pack.spacer,
                    appendTo: result,
                } );
            } else {
                createDomElement( 'div', {
                    classes: [ 'site-list__entry' ],
                    attributes: {
                        'data-wiki-id': pack.id,
                    },
                    html: [
                        createDomElement( 'input', {
                            attributes: {
                                type: 'checkbox',
                                id: `site-list__toggle--${pack.id}`,
                                'data-component': 'DeclarativeSettings',
                                'data-key': 'disabledWikis',
                                'data-array-value': pack.id,
                                'data-on': 'false',
                                'data-off': 'true',
                            },
                        } ),
                        createDomElement( 'label', {
                            attributes: {
                                for: `site-list__toggle--${pack.id}`,
                            },
                            text: pack.name,
                        } ),
                        createDomElement( 'a', {
                            classes: [ 'site-list__site-link' ],
                            attributes: {
                                href: `https://${pack.id}.wiki.gg`,
                                target: '_blank',
                            },
                        } ),
                    ],
                    appendTo: result,
                } );
            }
        }

        return result;
    }
}
