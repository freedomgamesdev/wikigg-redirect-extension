const storage = window.storage || chrome.storage,
	userDefaults = {
		isRedirectDisabled: false,
		searchMode: 'rewrite',
		disabledWikis: []
	},
	wikis = [
		// TODO: share this list with other parts of the extension
		{ id: 'ark', name: 'ARK: Survival Evolved' },
		{ id: 'noita', name: 'Noita' },
		{ id: 'temtem', name: 'Temtem' },
		{ id: 'terraria', name: 'Terraria' },
		{ id: 'calamitymod', name: 'Calamity Mod', uiClass: 'wiki-indent' },
		{ id: 'thoriummod', name: 'Thorium Mod', uiClass: 'wiki-indent' },
		{ id: 'undermine', name: 'UnderMine' },
	];


const RTW = {
	$container: document.getElementById( 'wikis' ),
	settingsIds: [],
	updateCallbacks: [
		( settings => {
			RTW.settingsCache = settings;
			RTW.disabledWikis = this.getCurrentSettingValue( 'disabledWikis' );
		} )
	],
	disabledWikis: [],
	settingsCache: {},


	getCurrentSettingValue( key ) {
		return this.settingsCache && this.settingsCache[key] || userDefaults[key];
	},


	bindCheckboxToOption( checkbox ) {
		const settingId = checkbox.getAttribute( 'data-setting-id' ),
			invertValue = checkbox.getAttribute( 'data-invert' ) === 'true',
			arrayValue = checkbox.getAttribute( 'data-array-value' );
		this.settingsIds.push( settingId );
		this.updateCallbacks.push( _ => {
			let rawValue = this.getCurrentSettingValue(settingId);
			if ( settingId === 'disabledWikis' && arrayValue ) {
				rawValue = rawValue.indexOf( arrayValue ) >= 0;
			}
			checkbox.checked = invertValue ? !rawValue : rawValue;
		} );

		checkbox.addEventListener( 'change', () => {
			const obj = {};
			let value = null;

			if ( settingId === 'disabledWikis' && arrayValue ) {
				let add = ( invertValue && !checkbox.checked ) || ( !invertValue && checkbox.checked );
				if ( add ) {
					this.disabledWikis.push( arrayValue );
				} else {
					this.disabledWikis = this.disabledWikis.filter( x => x != arrayValue );
				}
				value = this.disabledWikis;
			} else {
				value = invertValue ? !checkbox.checked : checkbox.checked;
			}

			obj[settingId] = value;
			storage.local.set( obj );
			this.update();
		} );
	},
	

	bindRadioToOption( radio ) {
		const settingId = radio.getAttribute( 'data-setting-id' ),
			value = radio.getAttribute( 'data-value' );
		this.settingsIds.push( settingId );
		updateCallbacks.push( _ => {
			radio.checked = value == this.getCurrentSettingValue( settingId );
		} );
		radio.addEventListener( 'change', () => {
			if ( radio.checked ) {
				const obj = {};
				obj[settingId] = value;
				storage.local.set( obj );
				this.update();
			}
		} );
	},


	addWikiEntry( info ) {
		const $out = document.createElement( 'li' );
		if ( info.uiClass ) {
			$out.classList.add( info.uiClass );
		}
	
		const $checkbox = document.createElement( 'input' );
		$checkbox.setAttribute( 'id', 'wiki-cb-' + info.id );
		$checkbox.setAttribute( 'type', 'checkbox' );
		$checkbox.setAttribute( 'data-setting-id', 'disabledWikis' );
		$checkbox.setAttribute( 'data-array-value', info.id );
		$checkbox.setAttribute( 'data-invert', 'true' );
		$out.appendChild( $checkbox );
	
		const $label = document.createElement( 'label' );
		$label.setAttribute( 'for', 'wiki-cb-' + info.id );
		$label.innerText = info.name;
		$out.appendChild( $label );
	
		const $link = document.createElement( 'a' );
		$link.setAttribute( 'href', `https://${info.id}.wiki.gg` );
		$link.setAttribute( 'target', '_blank' );
		$out.appendChild( $link );
	
		$container.appendChild( $out );
	},


	update() {
		storage.local.get( this.settingsIds, result => {
			for ( const callback of this.updateCallbacks ) {
				callback( result );
			}
		} );
	}
};


( function _initialiseUI() {
	for ( const wiki of wikis ) {
		RTW.addWikiEntry( wiki );
	}

	for ( const checkbox of document.querySelectorAll( 'input[type=checkbox][data-setting-id]' ) ) {
		RTW.bindCheckboxToOption( checkbox );
	}
	for ( const radio of document.querySelectorAll( 'input[type=radio][data-setting-id]' ) ) {
		RTW.bindRadioToOption( radio );
	}

	RTW.update();
} )();