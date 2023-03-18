"use strict";

class GSMixer {
	#dawcore = null;
	rootElement = GSUI.$createElement( "gsui-mixer" );
	#channels = this.rootElement.getChannels();
	#effects = this.rootElement.getEffects();
	#destFilter = "main";
	#ctrlChannels = new DAWCoreControllers.mixer( {
		dataCallbacks: {
			addChannel: ( id, chan ) => this.#channels.addChannel( id, chan ),
			removeChannel: id => this.#channels.removeChannel( id ),
			renameChannel: ( id, name ) => this.#channels.renameChannel( id, name ),
			redirectChannel: ( id, dest ) => this.#channels.redirectChannel( id, dest ),
			toggleChannel: ( id, b ) => this.#channels.toggleChannel( id, b ),
			reorderChannel: ( id, n ) => this.#channels.reorderChannel( id, n ),
			changePanChannel: ( id, val ) => this.#channels.changePanChannel( id, val ),
			changeGainChannel: ( id, val ) => this.#channels.changeGainChannel( id, val ),
			addEffect: ( chanId, fxId, obj ) => this.#channels.$getChannel( chanId ).$addEffect( fxId, obj ),
			updateEffect: ( chanId, fxId, obj ) => this.#channels.$getChannel( chanId ).$updateEffect( fxId, obj ),
			removeEffect: ( chanId, fxId ) => this.#channels.$getChannel( chanId ).$removeEffect( fxId ),
		},
	} );
	#ctrlEffects = new DAWCoreControllers.effects( {
		dataCallbacks: {
			changeTimedivision: timediv => GSUI.$setAttribute( this.#effects, "timedivision", timediv ),
			addEffect: ( id, obj ) => this.#effects.$addEffect( id, obj ),
			removeEffect: id => this.#effects.$removeEffect( id ),
			changeEffect: ( id, prop, val ) => this.#effects.$changeEffect( id, prop, val ),
			changeEffectData: ( id, obj ) => this.#changeEffectData( id, obj ),
		},
	} );

	constructor() {
		Object.seal( this );

		this.#channels.oninput = this.#oninput.bind( this );
		this.#channels.onchange = this.#onchange.bind( this );
		this.#channels.onselectChan = this.#onselectChan.bind( this );
		this.#channels.onselectEffect = this.#onselectEffect.bind( this );
		this.#effects.$askData = ( fxId, fxType, dataType, ...args ) => {
			if ( fxType === "filter" && dataType === "curve" ) {
				return this.#dawcore.$getAudioEffect( fxId )?.$updateResponse?.( args[ 0 ] );
			}
		};
		GSUI.$listenEvents( this.rootElement, {
			gsuiEffects: {
				liveChangeEffect: d => {
					this.#dawcore.$liveChangeEffect( ...d.args );
				},
				addEffect: d => {
					d.args.unshift( this.#destFilter );
					this.#dawcore.$callAction( "addEffect", ...d.args );
				},
				default: d => {
					this.#dawcore.$callAction( d.eventName, ...d.args );
				},
			},
		} );
		this.#ctrlEffects.setDestFilter( "main" );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	clear() {
		this.#ctrlEffects.clear();
		this.#ctrlChannels.clear();
		this.#channels.selectChannel( "main" );
	}
	change( obj ) {
		this.#ctrlEffects.change( obj );
		this.#ctrlChannels.change( obj );
		if ( obj.effects ) {
			this.#effects.$reorderEffects( obj.effects );
		}
		if ( obj.channels ) {
			this.#channels.reorderChannels( obj.channels );
		}
	}
	updateAudioData( chanId, ldata, rdata ) {
		this.#channels.updateAudioData( chanId, ldata, rdata );
	}

	// .........................................................................
	#oninput( id, prop, val ) {
		this.#dawcore.$liveChangeChannel( id, prop, val );
	}
	#onchange( act, ...args ) {
		this.#dawcore.$callAction( act, ...args );
	}
	#onselectChan( id ) {
		this.#destFilter = id;
		this.#ctrlEffects.setDestFilter( id );
	}
	#onselectEffect( chanId, fxId ) {
		this.#effects.$expandToggleEffect( fxId );
	}
	#changeEffectData( id, obj ) {
		const uiFx = this.#effects.$getFxHTML( id ).uiFx;

		Object.entries( obj ).forEach( kv => GSUI.$setAttribute( uiFx, ...kv ) );
		uiFx.$updateWave?.();
	}
}

Object.freeze( GSMixer );
