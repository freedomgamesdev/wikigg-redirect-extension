( function () {
	const storage = window.storage || chrome.storage,
		defaults = {
			isRedirectDisabled: false,
			searchMode: 'rewrite'
		},
		wikis = [
			// TODO: share this list with other parts of the extension
			{ id: 'ark', name: 'ARK: Survival Evolved' },
			{ id: 'temtem', name: 'Temtem' },
			{ id: 'terraria', name: 'Terraria' },
			{ id: 'undermine', name: 'UnderMine' },
		],
		keys = [],
		updateCallbacks = [],
		$container = document.getElementById( 'wikis' );


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

	
	function buildWikiEntry( info ) {
		var $out = document.createElement( 'li' );

		var $checkbox = document.createElement( 'input' );
		$checkbox.setAttribute( 'id', 'wiki-cb-' + info.id );
		$checkbox.setAttribute( 'type', 'checkbox' );
		$checkbox.setAttribute( 'data-setting-id', 'disabledWikis' );
		$checkbox.setAttribute( 'data-array-value', info.id );
		$checkbox.setAttribute( 'data-invert', 'true' );
		$out.appendChild( $checkbox );

		var $label = document.createElement( 'label' );
		$label.setAttribute( 'for', 'wiki-cb-' + info.id );
		$label.innerText = info.name;
		$out.appendChild( $label );

		var $link = document.createElement( 'a' );
		$link.setAttribute( 'href', `https://${info.id}.wiki.gg` );
		$link.setAttribute( 'target', '_blank' );
		$out.appendChild( $link );

		$container.appendChild( $out );
	}

	
	function initialiseUI() {
		for ( const wiki of wikis ) {
			buildWikiEntry( wiki );
		}

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