/** @type {( SiteListEntity | SiteListEntity[] )[]} */
import sites from '../sites.json';
import defaultSettingsFactory from '../defaults.js';


/**
 * Checks if the extension wasn't packaged for store.
 *
 * @return {boolean}
 */
export function isDevelopmentBuild() {
    return chrome.runtime.getManifest().name.includes( 'DEVBUILD' );
}


/**
 * Returns localised message or key as fallback.
 *
 * @param {string} key
 * @param {...any} params
 * @return {string}
 */
export function getMessage( key, ...params ) {
    const msg = chrome.i18n.getMessage( key, ...params );
    return msg || key;
}


/**
 * Checks if declarative network requests are supported by the browser.
 *
 * @return {boolean}
 */
export function supportsDNR() {
    return false; // navigator.userAgent.indexOf( 'Chrome' ) < 0;
}


/**
 * Returns the extension's storage interface.
 *
 * TODO: Untyped return value.
 *
 * @deprecated since 20241011, use chrome.storage directly
 * @return {any}
 */
export function getNativeSettings() {
    return chrome && chrome.storage || window.storage;
}


function _fetchDeepKey( obj, path ) {
    let itIndex = 0;
    // eslint-disable-next-line no-empty
    while ( itIndex < path.length && ( obj = obj[ path[ itIndex++ ] ] ) ) {}
    return obj ?? null;
}


export async function getOption( path ) {
    return new Promise( resolve => {
        const segments = path.split( '.' );
        chrome.storage.local.get( segments[ 0 ], result => {
            resolve( _fetchDeepKey( result, segments ) ?? _fetchDeepKey( defaultSettingsFactory.SHARED, segments ) );
        } );
    } );
}


/**
 * @typedef {Object} DomElementFactoryOptions
 * @property {string[]?} [classes]
 * @property {string} [text]
 * @property {string|HTMLElement|HTMLElement?[]} [html]
 * @property {Record<string, string|undefined|boolean|number>} [attributes]
 * @property {Partial<CSSStyleDeclaration>} [style]
 * @property {Partial<{
 *     [ P in keyof HTMLElementEventMap ]: ( ( event: HTMLElementEventMap[ P ] ) => void ) | ( () => void )
 * }>} [events]
 * @property {HTMLElement} [appendTo]
 * @property {HTMLElement} [prependTo]
*/

/**
 * @param {keyof HTMLElementTagNameMap} tag
 * @param {DomElementFactoryOptions} options
 * @return {HTMLElement}
 */
export function createDomElement( tag, options ) {
    const result = document.createElement( tag );
    if ( options.text ) {
        result.innerText = options.text;
    }
    if ( options.html ) {
        if ( typeof options.html === 'string' ) {
            result.innerHTML = options.html;
        } else if ( Array.isArray( options.html ) ) {
            for ( const element of options.html ) {
                if ( element ) {
                    result.appendChild( element );
                }
            }
        } else {
            result.appendChild( options.html );
        }
    }
    if ( options.classes ) {
        result.classList.add( ...options.classes );
    }
    if ( options.attributes ) {
        for ( const key in options.attributes ) {
            const value = options.attributes[ key ];
            if ( value !== undefined && value !== null ) {
                result.setAttribute( key, `${value}` );
            }
        }
    }
    if ( options.style ) {
        for ( const key in options.style ) {
            const value = options.style[ key ];
            if ( value !== undefined && value !== null ) {
                result.style[ key ] = value;
            }
        }
    }
    if ( options.events ) {
        for ( const name in options.events ) {
            const listener = options.events[ name ];
            if ( listener ) {
                result.addEventListener( name, listener );
            }
        }
    }
    if ( options.appendTo ) {
        options.appendTo.appendChild( result );
    }
    if ( options.prependTo ) {
        options.prependTo.prepend( result );
    }
    return result;
}
