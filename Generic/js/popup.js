import { getWikis, supportsDNR } from './util.js';
import defaultSettingsFactory from '../defaults.js';


const storage = window.storage || chrome.storage,
	userDefaults = defaultSettingsFactory(),
	wikis = getWikis( true );


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
			$out.setAttribute( 'data-wiki-id', info.id );

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
		document.getElementById( 'version-string' ).innerText = `v${chrome.runtime.getManifest().version}`;
	},


	initialiseDynamic() {
		if ( !supportsDNR() ) {
			document.getElementById( 'useTabRedirect' ).disabled = true;
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