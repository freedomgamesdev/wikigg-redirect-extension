/** @typedef {import( '../util.js' ).SiteRecord} SiteRecord */

import { getNativeSettings } from '../util.js';
import defaultSettingsFactory from '../../defaults.js';
import { constructReplacementMarker } from './components.js';


/**
 * @abstract
 */
export class SearchModule {
    /**
     * @abstract
     * @protected
     * @return {string}
     */
    getId() {
        throw new Error( `${this.constructor.name}.getId not implemented.` );
    }


    /**
     * @abstract
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async replaceResult( wikiInfo, containerElement, foundLinkElement ) {
        throw new Error( `${this.constructor.name}.replaceResult not implemented.` );
    }


    /**
     * @abstract
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async hideResult( wikiInfo, containerElement, foundLinkElement ) {
        throw new Error( `${this.constructor.name}.hideResult not implemented.` );
    }


    /**
     * @abstract
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async disarmResult( wikiInfo, containerElement, foundLinkElement ) {
        throw new Error( `${this.constructor.name}.disarmResult not implemented.` );
    }


    /**
     * Finds a general result container for a given element, if any.
     *
     * @abstract
     * @protected
     * @param {HTMLElement} element Element to find result container for.
     * @return {HTMLElement?}
     */
    resolveResultContainer( element ) {
        throw new Error( `${this.constructor.name}._resolveResultContainer not implemented.` );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} boundaryElement
     * @return {HTMLElement?}
     */
    findNearestGgResult( wikiInfo, boundaryElement ) {
        return null;
    }


    static async invoke( wikis, rootNode ) {
        rootNode = rootNode || document;

        const instance = new ( this )(),
            id = instance.getId();

        // TODO: `sfs` is not available yet
        getNativeSettings().local.get( [
            'sfs',
            'disabledWikis'
        ], result => {
            const
                defaults = defaultSettingsFactory(),
                mode = result.sfs[ id ] || defaults.sfs[ id ],
                doRoutine = instance[ {
                    filter: 'hideResult',
                    rewrite: 'replaceResult',
                    disarm: 'disarmResult'
                }[ mode ] ];

            if ( !doRoutine ) {
                return;
            }

            const disabledWikis = ( result && result.disabledWikis || defaults.disabledWikis );

            // TODO: merge selectors and run that query, then determine the wiki
            for ( const wikiInfo of wikis ) {
                if ( wikiInfo.bannerOnly || disabledWikis.includes( wikiInfo.id ) ) {
                    continue;
                }

                for ( const element of rootNode.querySelectorAll( wikiInfo.search.badSelector ) ) {
                    const container = this.resolveResultContainer( element );
                    if ( container !== null && container.parentElement !== null ) {
                        doRoutine( wikiInfo, container, element );
                    }
                }
            }
        } );
    }
}


/**
 * @abstract
 */
export class GenericSearchModule extends SearchModule {
    DISABLED_RESULT_CLASS = 'ggr-disarmed';


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} _foundLinkElement
     */
    async hideResult( wikiInfo, containerElement, _foundLinkElement ) {
        // Try to find the first wiki.gg result after this one
        const ggResult = this.findNearestGgResult( wikiInfo, containerElement );

        let replacement;
        if ( ggResult ) {
            replacement = ggResult;
        } else {
            replacement = constructReplacementMarker( wikiInfo );
        }
        containerElement.parentNode.replaceChild( replacement, containerElement );
    }


    /**
     * @protected
     * @param {SiteRecord} wikiInfo
     * @param {HTMLElement} containerElement
     * @param {HTMLElement} foundLinkElement
     */
    async disarmResult( wikiInfo, containerElement, foundLinkElement ) {
        const controlElement = constructDisabledResultControl( wikiInfo );
        containerElement.prepend( controlElement );
        containerElement.classList.add( this.DISABLED_RESULT_CLASS );
    }
}


export function invokeSearchModule( wikis, rewriteRoutine, filterRoutine, rootNode ) {
    const defaults = defaultSettingsFactory();
    rootNode = rootNode || document;

    getNativeSettings().local.get( [ 'searchMode', 'disabledWikis' ], result => {
        const mode = ( result || defaults ).searchMode || 'rewrite',
            doRoutine = ( {
                filter: filterRoutine,
                rewrite: rewriteRoutine
            } )[ mode ];

        if ( !doRoutine ) {
            return;
        }

        const disabledWikis = ( result && result.disabledWikis || defaults.disabledWikis );

        // TODO: merge selectors and run that query, then determine the wiki
        for ( const wiki of wikis ) {
            if ( wiki.bannerOnly || disabledWikis.includes( wiki.id ) ) {
                continue;
            }

            for ( const element of rootNode.querySelectorAll( wiki.search.badSelector ) ) {
                doRoutine( wiki, element );
            }
        }
    } );
}


export function prepareWikisInfo( wikis, options ) {
    for ( const wiki of wikis ) {
        // Generate search properties if not provided already
        if ( !wiki.search ) {
            wiki.search = {};
        }
        if ( options.titles ) {
            if ( !wiki.search.titlePattern ) {
                const escapedName = ( wiki.search.oldName || wiki.name ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
                // eslint-disable-next-line security/detect-non-literal-regexp
                wiki.search.titlePattern = new RegExp( `(Official )?${escapedName} (\\| |- )?(Wiki|Fandom)( (-|\\|) Fandom)?$`,
                    'i' );
            }
            if ( !wiki.search.placeholderTitle ) {
                wiki.search.placeholderTitle = `${wiki.search.oldName || wiki.name} Fandom`;
            }
            if ( !wiki.search.newTitle ) {
                wiki.search.newTitle = ( wiki.search.official ? 'Official ' : '' ) + `${wiki.name}`;
                if ( !wiki.search.newIncludesWiki ) {
                    wiki.search.newTitle += ' Wiki';
                }
            }
        }
        if ( options.selectors ) {
            wiki.search.goodSelector = 'a[href*="://' + wiki.id + '.wiki.gg"]';
            wiki.search.badSelector = ( wiki.oldIds || [ wiki.oldId || wiki.id ] ).map(
                id => `a[href*="://${id}.fandom.com"], a[href*="://${id}.gamepedia.com"]` ).join( ', ' );
        }
    }

    return wikis;
}


// Looks for a search result container by walking an element's parents
export function crawlUntilParentFound( element, selector, maxDepth = 10 ) {
    if ( maxDepth > 0 && element.parentElement ) {
        if ( element.matches( selector ) ) {
            return element;
        }
        return crawlUntilParentFound( element.parentElement, selector, maxDepth - 1 );
    }
    return null;
}


export function awaitElement( knownParent, selector, callback ) {
    let node = knownParent.querySelector( selector );
    if ( node ) {
        return callback( node );
    }

    const observer = new MutationObserver( () => {
        node = knownParent.querySelector( `:scope > ${selector}` );
        if ( node ) {
            observer.disconnect();
            return callback( node );
        }
    } );
    observer.observe( knownParent, {
        childList: true
    } );
}
export function makePlaceholderElement( wiki ) {
    const element = document.createElement( 'span' );
    element.innerHTML = 'Result from ' + wiki.search.placeholderTitle + ' hidden by wiki.gg redirector';
    element.style.color = '#5f6368';
    element.classList.add( 'filter_badge' );
    element.style.padding = '0px 0px 1em 10px';
    element.style.display = 'block';
    return element;
}

export function makeBadgeElement( isTopLevel, isDarkMode ) {
    const out = document.createElement( 'span' );
    out.innerText = isTopLevel ? 'redirected' : 'some redirected';
    out.style.backgroundColor = isDarkMode
        ? '#ffffff'
        : '#0002';
    out.style.color = '#232323';
    out.style.fontSize = '70%';
    out.style.borderRadius = '4px';
    out.style.padding = '1px 6px';
    out.style.marginLeft = '0px';
    out.style.opacity = '0.6';
    out.style.textDecoration = 'none';
    out.style.verticalAlign = 'middle';
    out.classList.add( 'rewrite_badge' );
    return out;
}
