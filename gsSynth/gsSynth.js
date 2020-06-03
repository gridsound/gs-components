"use strict";

class GSSynth {
	constructor() {
		const uiSynth = new gsuiSynthesizer(),
			uiLFO = new gsuiLFO(),
			dataSynth = new DAWCore.controllers.synth( {
				dataCallbacks: {
					addOsc: ( id, osc ) => uiSynth.addOscillator( id, osc ),
					removeOsc: id => uiSynth.removeOscillator( id ),
					changeOscProp: ( id, k, v ) => uiSynth.getOscillator( id ).change( k, v ),
					updateOscWave: id => uiSynth.getOscillator( id ).updateWave(),
					changeLFOProp: ( k, v ) => uiLFO.change( k, v ),
					updateLFOWave: () => uiLFO.updateWave(),
				},
			} );

		this.rootElement = uiSynth.rootElement;
		this._uiLFO = uiLFO;
		this._uiSynth = uiSynth;
		this._dataSynth = dataSynth;
		this._dawcore =
		this._synthId = null;
		Object.seal( this );

		uiSynth.rootElement.querySelector( ".gsuiSynthesizer-lfo" ).append( uiLFO.rootElement );
		uiLFO.oninput = this._oninputLFO.bind( this );
		uiSynth.oninput = this._oninputSynth.bind( this );
		uiLFO.onchange =
		uiSynth.onchange = this._onchange.bind( this );
	}

	// .........................................................................
	setDAWCore( core ) {
		this._dawcore = core;
	}
	setWaveList( arr ) {
		this._uiSynth.setWaveList( arr );
	}
	selectSynth( id ) {
		if ( id !== this._synthId ) {
			this._synthId = id;
			this._dataSynth.clear();
			if ( id ) {
				this._dataSynth.change( this._dawcore.get.synth( id ) );
			}
		}
	}
	change( obj ) {
		const synObj = obj.synths && obj.synths[ this._synthId ],
			get = this._dawcore.get;

		if ( "beatsPerMeasure" in obj || "stepsPerBeat" in obj ) {
			this._uiLFO.timeSignature( get.beatsPerMeasure(), get.stepsPerBeat() );
		}
		if ( synObj ) {
			this._dataSynth.change( synObj );
			if ( synObj.oscillators ) {
				this._uiSynth.reorderOscillators( synObj.oscillators );
			}
		}
		if ( "synthOpened" in obj ) {
			this.selectSynth( obj.synthOpened );
		}
	}
	resize() {
		this._uiLFO.resize();
	}
	resizing() {
		this._uiLFO.resizing();
	}
	attached() {
		this._uiLFO.attached();
		this._uiSynth.attached();
	}
	clear() {
		this._dataSynth.clear();
	}

	// events:
	// .........................................................................
	_onchange( act, ...args ) {
		this._dawcore.callAction( act, this._synthId, ...args );
	}
	_oninputSynth( id, prop, val ) {
		const oscillators = { [ id ]: { [ prop ]: val } };

		this._dawcore.liveChangeSynth( this._synthId, { oscillators } );
	}
	_oninputLFO( prop, val ) {
		const lfo = { [ prop ]: val };

		this._dawcore.liveChangeSynth( this._synthId, { lfo } );
	}
}

Object.freeze( GSSynth );
