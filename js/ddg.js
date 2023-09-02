'use strict';


import { getWikis } from './util.js';
import {
    prepareWikisInfo,
    invokeSearchModule,
    crawlUntilParentFound
} from './baseSearch.js';


const wikis = prepareWikisInfo( getWikis( false, true ), {
    titles: true,
    selectors: true
} );


// Looks for a search result for a wiki.gg wiki
function findNextOfficialWikiResult( wiki, oldElement, selector ) {
    for ( const node of document.querySelectorAll( wiki.search.goodSelector ) ) {
        if ( node.compareDocumentPosition( oldElement ) & 0x02 ) {
            return crawlUntilParentFound( node, selector );
        }
    }
    return null;
}

function assembleMutationObserver(callback, config) {
    const observer = new MutationObserver(callback);
    config = config || { attributes: true, childList: true, subtree: true };
    observer.observe(document, config);
    return observer;

}
// Replaces a Fandom result with an official wiki result or a placeholder
const filter = {
	
    ENGINE_RESULT_SELECTOR: 'yQDlj3B5DI5YO8c8Ulio',
    URL_ELEMENT_SELECTOR: '.Wo6ZAEmESLNUuWBkbMxx',
    SPAN_TITLE_ELEMENT_SELECTOR: 'EKtkFWMYpwzMKOYr0GYm',
    
    makePlaceholderElement( wiki ) {
        const element = document.createElement( 'span' );
        element.innerHTML = 'Result from ' + wiki.search.placeholderTitle + ' hidden by wiki.gg redirector';
        element.style.paddingBottom = '1em';
        element.style.display = 'inline-block';
        element.style.color = '#5f6368';
        return element;
    },


    run( wiki, linkElement ) {
            // Find result container
            const oldElement = crawlUntilParentFound( linkElement, ENGINE_RESULT_SELECTOR );

            // Verify that the top-level result is a link to the same wiki
            const topLevelLinkElement = oldElement.querySelector( 'Rn_JXVtoPVAFyGkcaXyK');
            if ( topLevelLinkElement && !topLevelLinkElement.href.startsWith( `https://${wiki.oldId || wiki.id}.fandom.com` ) ) {
                return;
            }

            if ( oldElement !== null ) {
                // Find an official wiki result after this one
                const officialResult = findNextOfficialWikiResult( wiki, oldElement, ENGINE_RESULT_SELECTOR );
                if ( officialResult ) {
                    // Move the official result before this one
                    oldElement.parentNode.insertBefore( officialResult, oldElement );
                } else {
                    // Insert a placeholder before this result
                    oldElement.parentNode.insertBefore( this.makePlaceholderElement( wiki ), oldElement );
                }
                // Delete this result
                oldElement.remove();
            }
        }
};


// Rewrites a Fandom result to an official wiki link to help users switch

const rewrite = {
    MARKER_ATTRIBUTE: 'data-ark',
    // TODO: do not hardcode any selectors!
    
    ENGINE_LAYOUT_SELECTOR: '#react-layout',
    ENGINE_RESULT_SELECTOR: 'yQDlj3B5DI5YO8c8Ulio',
    URL_ELEMENT_SELECTOR: '.Wo6ZAEmESLNUuWBkbMxx',
    SPAN_TITLE_ELEMENT_SELECTOR: 'EKtkFWMYpwzMKOYr0GYm',
    

    makeBadgeElement( isTopLevel ) {
        const out = document.createElement( 'span' );
        out.innerText = isTopLevel ? 'redirected' : 'some redirected';
        out.style.backgroundColor = window.matchMedia("(prefers-color-scheme: dark)").matches || document.getElementsByTagName('html')[0].classList.contains("dark-bg")   ?
	    '#a7a7a7' :
	    '#0002'
	out.style.color = 'black';
        out.style.fontSize = '70%';
        out.style.borderRadius = '4px';
        out.style.padding = '1px 6px';
        out.style.marginLeft = '4px';
        out.style.opacity = '0.6';
	out.style.textDecoration = 'none';
	out.style.css = 'vertical-align: middle';
        return out;
    },


    rewriteLink( wiki, link ) {
        if ( link.tagName.toLowerCase() == 'a' ) {
            if ( link.href.startsWith( '/url?' ) ) {
                link.href = ( new URLSearchParams( link.href ) ).get( 'url' );
            } else {
                link.href = link.href.replace( `${wiki.oldId || wiki.id}.fandom.com`, `${wiki.id}.wiki.gg` );
            }
            if ( link.getAttribute( 'data-jsarwt' ) ) {
                link.setAttribute( 'data-jsarwt', '0' );
            }
            if ( link.getAttribute( 'ping' ) ) {
                link.setAttribute( 'ping', null );
            }
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

    
    rewriteURLElement(wiki, node) {
	
	const oldUrlRegex = new RegExp(`${wiki.oldId || wiki.id}.(:?miraheze|fandom).(:?com|org)`);

//	regex ::= <protocol> <colon> <double-slash>
	for (const child of node.childNodes) {
	  if (/(?<=.+):\/\//.test(child.textContent)) {
	      continue;
	  }
	  
	  child.textContent = child.textContent.replace(oldUrlRegex, `${wiki.id}.wiki.gg`);
      }
  },

    fallbackRetriveURLSelector() {
	
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
        const element = crawlUntilParentFound( linkElement, this.ENGINE_RESULT_SELECTOR );

	const isTopLevel = (a) => {
	    return a.href.startsWith(
		`https://${wiki.oldId || wiki.id}.fandom.com`);
	};
	
	// Check all a relements in the result and verify that it's a link to the same wiki
	
	for ( const a of element.getElementsByTagName('a')) {
	    if(isTopLevel(a))
		break;
	}
	
        if ( !this.isLocked(element) ) {

	    
	    // Add a redirected badge
            if ( element !== null ) {
                const titleHeader = element.querySelector( `.${this.SPAN_TITLE_ELEMENT_SELECTOR}` );
                if ( titleHeader ) {
                    titleHeader.parentElement.appendChild( this.makeBadgeElement( isTopLevel ) );
                    this.lock( titleHeader );
                }
		// Rewrite href links
		for ( const a of element.getElementsByTagName("a")) {
		    this.rewriteLink( wiki, a );
		}
                // Rewrite title
                for ( const span of element.getElementsByTagName( 'span' ) ) {
		     if( !span.classList.contains( this.SPAN_TITLE_ELEMENT_SELECTOR ) ) {
			continue;
		    }

                    this.rewriteSpan( wiki, span );
		
                    this.lock( element );
                    this.lock( span );
                }
                // Rewrite URL element
                for ( const url of element.querySelectorAll( this.URL_ELEMENT_SELECTOR )) {
                    this.rewriteURLElement( wiki, url ) 
                }
		
            //    for ( const moreResults of element.querySelectorAll( this.MORE_FROM_NETWORK_SELECTOR ) ) {
              //      moreResults.href = moreResults.href.replace( 'site:fandom.com', 'site:wiki.gg' )
                //        .replace( `site:${wiki.oldId || wiki.id}.fandom.com`, `site:${wiki.id}.wiki.gg` );
                  //  moreResults.innerText = moreResults.innerText.replace( 'fandom.com', 'wiki.gg' );
                //}
	    }
        }
	}
    }
};


function observedRun() {
    if ( document.querySelector('#react-layout'))
	if (document.querySelector(rewrite.URL_ELEMENT_SELECTOR) > 0) {
	    
	}
	invokeSearchModule( wikis, rewrite.run.bind( rewrite ), filter.run.bind( filter ) );
}

assembleMutationObserver(observedRun);
