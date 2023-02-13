import { getNativeSettings } from './util.js';
import defaultSettingsFactory from '../defaults.js';


export function invokeSearchModule( wikis, rewriteRoutine, filterRoutine ) {
    const defaults = defaultSettingsFactory();
    getNativeSettings().local.get( [ 'searchMode', 'disabledWikis' ], result => {
        const mode = ( result || defaults ).searchMode || 'rewrite';

        for ( const wiki of wikis ) {
            if ( ( result && result.disabledWikis || defaults.disabledWikis ).indexOf( wiki.id ) >= 0 ) {
                continue;
            }

            switch ( mode ) {
                case 'filter':
                    document.querySelectorAll( wiki.search.badSelector ).forEach( element => filterRoutine( wiki, element ) );
                    break;
                case 'rewrite':
                    document.querySelectorAll( wiki.search.badSelector ).forEach( element => rewriteRoutine( wiki, element ) );
                    break;
            }
        }
    } );
};


export function prepareWikisInfo( wikis, options ) {
    for ( const wiki of wikis ) {
        // Generate search properties if not provided already
        if ( !wiki.search ) {
            wiki.search = {};
        }
        if ( options.titles ) {
            if ( !wiki.search.titlePattern ) {
                const escapedName = ( wiki.search.oldName || wiki.name ).replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
                wiki.search.titlePattern = new RegExp( `(Official )?${escapedName} (Wiki|Fandom)( (-|\\|) Fandom)?$`, 'i' );
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
};


// Looks for a search result container by walking an element's parents
export function crawlUntilParentFound( element, cssClass, maxDepth = 10 ) {
    if ( maxDepth > 0 && element.parentElement ) {
        if ( element.classList.contains( cssClass ) ) {
            return element;
        }
        return crawlUntilParentFound( element.parentElement, cssClass, maxDepth - 1 );
    }
    return null;
};
