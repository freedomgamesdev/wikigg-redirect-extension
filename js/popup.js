( function () {
	const storage = window.storage || chrome.storage;
	const defaults = {
		isRedirectDisabled: false,
		isRewriteDisabled: false,
		isSearchFilterDisabled: true
	};
	const keys = [];
	const updateCallbacks = [];


	function bindOptionToggle( checkbox ) {
		const settingId = checkbox.getAttribute( 'data-setting-id' ),
			invertValue = checkbox.getAttribute( 'data-invert' ) === 'true';
		keys.push( settingId );
		updateCallbacks.push( settings => {
			const rawValue = settings[settingId] == null ? defaults[settingId] : settings[settingId];
			checkbox.checked = invertValue ? !rawValue : rawValue;
		} );
		checkbox.addEventListener( 'change', () => {
			const obj = {};
			obj[settingId] = invertValue ? !checkbox.checked : checkbox.checked;
			storage.local.set( obj );
			updateUI();
		} );
	}


	function updateUI() {
		storage.local.get( keys, result => {
			for ( const callback of updateCallbacks ) {
				callback( result || defaults );
			}
		} );
	}

	
	function initialiseUI() {
		for ( const checkbox of document.querySelectorAll( 'input[type=checkbox][data-setting-id]' ) ) {
			bindOptionToggle( checkbox );
		}

		updateUI();
	}


	initialiseUI();
} )();