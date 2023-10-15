"use strict";

class GSSynth {
	#dawcore = null;
	#synthId = null;
	rootElement = GSUcreateElement( "gsui-synthesizer" );
	#dataSynth = new DAWCoreControllers.synth( {
		dataCallbacks: {
			addOsc: ( id, osc ) => this.rootElement.addOscillator( id, osc ),
			removeOsc: id => this.rootElement.removeOscillator( id ),
			changeEnvProp: ( k, v ) => this.rootElement.changeEnvProp( k, v ),
			changeLFOProp: ( k, v ) => this.rootElement.changeLFOProp( k, v ),
			updateEnvWave: () => this.rootElement.env.updateWave(),
			updateLFOWave: () => this.rootElement.lfo.updateWave(),
			changeOscProp: ( id, k, v ) => {
				const osc = this.rootElement.getOscillator( id );

				if ( k !== "source" ) {
					GSUsetAttribute( osc, k, v );
				} else {
					GSUsetAttribute( osc, k, v && this.#dawcore.$getPattern( v ).name );
					osc.$updateSourceWave( gsuiSVGPatterns.$createSVG( "bufferHD", v ) );
				}
			},
		},
	} );

	constructor() {
		Object.seal( this );

		this.rootElement.setWaveList( gswaPeriodicWavesList.map( arr => arr[ 0 ] ) );
		this.rootElement.addEventListener( "gsuiEvents", e => {
			const d = e.detail;
			const a = d.args;
			const id = this.#synthId;
			const dc = this.#dawcore;

			switch ( d.component ) {
				case "gsuiEnvelope":
					switch ( d.eventName ) {
						case "change": dc.$callAction( "changeEnv", id, ...a ); break;
						// case "liveChange": dc.$liveChangeSynth( id, { env: { [ a[ 0 ] ]: a[ 1 ] } } ); break;
					}
					break;
				case "gsuiLFO":
					switch ( d.eventName ) {
						case "change": dc.$callAction( "changeLFO", id, ...a ); break;
						case "liveChange": dc.$liveChangeSynth( id, { lfo: { [ a[ 0 ] ]: a[ 1 ] } } ); break;
					}
					break;
				case "gsuiSynthesizer":
					switch ( d.eventName ) {
						case "toggleEnv": dc.$callAction( "toggleEnv", id ); break;
						case "toggleLFO": dc.$callAction( "toggleLFO", id ); break;
						case "addOscillator": dc.$callAction( "addOscillator", id ); break;
						case "reorderOscillator": dc.$callAction( "reorderOscillator", id, a[ 0 ] ); break;
					}
					break;
				case "gsuiOscillator": {
					const oscId = e.target.dataset.id;

					switch ( d.eventName ) {
						case "remove": dc.$callAction( "removeOscillator", id, oscId ); break;
						case "change": dc.$callAction( "changeOscillator", id, oscId, ...a ); break;
						case "liveChange": dc.$liveChangeSynth( id, { oscillators: { [ oscId ]: { [ a[ 0 ] ]: a[ 1 ] } } } ); break;
						case "wavedrop":
						case "drop": dc.$callAction( "changeOscillatorSource", id, oscId, a[ 0 ], d.eventName === "drop" ); break;
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
	selectSynth( id ) {
		if ( id !== this.#synthId ) {
			this.#synthId = id;
			this.#dataSynth.clear();
			if ( id ) {
				this.#dataSynth.change( this.#dawcore.$getSynth( id ) );
			}
		}
	}
	change( obj ) {
		const daw = this.#dawcore;
		const synObj = obj.synths && obj.synths[ this.#synthId ];

		if ( obj.timedivision ) {
			GSUsetAttribute( this.rootElement.env, "timedivision", obj.timedivision );
			GSUsetAttribute( this.rootElement.lfo, "timedivision", obj.timedivision );
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
