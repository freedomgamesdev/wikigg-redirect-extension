( function () {
    'use strict';

    const wikis = [
        // TODO: share this list with other parts of the extension
        { id: 'ark', name: 'ARK: Survival Evolved' },
        { id: 'temtem', name: 'Temtem' },
        { id: 'terraria', name: 'Terraria' },
        { id: 'undermine', name: 'UnderMine' },
    ];

    const domains = wikis.map( item => item.id ).join( '|' );
    const domainRegex = new RegExp( `^((${domains})\\.fandom|(${domains})\\.gamepedia|(${domains})-[a-z]+\\.gamepedia)\\.com$`, 'i' );

    let isAddonDisabled = false,
        disabledWikis = [];
    const storage = chrome && chrome.storage || window.storage;


    function updateIcon() {
        const icon = {
            path: ( isAddonDisabled ? '/icons/32_black.png' : '/icons/32.png' )
        };
        if ( chrome && chrome.action && chrome.action.setIcon ) {
            chrome.action.setIcon( icon );
        } else {
            chrome.browserAction.setIcon( icon );
        }
    }


    // Redirect from Fandom onto the official wiki
    chrome.webNavigation.onBeforeNavigate.addListener( info => {
        if ( isAddonDisabled ) {
            return;
        }

        const url = new URL( info.url );

        // Check if the URL matches our regex
        if ( !domainRegex.test( url.host ) ) {
            return;
        }

        const oldWikiDomain = url.host.split( '.' )[0].toLowerCase();
        const domainParts = oldWikiDomain.split( '-' );
        let wikiId = domainParts[0];
        let newPath = url.pathname;

        if ( disabledWikis.indexOf( wikiId ) >= 0 ) {
            return;
        }

        if ( domainParts.length > 1 ) {
            let languageCode = domainParts[1];
            if ( languageCode == 'ptbr' ) {
                languageCode = 'pt-br';
            }
            newPath = `/${ languageCode }${ newPath }`;
        }

        chrome.tabs.update( info.tabId, {
            url: `https://${ wikiId }.wiki.gg${ newPath }`
        } );
    });


    function updateIsEnabled() {
        storage.local.get( [ 'isRedirectDisabled', 'disabledWikis' ], result => {
            isAddonDisabled = result ? result.isRedirectDisabled : false;
            disabledWikis = result && result.disabledWikis || [];
            updateIcon();
        } );
    }


    storage.onChanged.addListener( ( changes, _ ) => {
        updateIsEnabled();
    } );
    updateIsEnabled();
} )();
