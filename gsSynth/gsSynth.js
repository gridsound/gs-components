"use strict";

class GSSynth {
	#dawcore = null;
	#synthId = null;
	rootElement = GSUcreateElement( "gsui-synthesizer" );
	#dataSynth = new DAWCoreControllerSynth( {
		$addOsc: ( id, osc ) => {
			const osc2 = { ...osc };

			if ( osc.source ) {
				osc2.source = this.#dawcore.$getPattern( osc.source ).name;
			}

			const uiOsc = this.rootElement.$addOscillator( id, osc2 );

			if ( osc.source ) {
				uiOsc.$updateSourceWaveform( gsuiSVGPatterns.$createSVG( "bufferHD", osc.source ) );
			}
		},
		$removeOsc: id => this.rootElement.$removeOscillator( id ),
		$changeOscProp: ( id, k, v ) => {
			const uiOsc = this.rootElement.$getOscillator( id );

			if ( k === 'source' && v ) {
				const v2 = this.#dawcore.$getPattern( v ).name;

				uiOsc.$updateSourceWaveform( gsuiSVGPatterns.$createSVG( "bufferHD", v ) );
				GSUsetAttribute( uiOsc, k, v2 );
			} else {
				GSUsetAttribute( uiOsc, k, v );
			}
		},
		$changeEnvProp: ( k, v ) => this.rootElement.$changeEnvProp( k, v ),
		$changeLFOProp: ( k, v ) => this.rootElement.$changeLFOProp( k, v ),
		$updateEnvWave: () => this.rootElement.env.updateWave(),
		$updateLFOWave: () => this.rootElement.lfo.updateWave(),
	} );

	constructor() {
		Object.seal( this );

		this.rootElement.$setWaveList( gswaPeriodicWavesList.map( arr => arr[ 0 ] ) );
		this.rootElement.addEventListener( "gsuiEvents", e => {
			const d = e.detail;
			const a = d.args;
			const id = this.#synthId;
			const dc = this.#dawcore;

			switch ( d.component ) {
				case "gsuiEnvelope":
					switch ( d.eventName ) {
						case "change": dc.$callAction( DAWCoreActions_changeEnv, id, ...a ); break;
						// case "liveChange": dc.$liveChangeSynth( id, { env: { [ a[ 0 ] ]: a[ 1 ] } } ); break;
					}
					break;
				case "gsuiLFO":
					switch ( d.eventName ) {
						case "change": dc.$callAction( DAWCoreActions_changeLFO, id, ...a ); break;
						case "liveChange": dc.$liveChangeSynth( id, { lfo: { [ a[ 0 ] ]: a[ 1 ] } } ); break;
					}
					break;
				case "gsuiSynthesizer":
					switch ( d.eventName ) {
						case "addNewBuffer": dc.$callAction( DAWCoreActions_addOscillatorSource, id, ...a ); break;
						case "toggleEnv": dc.$callAction( DAWCoreActions_toggleEnv, id ); break;
						case "toggleLFO": dc.$callAction( DAWCoreActions_toggleLFO, id ); break;
						case "addOscillator": dc.$callAction( DAWCoreActions_addOscillator, id ); break;
						case "reorderOscillator": dc.$callAction( DAWCoreActions_reorderOscillator, id, a[ 0 ] ); break;
					}
					break;
				case "gsuiOscillator": {
					const oscId = e.target.dataset.id;

					switch ( d.eventName ) {
						case "remove": dc.$callAction( DAWCoreActions_removeOscillator, id, oscId ); break;
						case "change": dc.$callAction( DAWCoreActions_changeOscillator, id, oscId, ...a ); break;
						case "liveChange": dc.$liveChangeSynth( id, { oscillators: { [ oscId ]: { [ a[ 0 ] ]: a[ 1 ] } } } ); break;
						case "wavedrop":
						case "drop": dc.$callAction( DAWCoreActions_changeOscillatorSource, id, oscId, ...a, d.eventName === "drop" ); break;
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
	$selectSynth( id ) {
		if ( id !== this.#synthId ) {
			this.#synthId = id;
			this.#dataSynth.$clear();
			if ( id ) {
				this.#dataSynth.$change( this.#dawcore.$getSynth( id ) );
			}
		}
	}
	change( obj ) {
		const synObj = obj.synths && obj.synths[ this.#synthId ];

		if ( obj.timedivision ) {
			GSUsetAttribute( this.rootElement.env, "timedivision", obj.timedivision );
			GSUsetAttribute( this.rootElement.lfo, "timedivision", obj.timedivision );
		}
		GSUforEach( obj.patterns, ( patId, patObj ) => {
			if ( patObj && "name" in patObj ) {
				GSUforEach( this.#dataSynth.$data.oscillators, ( idOsc, osc ) => {
					if ( osc.source === patId ) {
						GSUsetAttribute( this.rootElement.$getOscillator( idOsc ), "source", patObj.name );
					}
				} );
			}
		} );
		if ( synObj ) {
			this.#dataSynth.$change( synObj );
			if ( synObj.oscillators ) {
				this.rootElement.$reorderOscillators( synObj.oscillators );
			}
		}
		if ( "synthOpened" in obj ) {
			this.$selectSynth( obj.synthOpened );
		}
	}
	clear() {
		this.#dataSynth.$clear();
	}
}

Object.freeze( GSSynth );
