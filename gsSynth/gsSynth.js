"use strict";

class GSSynth {
	#dawcore = null
	#synthId = null
	rootElement = GSUI.createElement( "gsui-synthesizer" )
	#dataSynth = new DAWCore.controllers.synth( {
		dataCallbacks: {
			addOsc: ( id, osc ) => this.rootElement.addOscillator( id, osc ),
			removeOsc: id => this.rootElement.removeOscillator( id ),
			changeEnvProp: ( k, v ) => GSUI.setAttribute( this.rootElement.env, k, v ),
			changeLFOProp: ( k, v ) => GSUI.setAttribute( this.rootElement.lfo, k, v ),
			changeOscProp: ( id, k, v ) => GSUI.setAttribute( this.rootElement.getOscillator( id ), k, v ),
			updateEnvWave: () => this.rootElement.env.updateWave(),
			updateLFOWave: () => this.rootElement.lfo.updateWave(),
			updateOscWave: id => this.rootElement.getOscillator( id ).updateWave(),
		},
	} )

	constructor() {
		Object.seal( this );

		this.rootElement.addEventListener( "gsuiEvents", e => {
			const d = e.detail,
				a = d.args,
				id = this.#synthId,
				dc = this.#dawcore;

			switch ( d.component ) {
				case "gsuiEnvelope":
					switch ( d.eventName ) {
						case "toggle": dc.callAction( "toggleEnv", id ); break;
						case "change": dc.callAction( "changeEnv", id, ...a ); break;
						// case "liveChange": dc.liveChangeSynth( id, { env: { [ a[ 0 ] ]: a[ 1 ] } } ); break;
					}
					break;
				case "gsuiLFO":
					switch ( d.eventName ) {
						case "toggle": dc.callAction( "toggleLFO", id ); break;
						case "change": dc.callAction( "changeLFO", id, ...a ); break;
						case "liveChange": dc.liveChangeSynth( id, { lfo: { [ a[ 0 ] ]: a[ 1 ] } } ); break;
					}
					break;
				case "gsuiSynthesizer":
					switch ( d.eventName ) {
						case "addOscillator": dc.callAction( "addOscillator", id ); break;
						case "reorderOscillator": dc.callAction( "reorderOscillator", id, a[ 0 ] ); break;
					}
					break;
				case "gsuiOscillator": {
					const oscId = e.target.dataset.id;

					switch ( d.eventName ) {
						case "remove": dc.callAction( "removeOscillator", id, oscId ); break;
						case "change": dc.callAction( "changeOscillator", id, oscId, ...a ); break;
						case "liveChange": dc.liveChangeSynth( id, { oscillators: { [ oscId ]: { [ a[ 0 ] ]: a[ 1 ] } } } ); break;
					}
				} break;
			}
			e.stopPropagation();
		} );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	setWaveList( arr ) {
		this.rootElement.setWaveList( arr );
	}
	selectSynth( id ) {
		if ( id !== this.#synthId ) {
			this.#synthId = id;
			this.#dataSynth.clear();
			if ( id ) {
				this.#dataSynth.change( this.#dawcore.get.synth( id ) );
			}
		}
	}
	change( obj ) {
		const synObj = obj.synths && obj.synths[ this.#synthId ],
			get = this.#dawcore.get;

		if ( "beatsPerMeasure" in obj || "stepsPerBeat" in obj ) {
			GSUI.setAttribute( this.rootElement.env, "timedivision", `${ get.beatsPerMeasure() }/${ get.stepsPerBeat() }` );
			GSUI.setAttribute( this.rootElement.lfo, "timedivision", `${ get.beatsPerMeasure() }/${ get.stepsPerBeat() }` );
		}
		if ( synObj ) {
			this.#dataSynth.change( synObj );
			if ( synObj.oscillators ) {
				this.rootElement.reorderOscillators( synObj.oscillators );
			}
		}
		if ( "synthOpened" in obj ) {
			this.selectSynth( obj.synthOpened );
		}
	}
	clear() {
		this.#dataSynth.clear();
	}
}

Object.freeze( GSSynth );
