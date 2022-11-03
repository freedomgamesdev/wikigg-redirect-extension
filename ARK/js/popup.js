const RTW = {
	updateVersion() {
		document.getElementById( 'version-string' ).innerText = 'v' + chrome.runtime.getManifest().version;
	},


	initialiseDynamic() {
		// Handle generic extension promotion (detect browser and serve the right URL)
		const $a = document.querySelector( '#B_GENERIC_EXTENSION_PROMO' );
		let link = 'https://chrome.google.com/webstore/detail/cngoemokfjekjkmajenlaokhnmmiinca';
		if ( navigator.userAgent.indexOf( 'Edg' ) >= 0 ) {
			link = 'https://microsoftedge.microsoft.com/addons/detail/redirect-to-wikigg/oecpcjdcedociegkjmlcepigjaenkenj';
		} else if ( navigator.userAgent.indexOf( 'Firefox' ) >= 0 ) {
			link = 'https://addons.mozilla.org/en-GB/firefox/addon/redirect-to-wiki-gg/';
		}
		$a.href = link;
	}
};


( function () {
	const storage = window.storage || chrome.storage;
	const defaults = {
		isRedirectDisabled: false,
		searchMode: 'rewrite'
	};
	const keys = [];
	const updateCallbacks = [];


	function bindOptionCheckboxToggle( checkbox ) {
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


	function bindOptionRadioToggle( radio ) {
		const settingId = radio.getAttribute( 'data-setting-id' ),
			value = radio.getAttribute( 'data-value' );
		keys.push( settingId );
		updateCallbacks.push( settings => {
			radio.checked = value == ( settings[settingId] || defaults[settingId] );
		} );
		radio.addEventListener( 'change', () => {
			if ( radio.checked ) {
				const obj = {};
				obj[settingId] = value;
				storage.local.set( obj );
				updateUI();
			}
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
		RTW.updateVersion();
		RTW.initialiseDynamic();

		for ( const checkbox of document.querySelectorAll( 'input[type=checkbox][data-setting-id]' ) ) {
			bindOptionCheckboxToggle( checkbox );
		}
		for ( const radio of document.querySelectorAll( 'input[type=radio][data-setting-id]' ) ) {
			bindOptionRadioToggle( radio );
		}

		updateUI();
	}


	initialiseUI();
} )();