"use strict";

class GSEffects {
	constructor() {
		const uiEffects = new gsuiEffects(),
			ctrlEffects = new DAWCore.controllers.effects( {
				dataCallbacks: {
					addEffect: ( id, obj ) => uiEffects.addEffect( id, obj ),
					removeEffect: id => uiEffects.removeEffect( id ),
					changeEffect: ( id, prop, val ) => uiEffects.changeEffect( id, prop, val ),
					changeEffectData: ( id, obj ) => this._changeEffectData( id, obj ),
				},
			} );

		this.rootElement = uiEffects.rootElement;
		this._uiEffects = uiEffects;
		this._ctrlEffects = ctrlEffects;
		this._dawcore = null;
		this._destFilter = "main";
		Object.seal( this );

		uiEffects.oninput = this._oninput.bind( this );
		uiEffects.onchange = this._onchange.bind( this );
	}

	// .........................................................................
	setDAWCore( core ) {
		this._dawcore = core;
	}
	getDestFilter() {
		return this._destFilter;
	}
	setDestFilter( dest ) {
		this._destFilter = dest;
		this._ctrlEffects.setDestFilter( dest );
	}
	change( obj ) {
		this._ctrlEffects.change( obj );
		if ( obj.effects ) {
			this._uiEffects.reorderEffects( obj.effects );
		}
	}
	clear() {
		this._ctrlEffects.clear();
	}

	// .........................................................................
	_changeEffectData( id, obj ) {
		const uiFx = this._uiEffects._fxsHtml.get( id ).uiFx;

		Object.entries( obj ).forEach( kv => GSUI.setAttribute( uiFx, ...kv ) );
		if ( uiFx.updateWave ) {
			uiFx.updateWave();
		}
	}

	// events:
	// .........................................................................
	_onchange( act, ...args ) {
		if ( act === "addEffect" ) {
			args.unshift( this._destFilter );
		}
		this._dawcore.callAction( act, ...args );
	}
	_oninput( id, prop, val ) {
		this._dawcore.liveChangeEffect( id, prop, val );
	}
}

Object.freeze( GSEffects );
