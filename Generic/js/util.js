import sites from '../sites.json';


export function supportsDNR() {
    return false && navigator.userAgent.indexOf( 'Chrome' ) < 0;
};


function _unpackSiteArray( entities, withSpacers ) {
    let out = [];
    for ( const entity of entities ) {
        // Skip spacers if they have not been requested
        if ( !withSpacers && 'spacer' in entity ) {
            continue;
        }

        // Recurse if an array, or append
        if ( Array.isArray( entity ) ) {
            out = out.concat( _unpackSiteArray( entity, withSpacers ) );
        } else {
            out.push( entity );
        }
    }
    return out;
}


export function getWikis( withSpacers ) {
    return _unpackSiteArray( sites, withSpacers );
};


export function getNativeSettings() {
    return chrome && chrome.storage || window.storage;
}
