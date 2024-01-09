MBA;
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
    ENGINE_RESULT_SELECTOR: '.b_algo',
    ENGINE_RESULT_LIST_CONTAINER: '#b_results',
    CITE_ELEMENT_SELECTOR: 'cite',


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
        if ( linkElement.parentElement ) {
            // Find result container
	    const resultContainer = document.querySelector( this.ENGINE_RESULT_LIST_CONTAINER );
            let oldElement = linkElement.closest( '.slide:has(.b_algo)' ) || linkElement.closest( ' .b_algo, .b_algo_group, #wikiWidgetContainer', '.pagereco_CBTextCard' );

            // Verify that the top-level result is a link to the same wiki
	    const topLevelLinkElement = oldElement.getElementsByTagName( 'a' )[ 0 ];
            if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
                return;
            }

            // If we're hidden - skip, we were already here
            if ( this.isLocked( oldElement ) ) {
                return;
            }

            this.lock( oldElement );

	    // Handles removing the card slides
	    if ( oldElement.id === 'wikiWidgetContainer' || oldElement.classList[ 0 ] === 'slide' ) {
                oldElement.style.display = 'none';
                return;
	    }

            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement, '.b_algo, .b_algo_group' );
                if ( officialResult ) {
                    // Move the official result before this one
                    const resultContainer = document.querySelector( this.ENGINE_RESULT_LIST_CONTAINER );
		    if ( oldElement.classList.contains( 'b_algo_group' ) ) {
                        oldElement = oldElement.parentNode;
		    }
                    resultContainer.insertBefore( officialResult, oldElement );
                }
            } else {
                // Insert a placeholder before this result
                resultContainer.insertBefore( this.makePlaceholderElement( wiki ), oldElement );
            }

            // Hides the main result element
            oldElement.style.display = 'none';
            // Creates a placeholder indicating the user that we removed the result
            oldElement.parentElement.prepend( this.makePlaceholderElement( wiki ), oldElement );
        }
    }
};


// Rewrites a Fandom result to an official wiki link to help users switch

const rewrite = {
    MARKER_ATTRIBUTE: 'data-lock',
    ENGINE_LAYOUT_SELECTOR: '#react-layout',
    TITLE_ELEMENT_SELECTOR: 'h2 > a, .b_title',
    NETWORK_TITLE_SELECTOR: 'tptt',
    CITE_ELEMENT_SELECTOR: 'cite',


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
            link.href = link.href.replace(
                new RegExp( `(https:\/\/)?${wiki.oldId || wiki.id}.fandom.com` ), `https://${wiki.id}.wiki.gg` );
        }
    },


    rewriteText( wiki, text ) {
        return text.replace( wiki.search.bingTitlePattern, wiki.search.newTitle );
    },


    rewriteTitle( wiki, node ) {
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
	    child.textContent = child.textContent.replace( new RegExp( `${wiki.oldId || wiki.id}.fandom.com` ), `${wiki.id}.wiki.gg` );

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
            const element = linkElement.closest( ' .slide:has(.b_algo) ' )
		  || linkElement.closest( ' .b_algo, .b_algo_group, #wikiWidgetContainer', '.pagereco_CBTextCard' );

	    if ( this.isLocked( element ) ) {
                return;
	    }

	    if ( element ) {
                const isTopLevel = a => {
                    return a.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` );
                };

                // Rewrite anchor href links
                for ( const a of element.getElementsByTagName( 'a' ) ) {
		    this.rewriteLink( wiki, a );
                }

                // Rewrite title and append a badge
                const titlePattern = new RegExp( wiki.search.bingTitlePattern );
                for ( const title of element.querySelectorAll( this.TITLE_ELEMENT_SELECTOR ) ) {
		    if ( titlePattern.test( title.textContent ) ) {
                        title.textContent = this.rewriteText( wiki, title.textContent );
                        title.parentElement.appendChild( this.makeBadgeElement( isTopLevel ) );
		    }
                }

                // Rewrite URL element
                for ( const url of element.querySelectorAll( this.CITE_ELEMENT_SELECTOR ) ) {
		    this.rewriteURLElement( wiki, url );
                }

                // Rewrite the network name in *some* cases.
                for ( const title of element.querySelectorAll( this.NETWORK_TITLE_SELECTOR ) ) {
		    if ( title.textContent === 'Fandom' ) { title.textContent = 'Wiki.gg'; }
                }

                // If the element is an sliding widget, we rewrite the network name.
                if ( element.attributes[ 0 ].value === 'wikiWidgetContainer' ) {
		    for ( const subheading of element.querySelectorAll( 'div[title="From Fandom"]' ) ) {
                        subheading.textContent = 'From wiki.gg';
		    }
                }
                // Rewrite the hastags in the element.
                element.querySelectorAll( '.tltg' )
		    .forEach( tag => tag.textContent = tag.textContent.replace( '#Fandom', '#Wiki.gg' ) );
                this.lock( element );
            }

	    document.querySelectorAll( 'div.b_suggestionText, .richrsrailsuggestion_text' )
                .forEach( suggestion => suggestion.textContent = suggestion.textContent.replace( 'fandom', 'wiki' ) );

        }
    }
};

// TODO: Migrate this from google.js and adapt it here ( We got a dynamic popup )
invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ) );
