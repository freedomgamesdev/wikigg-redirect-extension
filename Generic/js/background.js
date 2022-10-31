'use strict';

const storage = chrome && chrome.storage || window.storage,
    wikis = [
    // TODO: share this list with other parts of the extension
    { id: 'ark', name: 'ARK: Survival Evolved' },
    { id: 'noita', name: 'Noita' },
    { id: 'temtem', name: 'Temtem' },
    { id: 'terraria', name: 'Terraria' },
    { id: 'calamitymod', name: 'Calamity Mod' },
    { id: 'thoriummod', name: 'Thorium Mod' },
    { id: 'undermine', name: 'UnderMine' },
];


const RTW = {
    settings: {
        isRedirectDisabled: false,
        disabledWikis: []
    },
    domainRegex: ( () => {
        const domains = wikis.map( item => item.id ).join( '|' );
        return new RegExp( `^((${domains})\\.fandom|(${domains})\\.gamepedia|(${domains})-[a-z]+\\.gamepedia)\\.com$`, 'i' );
    } )(),


    updateIcon() {
        const icon = {
            path: ( this.settings.isRedirectDisabled ? '/icons/32_black.png' : '/icons/128.png' )
        };
        if ( chrome && chrome.action && chrome.action.setIcon ) {
            chrome.action.setIcon( icon );
        } else {
            chrome.browserAction.setIcon( icon );
        }
    },

    
    decideRedirect( info ) {
        if ( this.isRedirectDisabled ) {
            return;
        }

        const url = new URL( info.url );

        // Check if the URL matches our regex
        if ( !this.domainRegex.test( url.host ) ) {
            return;
        }

        const oldWikiDomain = url.host.split( '.' )[0].toLowerCase();
        const domainParts = oldWikiDomain.split( '-' );
        let wikiId = domainParts[0];
        let newPath = url.pathname;
        if ( this.settings.disabledWikis.indexOf( wikiId ) >= 0 ) {
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
    },

    
    mergeStorageChunk( chunk ) {
        const oldIRD = this.settings.isRedirectDisabled;

        for ( const key in chunk ) {
            this.settings[key] = chunk[key];
        }

        if ( this.settings.isRedirectDisabled !== oldIRD ) {
            this.updateIcon();
        }
    }
};


chrome.webNavigation.onBeforeNavigate.addListener( info => RTW.decideRedirect( info ) );
storage.onChanged.addListener( ( changes, _ ) => RTW.mergeStorageChunk( changes ) );
storage.local.get( [ 'isRedirectDisabled', 'disabledWikis' ], result => RTW.mergeStorageChunk( result ) )
