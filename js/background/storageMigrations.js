const Versions = {
    FIRST_VERSIONED_AND_SFS: 2024_02_1_7_001
};
const LatestVersion = Versions.FIRST_VERSIONED_AND_SFS;


export function applyMigrations( data ) {
    let wasModified = false;

    if ( !data.version ) {
        // Storage version has not been initialised yet, this is either a fresh install or pre-SFS
        if ( 'ddgEnable' in data ) {
            delete data.ddgEnable;
            wasModified = true;
        }

        if ( 'searchMode' in data ) {
            data.sfs = {
                google: data.searchMode,
                ddg: data.searchMode
            };
            wasModified = true;
        }
    }

    if ( wasModified ) {
        data.version = LatestVersion;
        chrome.storage.local.set( data );
    }
}
