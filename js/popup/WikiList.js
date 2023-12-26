/** @typedef {import( '../util.js' ).SiteListEntity} SiteListEntity */

import {
    getWikis,
    createDomElement,
    getMessage
} from "../util.js"; 


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
        const wikis = getWikis( true, false, false );

        const siteList = this.#createSiteList( wikis );
        container.appendChild( this.#createSearch( siteList ) );
        container.appendChild( siteList );
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
                                'data-setting-id': 'disabledWikis',
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
