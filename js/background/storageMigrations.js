const Versions = {
    FIRST_VERSIONED_AND_SFS: 2024_02_1_7_001
};
const LatestVersion = Versions.FIRST_VERSIONED_AND_SFS;


export function applyMigrations( data ) {
    let wasModified = false;

    if ( !data.version ) {
        // Storage version has not been initialised yet, this is either a fresh install or pre-SFS
        wasModified = true;
        data.version = Versions.FIRST_VERSIONED_AND_SFS;

        if ( 'ddgEnable' in data ) {
            delete data.ddgEnable;
        }

        if ( 'searchMode' in data ) {
            data.sfs = {
                google: {
                    mode: data.searchMode
                },
                ddg: {
                    mode: data.searchMode
                }
            };
            delete data.searchMode;
        }
    }

    if ( wasModified ) {
        data.version = LatestVersion;
        chrome.storage.local.set( data );
    }
}
