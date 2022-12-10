const IS_DNR_ALLOWED = false && navigator.userAgent.indexOf( 'Chrome' ) >= 0;
const storage = window.storage || chrome.storage,
	userDefaults = {
		isRedirectDisabled: false,
		searchMode: 'rewrite',
		disabledWikis: [],
		useTabRedirect: !IS_DNR_ALLOWED
	},
	wikis = [
		// TODO: share this list with other parts of the extension
		{ id: 'ark', name: 'ARK: Survival Evolved' },
        { id: 'aether', name: 'Aether Mod' },
        { id: 'astroneer', name: 'Astroneer' },
        { id: 'beforedarknessfalls', name: 'Before Darkness Falls' },
		{ id: 'chivalry', name: 'Chivalry' },
        { id: 'coromon', name: 'Coromon' },
        { id: 'cosmoteer', name: 'Cosmoteer' },
        { id: 'cuphead', name: 'Cuphead' },
        { id: 'darkdeity', name: 'Dark Deity' },
        { id: 'deeprockgalactic', name: 'Deep Rock Galactic' },
        { id: 'dreamscaper', name: 'Dreamscaper' },
        { id: 'fiendfolio', name: 'Fiend Folio' },
        { id: 'foxhole', name: 'Foxhole' },
        { id: 'haveanicedeath', name: 'Have a Nice Death' },
        { id: 'legiontd2', name: 'Legion TD2' },
        { id: 'noita', name: 'Noita' },
        { id: 'projectarrhythmia', name: 'Project Arrhythmia' },
        { id: 'sandsofaura', name: 'Sands of Aura' },
        { id: 'seaofthieves', name: 'Sea of Thieves' },
        { id: 'sonsoftheforest', name: 'Sons of the Forest' },
        { id: 'steamworld', name: 'Steamworld' },
        { id: 'temtem', name: 'Temtem' },
        { id: 'terraria', name: 'Terraria' },
        { id: 'calamitymod', name: 'Calamity Mod', uiClass: 'wiki-indent' },
        { id: 'thoriummod', name: 'Thorium Mod', uiClass: 'wiki-indent' },
		{ spacer: 'The Binding of Isaac mods' },
        { id: 'tboiepiphany', name: 'Epiphany', uiClass: 'wiki-indent' },
        { id: 'forgottenfables', name: 'Forgotten Fables', uiClass: 'wiki-indent' },
        { id: 'tboirevelations', name: 'Revelations', uiClass: 'wiki-indent' },
        { id: 'totherescue', name: 'To The Rescue' },
        { id: 'undermine', name: 'UnderMine' },
        { id: 'loathing', name: 'Wiki of Loathing' },
        { id: 'willyousnail', name: 'Will You Snail?' },
	].sort( ( a, b ) => a.name.localeCompare( b.name ) );


const RTW = {
	$container: document.getElementById( 'wikis' ),
	settingsIds: [],
	updateCallbacks: [
		( settings => {
			RTW.settingsCache = settings;
			RTW.disabledWikis = RTW.getCurrentSettingValue( 'disabledWikis' );
		} )
	],
	disabledWikis: [],
	settingsCache: {},


	getCurrentSettingValue( key ) {
		return this.settingsCache && this.settingsCache[key] || userDefaults[key];
	},


	bindCheckboxToOption( checkbox ) {
		const normalise = v => v === 'true' ? true : ( v === 'false' ? false : v );
		const settingId = checkbox.getAttribute( 'data-setting-id' ),
			arrayValue = checkbox.getAttribute( 'data-array-value' ),
			valueOn = normalise( checkbox.getAttribute( 'data-on' ) ),
			valueOff = normalise( checkbox.getAttribute( 'data-off' ) );
		
		this.settingsIds.push( settingId );
		this.updateCallbacks.push( _ => {
			let rawValue = this.getCurrentSettingValue( settingId );
			if ( settingId === 'disabledWikis' && arrayValue ) {
				rawValue = rawValue.indexOf( arrayValue ) >= 0;
			}
			checkbox.checked = rawValue === valueOn;
		} );

		checkbox.addEventListener( 'change', () => {
			const obj = {};
			let value = null;

			if ( settingId === 'disabledWikis' && arrayValue ) {
				let add = checkbox.checked ? valueOn : valueOff;
				if ( add ) {
					this.disabledWikis.push( arrayValue );
				} else {
					this.disabledWikis = this.disabledWikis.filter( x => x != arrayValue );
				}
				value = this.disabledWikis;
			} else {
				value = checkbox.checked ? valueOn : valueOff;
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
		this.updateCallbacks.push( _ => {
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
	
		if ( info.spacer ) {
			$out.classList.add( 'pseudo' );
			$out.innerText = info.spacer;
		} else {
			const $checkbox = document.createElement( 'input' );
			$checkbox.setAttribute( 'id', 'wiki-cb-' + info.id );
			$checkbox.setAttribute( 'type', 'checkbox' );
			$checkbox.setAttribute( 'data-setting-id', 'disabledWikis' );
			$checkbox.setAttribute( 'data-array-value', info.id );
			$checkbox.setAttribute( 'data-on', 'false' );
			$checkbox.setAttribute( 'data-off', 'true' );
			$out.appendChild( $checkbox );
			
			const $label = document.createElement( 'label' );
			$label.setAttribute( 'for', 'wiki-cb-' + info.id );
			$label.innerText = info.name;
			$out.appendChild( $label );
			
			const $link = document.createElement( 'a' );
			$link.setAttribute( 'href', `https://${info.id}.wiki.gg` );
			$link.setAttribute( 'target', '_blank' );
			$out.appendChild( $link );
		}
	
		this.$container.appendChild( $out );
	},


	update() {
		storage.local.get( this.settingsIds, result => {
			for ( const callback of this.updateCallbacks ) {
				callback( result );
			}
		} );
	},

	
	updateVersion() {
		document.getElementById( 'version-string' ).innerText = 'v' + chrome.runtime.getManifest().version;
	},


	initialiseDynamic() {
		if ( navigator.userAgent.indexOf( 'Chrome' ) < 0 ) {
			document.getElementById( 'useTabRedirect' ).disabled = true;
		}

		if ( !IS_DNR_ALLOWED ) {
			document.getElementById( 'useTabRedirect' ).parentNode.style.display = 'none';
		}
	}
};


( function _initialiseUI() {
	RTW.updateVersion();
	RTW.initialiseDynamic();

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