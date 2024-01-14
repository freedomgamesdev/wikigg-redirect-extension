'use strict';


import { getWikis, getNativeSettings } from './util.js';
import {
    prepareWikisInfo,
    invokeSearchModule,
    awaitElement
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
    ENGINE_RESULT_SELECTOR: '.yQDlj3B5DI5YO8c8Ulio',
    ENGINE_RESULT_LIST_CONTAINER: '.react-results--main',
    URL_ELEMENT_SELECTOR: '.Wo6ZAEmESLNUuWBkbMxx',
    ANCHOR_ELEMENT_SELECTOR: '.Rn_JXVtoPVAFyGkcaXyK',
    SPAN_TITLE_ELEMENT_SELECTOR: '.EKtkFWMYpwzMKOYr0GYm',


    lock( element ) {
        element.setAttribute( this.MARKER_ATTRIBUTE, '1' );
    },


    isLocked( element ) {
        return element.getAttribute( this.MARKER_ATTRIBUTE ) === '1';
    },


    makePlaceholderElement( wiki ) {
        const element = document.createElement( 'span' );
        element.innerHTML = 'Result from ' + wiki.search.placeholderTitle + ' hidden by wiki.gg redirector';
        element.style.color = '#5f6368';
        element.classList.add( 'filter_badge' );
        element.style.padding = '0px 0px 1em 10px';
        element.style.display = 'block';
        return element;
    },


    run( wiki, linkElement ) {
        if ( linkElement.parentElement && document.querySelector( this.ENGINE_RESULT_LIST_CONTAINER ).contains( linkElement ) ) {
            // Find result container
            const oldElement = linkElement.closest( 'article' );
            // If we're hidden - skip, we were already here
            if ( oldElement.style.display === 'none' ) {
                return;
            }

            // Verify that the top-level result is a link to the same wiki
            const topLevelLinkElement = oldElement.querySelector( this.ANCHOR_ELEMENT_SELECTOR );
            if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
                return;
            }

            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement, 'article' );
                if ( officialResult ) {
                    // Move the official result before this one
                    const resultContainer = document.querySelector( this.ENGINE_RESULT_LIST_CONTAINER );
                    resultContainer.insertBefore( officialResult.parentNode, oldElement.parentElement );
                }
            } else {
                // Insert a placeholder before this result
                const resultContainer = document.querySelector( this.ENGINE_RESULT_LIST_CONTAINER );
                resultContainer.insertBefore( this.makePlaceholderElement( wiki ), oldElement.parentNode );
            }

            // Hides the main result element
            oldElement.style.display = 'none';
            // Creates a placeholder indicating the user that we removed the result
            oldElement.parentElement.prepend( this.makePlaceholderElement( wiki ), oldElement );
            this.lock( linkElement );
        }
    }
};


// Rewrites a Fandom result to an official wiki link to help users switch

const rewrite = {
    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_LAYOUT_SELECTOR: '#react-layout',
    URL_ELEMENT_SELECTOR: '.Wo6ZAEmESLNUuWBkbMxx',
    SPAN_TITLE_ELEMENT_SELECTOR: '.eVNpHGjtxRBq_gLOfGDr span',
    ANCHOR_ELEMENT_SELECTOR: '.Rn_JXVtoPVAFyGkcaXyK span',


    makeBadgeElement( isTopLevel ) {
        const out = document.createElement( 'span' );
        out.innerText = isTopLevel ? 'redirected' : 'some redirected';
        out.style.backgroundColor = document.documentElement.classList.contains( 'dark-bg' )
            ? '#a7a7a7'
            : '#0002';
        out.style.color = 'black';
        out.style.fontSize = '70%';
        out.style.borderRadius = '4px';
        out.style.padding = '1px 6px';
        out.style.marginLeft = '4px';
        out.style.opacity = '0.6';
        out.style.textDecoration = 'none';
        out.style.verticalAlign = 'middle';
        out.classList.add( 'rewrite_badge' );
        return out;
    },


    rewriteLink( wiki, link ) {
        if ( link.href.startsWith( '/url?' ) ) {
            link.href = ( new URLSearchParams( link.href ) ).get( 'url' );
        } else {
            link.href = link.href.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
        }
    },


    rewriteText( wiki, text ) {
        return text.replace( wiki.search.titlePattern, wiki.search.newTitle );
    },


    rewriteSpan( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( child.textContent ) {
                child.textContent = this.rewriteText( wiki, child.textContent );
            } else {
                this.rewriteSpan( wiki, child );
            }
        }
    },


    rewriteURLElement( wiki, node ) {
        for ( const child of node.childNodes ) {
            if ( /(?<=.+):\/\//.test( child.textContent ) ) {
                continue;
            }
            child.textContent = child.textContent.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
        }
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
            const element = linkElement.closest( 'article' );

            const isTopLevel = a => {
                return a.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` );
            };

            if ( element !== null && !this.isLocked( element ) ) {
                // Rewrite anchor href links
                for ( const a of element.getElementsByTagName( 'a' ) ) {
                    this.rewriteLink( wiki, a );
                }

		
                // Rewrite title and append a badge
                for ( const span of element.querySelectorAll( this.SPAN_TITLE_ELEMENT_SELECTOR ) ) {
                    if ( !wiki.search.titlePattern.test( span.textContent ) ) {
                        continue;
                    }

                    this.rewriteSpan( wiki, span );
                }

		
                element.querySelector( this.SPAN_TITLE_ELEMENT_SELECTOR ).appendChild( this.makeBadgeElement( isTopLevel ) );
                // Rewrite URL element
                for ( const url of element.querySelectorAll( this.ANCHOR_ELEMENT_SELECTOR ) ) {
                    this.rewriteURLElement( wiki, url );
                }


                this.lock( element );
            }
        }
    }
};


getNativeSettings().local.get( [ 'ddgEnable' ], result => {
    if ( result.ddgEnable || result.ddgEnable === undefined ) {
        awaitElement(
            document.getElementById( 'react-layout' ),
            'div > div > section',
            sectionNode => {
                awaitElement(
                    sectionNode,
                    '.react-results--main',
                    node => {
                        invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ), node );
                    }
                );
            }
        );
    }
} );
