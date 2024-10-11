import { getOption } from './util.js';


//
// Sites lists follow a version scheme of:
//    AAIIIPPP.RUNTIME LIST TIMESTAMP
//    where:
//        A - extension major
//        I - extension minor
//        P - extension patch
// for example bundled list of v1.7.14 would have a version of
//    01007014.0
// and a runtime list released on October 11th, 2024 6:00 am UTC at the time of v1.7.14
//    01007014.202410110600
//


export async function getBundledVersion() {
    const manifestVersion = chrome.runtime.getManifest().version.split( '.' ),
        extMajor = parseInt( manifestVersion[ 0 ] ),
        extMinor = parseInt( manifestVersion[ 1 ] ),
        extPatch = parseInt( manifestVersion[ 2 ] );
    return ( extPatch + extMinor * 10e3 + extMajor * 10e6 ) * 1.0;
}


export async function getRuntimeVersion() {
    return getOption( 'rtList.version' );
}


export async function loadStaticSitesList() {
    return fetch( chrome.extension.getURL( '/sites.json' ) )
        .then( r => r.json() );
}


export async function loadRuntimeSitesList() {
    return getOption( 'rtList.data' );
}


export async function loadBestAvailableSitesList() {
    const
        bundledVer = await getBundledVersion(),
        runtimeVer = await getRuntimeVersion();

    if ( runtimeVer > bundledVer ) {
        return loadRuntimeSitesList();
    }

    return loadStaticSitesList();
}


// TODO: sites v2


// TODO: ditch uiClass, have spacers contain entries instead so popup is able to render the list sanely.


/**
 * @typedef {Object} SiteRecord
 * Record of an individual wiki.
 * @property {string} id wiki.gg domain name.
 * @property {string} [oldId] Fandom domain name, if different from wiki.gg.
 * @property {string} name Site name shown in page titles.
 * @property {boolean} [official=false] Whether official wiki.
 * @property {undefined|'wiki-indent'} [uiClass]
 * @property {SiteSearchSettings} [search]
 */

/**
 * @typedef {Object} SiteSearchSettings
 * Re-configures the search rewrite module if needed.
 * @property {string} [oldName] Fandom site name shown in page titles.
 */

/**
 * @typedef {Object} _DerivedSiteRecordExtension
 * @property {string} parentRef wiki.gg domain name of another wiki record on the list.
 * @property {string} oldId Fandom domain name.
 */
/**
 * @typedef {SiteRecord & _DerivedSiteRecordExtension} DerivedSiteRecord
 * Additional record of an individual wiki. This will not be shown in the UI, and should only be used to redirect more
 * domains.
 */

/**
 * @typedef {Object} SiteListSpacer
 * Divides the wiki list in the settings UI, with a custom heading. Records that should be visually "grouped up" under
 * this spacer should use the 'wiki-indent' UI class.
 * @property {string} spacer Title.
 */

/**
 * @typedef {SiteRecord|DerivedSiteRecord|SiteListSpacer} SiteListEntity
 */

/**
 * @typedef {Object} SiteListUnpackOptions
 * @property {boolean} [withSpacers=false] Whether spacers should be included.
 * @property {boolean} [withVirtuals=false] Whether derived records should be included.
 * @property {boolean} [compacted=true]
 */

const listFormatSupport = {
    v1: {
        /**
         * Converts an unprocessed sites list to a shallow, single level, filtered array.
         *
         * @package
         * @param {( SiteListEntity | SiteListEntity[] )[]} entities Unprocessed sites list.
         * @param {SiteListUnpackOptions} options
         * @return {SiteListEntity[]} Filtered, single level sites list.
         */
        unpack( entities, options ) {
            options = options || {};

            let out = [];
            for ( const entity of entities ) {
                // Skip the instructions at the top of the file
                if ( '$README' in entity ) {
                    continue;
                }

                // Skip spacers if they have not been requested
                if ( ( !options.withSpacers && 'spacer' in entity ) || ( !options.withVirtuals && 'parentRef' in entity ) ) {
                    continue;
                }

                // Recurse if an array, or append
                if ( Array.isArray( entity ) ) {
                    const unpacked = this.unpack( entity, options );
                    if ( options.compacted ?? true ) {
                        out = out.concat( unpacked );
                    } else {
                        out.push( unpacked );
                    }
                } else {
                    out.push( entity );
                }
            }

            return out;
        },


        get( rawList, unpackOptions ) {
            const out = this.unpack( rawList, unpackOptions );

            if ( unpackOptions.withVirtuals ) {
                for ( const entity of out ) {
                    // Resolve the parent reference for virtual entries (wiki alternative redirects). Copy properties that
                    // aren't specified.
                    // Additionally, this reference should be a string, which means it has not been resolved yet. The site list
                    // may be reused in memory.
                    if ( 'parentRef' in entity && typeof entity.parentRef === 'string' ) {
                        entity.parentRef = out.find( x => x.id === entity.parentRef );
                        entity.id = entity.parentRef.id;
                        entity.name = entity.parentRef.name;
                        entity.official = entity.parentRef.official;
                    }
                }
            }

            return out;
        }
    }
};


export async function getSites( unpackOptions ) {
    return listFormatSupport.v1.get(
        await loadBestAvailableSitesList(),
        unpackOptions
    );
}
