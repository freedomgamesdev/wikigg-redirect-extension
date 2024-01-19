'use strict';


import { getWikis, getNativeSettings } from '../util.js';
import {
    prepareWikisInfo,
    invokeSearchModule,
    makePlaceholderElement,
    makeBadgeElement
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
    ENGINE_LAYOUT_SELECTOR: '#results',
    ENGINE_RESULT_CONTAINER_SELECTOR: '.svelte-eejxak',
    URL_ELEMENT_SELECTOR: '.snippet-url',
    SPAN_TITLE_ELEMENT_SELECTOR: '.heading-serpresult',
    BADGE_ELEMENT_SELECTOR: '.organic__title-wrapper', // What is this?
    ANCHOR_ELEMENT_SELECTOR: 'a.svelte-1dihpoi',


    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },

    clearChildren( element ) {
        element.textContent = '';
    },

    run( wiki, linkElement ) {
        if ( linkElement.parentElement ) {
            // Find result container
            const oldElement = linkElement.closest( this.ENGINE_RESULT_CONTAINER_SELECTOR );

            if ( oldElement !== null ) {
                const resultContainer = document.querySelector( this.ENGINE_LAYOUT_SELECTOR );
                // Verify that the top-level result is a link to the same wiki
                const topLevelLinkElement = oldElement.querySelector( this.ANCHOR_ELEMENT_SELECTOR );

                if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
                    return;
                }

                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement, this.ENGINE_RESULT_CONTAINER_SELECTOR );
                if ( officialResult ) {
                    // Move the official result before this one
                    resultContainer.insertBefore( officialResult, oldElement );
		    this.clearChildren( oldElement );
                    oldElement.append( makePlaceholderElement( wiki ) );
                } else {
                    // Insert a placeholder before this result
                    this.clearChildren( oldElement );
                    oldElement.append( makePlaceholderElement( wiki ) );
                }
            }
        }
    }
};


// Rewrites a Fandom result to an official wiki link to help users switch

const rewrite = {
    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_LAYOUT_SELECTOR: '#results',
    ENGINE_RESULT_CONTAINER_SELECTOR: '.svelte-eejxak',
    URL_ELEMENT_SELECTOR: '.snippet-url',
    SPAN_TITLE_ELEMENT_SELECTOR: '.heading-serpresult',
    BADGE_ELEMENT_SELECTOR: '.svelte-1dihpoi', // Element that will contain the badge.
    ANCHOR_ELEMENT_SELECTOR: 'a.svelte-1dihpoi',

    rewriteLink( wiki, link ) {
        link.href = link.href.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
    },

    rewriteText( wiki, text ) {
        return text.replace( wiki.search.titlePattern, wiki.search.newTitle );
    },


    rewriteTitle( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( child.textContent && child.textContent.length >= 5 ) {
                child.textContent = this.rewriteText( wiki, child.textContent );
            } else {
                this.rewriteTitle( wiki, child );
            }
        }
    },


    rewriteUrlElement( wiki, node ) {
        const urlRegex = new RegExp( `${wiki.oldId || wiki.id}.(fandom|gamepedia)?.com` );
        for ( const child of node.childNodes ) {
            child.textContent = child.textContent.replace( urlRegex, `${wiki.id}.wiki.gg` );
        }
    },


    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },

    run( wiki, linkElement ) {
        if ( linkElement !== null && !this.isLocked( linkElement ) ) {
            // Find result container
            const element = linkElement.closest( this.ENGINE_RESULT_CONTAINER_SELECTOR );

            const isTopLevel = linkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` );

            // Rewrite anchor href links
            for ( const a of element.getElementsByTagName( 'a' ) ) {
                this.rewriteLink( wiki, a );
            }

            // Rewrite title and append a badge
            for ( const span of element.querySelectorAll( this.SPAN_TITLE_ELEMENT_SELECTOR ) ) {
                if ( wiki.search.titlePattern.test( span.textContent ) ) {
                    this.rewriteTitle( wiki, span );
                }

            }

            // Rewrite URL element
            for ( const url of element.querySelectorAll( this.URL_ELEMENT_SELECTOR ) ) {
                this.rewriteUrlElement( wiki, url );
            }

            element.prepend( makeBadgeElement( isTopLevel, document.querySelector( '.theme--dark' ) ) );
            this.lock( linkElement );
        }
    }
};

new MutationObserver( callback =>
    invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ) ) )
    .observe( document.querySelector( '#results' ), {
        subtree: true,
        childList: true
    } );

