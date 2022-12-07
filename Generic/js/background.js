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
    DNR_RULE_ID: 1,

    settings: {
        isRedirectDisabled: false,
        disabledWikis: [],
        useTabRedirect: true //navigator.userAgent.indexOf( 'Chrome' ) < 0
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
        if ( this.settings.isRedirectDisabled ) {
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


    _onBeforeNavigate( info ) {
        RTW.decideRedirect( info );
    },


    updateMV3DynamicRuleSets() {
        // TODO: unused for now
        if ( !this.settings.useTabRedirect ) {
            chrome.declarativeNetRequest.updateDynamicRules( {
                addRules: [ {
                    id: RTW.DNR_RULE_ID,
                    action: {
                        type: 'redirect',
                        redirect: {
                            regexSubstition: ''
                        }
                    },
                    condition: {
                        regexFilter: '',
                        resourceTypes: [ 'main_frame' ]
                    }
                } ]
            } );
        } else {

        }
    },

    
    updateEventHandlers() {
        this.settings.useTabRedirect = true;

        if ( this.settings.useTabRedirect ) {
            chrome.webNavigation.onBeforeNavigate.addListener( this._onBeforeNavigate );
            this._isTabRedirectInstalled = true;
        } else if ( this._isTabRedirectInstalled ) {
            chrome.webNavigation.onBeforeNavigate.removeListener( this._onBeforeNavigate );
            this._isTabRedirectInstalled = false;
        }

        if ( !this.settings.useTabRedirect ) {

        }
    },

    
    mergeStorageChunk( chunk ) {
        const oldIRD = this.settings.isRedirectDisabled;
        for ( const key in chunk ) {
            this.settings[key] = chunk[key];
        }
        if ( this.settings.isRedirectDisabled !== oldIRD ) {
            this.updateIcon();
        }

        this.updateEventHandlers();
    },

    
    mergeStorageDiffChunk( chunk ) {
        let obj = {};
        for ( const key in chunk ) {
            obj[key] = chunk[key].newValue;
        }
        this.mergeStorageChunk( obj );
    }
};


storage.onChanged.addListener( ( changes, _ ) => RTW.mergeStorageDiffChunk( changes ) );
storage.local.get( Object.keys( RTW.settings ), result => RTW.mergeStorageChunk( result ) )
