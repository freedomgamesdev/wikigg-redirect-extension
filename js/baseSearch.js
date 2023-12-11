import { getNativeSettings } from './util.js';
import defaultSettingsFactory from '../defaults.js';


/**
 * @abstract
 */
export class SearchModule {
    getId() {
        throw new Error( `${this.constructor.name}.getId not implemented.` );
    }

    async replaceResults() {
        throw new Error( `${this.constructor.name}.replaceResults not implemented.` );
    }

    async filterResults() {
        throw new Error( `${this.constructor.name}.filterResults not implemented.` );
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
                    filter: 'filterResults',
                    rewrite: 'replaceResults'
                }[ mode ] ];

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
