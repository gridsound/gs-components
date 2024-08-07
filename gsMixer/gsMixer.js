"use strict";

class GSMixer {
	#dawcore = null;
	rootElement = GSUcreateElement( "gsui-mixer", {
		analyser: localStorage.getItem( "gsuiMixer.analyserType" ) || "td",
	} );
	#channels = this.rootElement.$getChannels();
	#effects = this.rootElement.$getEffects();
	#destFilter = "main";
	#ctrlChannels = new DAWCoreControllerMixer( {
		$addChannel: ( id, chan ) => this.#channels.$addChannel( id, chan ),
		$removeChannel: id => this.#channels.$removeChannel( id ),
		$changeChannel: ( id, prop, val, prev ) => this.#channels.$changeChannel( id, prop, val, prev ),
		$addEffect: ( chanId, fxId, obj ) => this.#channels.$getChannel( chanId ).$addEffect( fxId, obj ),
		$updateEffect: ( chanId, fxId, obj ) => this.#channels.$getChannel( chanId ).$updateEffect( fxId, obj ),
		$removeEffect: ( chanId, fxId ) => this.#channels.$getChannel( chanId ).$removeEffect( fxId ),
	} );
	#ctrlEffects = new DAWCoreControllerEffects( {
		$changeTimedivision: timediv => GSUsetAttribute( this.#effects, "timedivision", timediv ),
		$addEffect: ( id, obj ) => this.#effects.$addEffect( id, obj ),
		$removeEffect: id => this.#effects.$removeEffect( id ),
		$changeEffect: ( id, prop, val ) => this.#effects.$changeEffect( id, prop, val ),
		$changeEffectData: ( id, obj, fxType ) => this.#changeEffectData( id, obj, fxType ),
	} );
	#channelsActions = {
		addChannel: DAWCoreActions_addChannel,
		changeChannel: DAWCoreActions_changeChannel,
		toggleChannel: DAWCoreActions_toggleChannel,
		reorderChannel: DAWCoreActions_reorderChannel,
		removeChannel: DAWCoreActions_removeChannel,
		redirectChannel: DAWCoreActions_redirectChannel,
		renameChannel: DAWCoreActions_renameChannel,
	};
	#effectsActions = {
		toggleEffect: DAWCoreActions_toggleEffect,
		removeEffect: DAWCoreActions_removeEffect,
		changeEffectProp: DAWCoreActions_changeEffectProp,
	};

	constructor() {
		Object.seal( this );

		this.#channels.$oninput = this.#oninput.bind( this );
		this.#channels.$onchange = this.#onchange.bind( this );
		this.#channels.$onselectChan = this.#onselectChan.bind( this );
		this.#channels.$onselectEffect = this.#onselectEffect.bind( this );
		this.#effects.$askData = ( fxId, fxType, dataType, ...args ) => {
			if ( fxType === "filter" && dataType === "curve" ) {
				return this.#dawcore.$getAudioEffect( fxId )?.$updateResponse?.( args[ 0 ] );
			}
		};
		GSUlistenEvents( this.rootElement, {
			gsuiMixer: {
				changeAnalyser: d => {
					this.#dawcore.$mixerChangeAnalyser( d.args[ 0 ] );
					localStorage.setItem( "gsuiMixer.analyserType", d.args[ 0 ] );
				},
			},
			gsuiEffects: {
				liveChangeEffect: d => {
					this.#dawcore.$liveChangeEffect( ...d.args );
				},
				addEffect: d => {
					d.args.unshift( this.#destFilter );
					this.#dawcore.$callAction( DAWCoreActions_addEffect, ...d.args );
				},
				default: d => {
					this.#dawcore.$callAction( this.#effectsActions[ d.eventName ], ...d.args );
				},
			},
		} );
		this.#ctrlEffects.$setDestFilter( "main" );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
		this.#dawcore.$mixerChangeAnalyser( GSUgetAttribute( this.rootElement, "analyser" ) );
	}
	clear() {
		this.#ctrlEffects.$clear();
		this.#ctrlChannels.$clear();
		this.#channels.$selectChannel( "main" );
	}
	change( obj ) {
		this.#ctrlEffects.$change( obj );
		this.#ctrlChannels.$change( obj );
		if ( obj.effects ) {
			this.#effects.$reorderEffects( obj.effects );
		}
		if ( obj.channels ) {
			this.#channels.$reorderChannels( obj.channels );
		}
	}
	updateAudioData( chanId, ldata, rdata ) {
		this.#channels.$updateAudioData( chanId, ldata, rdata );
	}
	$updateVu( ldata, rdata ) {
		this.#channels.$updateVu( ldata, rdata );
	}

	// .........................................................................
	#oninput( id, prop, val ) {
		this.#dawcore.$liveChangeChannel( id, prop, val );
	}
	#onchange( act, ...args ) {
		this.#dawcore.$callAction( this.#channelsActions[ act ], ...args );
	}
	#onselectChan( id ) {
		this.#dawcore.$callAction( DAWCoreActions_openChannel, id );
		this.#destFilter = id;
		this.#ctrlEffects.$setDestFilter( id );
	}
	#onselectEffect( chanId, fxId ) {
		this.#effects.$expandToggleEffect( fxId );
	}
	#changeEffectData( id, obj, fxType ) {
		const uiFx = this.#effects.$getFxHTML( id ).uiFx;

		Object.entries( obj ).forEach( kv => {
			if ( fxType === "waveshaper" && kv[ 0 ] === "curve" ) {
				uiFx.$changeCurveData( kv[ 1 ] );
			} else {
				GSUsetAttribute( uiFx, ...kv );
			}
		} );
		uiFx.$updateWave?.();
	}
}

Object.freeze( GSMixer );
