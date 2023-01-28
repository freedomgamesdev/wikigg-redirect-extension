import sites from '../sites.json';


export function supportsDNR() {
    return false && navigator.userAgent.indexOf( 'Chrome' ) < 0;
};


function _unpackSiteArray( entities, options ) {
    options = options || {};

    let out = [];
    for ( const entity of entities ) {
        // Skip spacers if they have not been requested
        if ( ( !options.withSpacers && 'spacer' in entity ) || ( !options.withVirtuals && 'parentRef' in entity ) ) {
            continue;
        }

        // Recurse if an array, or append
        if ( Array.isArray( entity ) ) {
            out = out.concat( _unpackSiteArray( entity, options ) );
        } else {
            out.push( entity );
        }
    }

    return out;
}


export function getWikis( withSpacers, withVirtuals ) {
    const out = _unpackSiteArray( sites, {
        withSpacers,
        withVirtuals
    } );

    if ( withVirtuals ) {
        for ( const entity of out ) {
            // Resolve the parent reference for virtual entries (wiki alternative redirects). Copy properties that aren't specified.
            if ( 'parentRef' in entity ) {
                entity.parentRef = out.find( x => x.id === entity.parentRef );
                entity.id = entity.parentRef.id;
                entity.name = entity.parentRef.name;
                entity.official = entity.parentRef.official;
            }
        }
    }

    return out;
};


export function getNativeSettings() {
    return chrome && chrome.storage || window.storage;
}
