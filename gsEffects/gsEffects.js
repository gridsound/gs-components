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

		this.rootElement = uiEffects;
		this._ctrlEffects = ctrlEffects;
		this._dawcore = null;
		this._destFilter = "main";
		Object.seal( this );

		uiEffects.askData = ( fxId, fxType, dataType, ...args ) => {
			if ( fxType === "filter" && dataType === "curve" ) {
				const wafx = this._dawcore.get.audioEffect( fxId );

				return wafx && wafx.updateResponse( args[ 0 ] );
			}
		};
		uiEffects.addEventListener( "gsuiEvents", e => {
			const d = e.detail;

			switch ( d.component ) {
				case "gsuiEffects":
					switch ( d.eventName ) {
						case "fxInput":
							this._dawcore.liveChangeEffect( ...d.args );
							break;
						case "addEffect":
							d.args.unshift( this._destFilter );
						default:
							this._dawcore.callAction( d.eventName, ...d.args );
							break;
					}
					break;
			}
			e.stopPropagation();
		} );
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
			this.rootElement.reorderEffects( obj.effects );
		}
	}
	clear() {
		this._ctrlEffects.clear();
	}

	// .........................................................................
	_changeEffectData( id, obj ) {
		const uiFx = this.rootElement._fxsHtml.get( id ).uiFx;

		Object.entries( obj ).forEach( kv => GSUI.setAttribute( uiFx, ...kv ) );
		if ( uiFx.updateWave ) {
			uiFx.updateWave();
		}
	}
}

Object.freeze( GSEffects );
