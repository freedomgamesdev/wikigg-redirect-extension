'use strict';


import { getWikis } from '../util.js';
import { constructRedirectBadge, constructReplacementMarker } from './components.js';
import {
    prepareWikisInfo,
    invokeSearchModule
} from './baseSearch.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


// Looks for a search result for a wiki.gg wiki
function findNextOfficialWikiResult( wiki, oldElement, selector ) {
    for ( const node of document.querySelectorAll( wiki.search.goodSelector ) ) {
        if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
            return node.closest( selector );
        }
    }
    return null;
}


// Replaces a Fandom result with an official wiki result or a placeholder
const filter = {

    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_LAYOUT_SELECTOR: '.w-gl',
    ENGINE_RESULT_CONTAINER_SELECTOR: '.w-gl__desktop__result', // This result is different than filtering!.
    ANCHOR_ELEMENT_SELECTOR: '.w-gl__result-url-container > .result-link',
    
    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },

    run( wiki, linkElement ) {
        if ( linkElement.parentElement && document.querySelector( this.ENGINE_LAYOUT_SELECTOR ).contains( linkElement ) ) {
            // Find result container
            const oldElement = linkElement.closest( this.ENGINE_RESULT_CONTAINER_SELECTOR );
            const resultContainer = document.querySelector( this.ENGINE_LAYOUT_SELECTOR );

            // Verify that the top-level result is a link to the same wiki
            const topLevelLinkElement = oldElement.querySelector( this.ANCHOR_ELEMENT_SELECTOR );
            if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
                return;
            }

            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement, this.ENGINE_RESULT_CONTAINER_SELECTOR );
                if ( officialResult ) {
                    // Move the official result before this one
                    resultContainer.insertBefore( officialResult, oldElement );
                } else {
                    // Insert a placeholder before this result
                    resultContainer.insertBefore( constructReplacementMarker( wiki ), oldElement );
                }

          	oldElement.remove();
            }
        }
    }
};


// Rewrites a Fandom result to an official wiki link to help users switch

const rewrite = {
    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_RESULT_CONTAINER_SELECTOR: '.w-gl__result__main',
    URL_ELEMENT_SELECTOR: '.w-gl__result-url',
    TITLE_ELEMENT_SELECTOR: '.w-gl__result-title',
    BADGE_ELEMENT_SELECTOR: '.organic__title-wrapper',
    
    rewriteText( wiki, text ) {
        return text.replace( wiki.search.titlePattern, wiki.search.newTitle );
    },

    rewriteLink( wiki, link ) {
        link.href = link.href.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
    },


    rewriteTitle( wiki, node ) {
        node.textContent = this.rewriteText( wiki, node.textContent );
    },

    rewriteUrlElement( wiki, node ) {
        node.textContent = node.textContent.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
    },


    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },

    run( wiki, linkElement ) {
        if ( linkElement !== null ) {
            // Find result container
            const element = linkElement.closest( this.ENGINE_RESULT_CONTAINER_SELECTOR );

            if ( element !== null && !this.isLocked( element ) ) {
                // Rewrite anchor href links
                for ( const a of element.getElementsByTagName( 'a' ) ) {
                    this.rewriteLink( wiki, a );
                }

                // Rewrite title and append a badge
                for ( const titleElement of element.querySelectorAll( this.TITLE_ELEMENT_SELECTOR ) ) {
                    this.rewriteTitle( wiki, titleElement );
                }

                this.rewriteUrlElement( wiki, element.querySelector( this.URL_ELEMENT_SELECTOR ) );

                element.prepend( constructRedirectBadge( {
		    isMobile: true,
		    allMoved: true
		    },
		    {
                    display: 'inline-block',
                    marginBottom: '4px'
		    } ) );

                this.lock( element );
            }
        }
    }
};

awaitElement(
    '.w-gl--desktop',
    '.w-gl--desktop',
    node => {
        invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ), node );
    }
);
