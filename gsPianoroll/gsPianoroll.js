"use strict";

class GSPianoroll {
	constructor() {
		const uiPianoroll = new gsuiPianoroll( {
				onchange: this._onchange.bind( this ),
				onchangeLoop: this._onchangeLoop.bind( this ),
				onchangeCurrentTime: this._onchangeCurrentTime.bind( this ),
			} ),
			dataKeys = null;
			// dataKeys = new DAWCore.controllers.keys( {
			// 	dataCallbacks: {
			// 		addBlock: ( id, blc ) => uiPianoroll.addBlock( id, blc ),
			// 		removeBlock: id => uiPianoroll.removeBlock( id ),
			// 		changeBlockProp: ( id, prop, val ) => uiPianoroll.changeBlockProp( id, prop, val ),
			// 		updateBlockViewBox: ( id, blc ) => uiPianoroll.updateBlockViewBox( id, blc ),
			// 	},
			// } );

		this.rootElement = uiPianoroll.rootElement;
		this._uiRoll = uiPianoroll;
		this._dataKeys = dataKeys;
		this._dawcore =
		this._keysId =
		this._patternId = null;
		Object.seal( this );

		uiPianoroll.octaves( 1, 7 );
		uiPianoroll.setPxPerBeat( 90 );
		uiPianoroll.setFontSize( 20 );
		uiPianoroll.uiKeys.onkeydown = midi => this._dawcore.pianoroll.liveKeydown( midi );
		uiPianoroll.uiKeys.onkeyup = midi => this._dawcore.pianoroll.liveKeyup( midi );
		this.rootElement.addEventListener( "gsuiEvents", e => {
			const d = e.detail;

			switch ( d.component ) {
				case "xxxxxx":
					break;
			}
		} );
	}

	// .........................................................................
	setDAWCore( core ) {
		this._dawcore = core;
	}
	selectPattern( id ) {
		if ( id !== this._patternId ) {
			this._patternId = id;
			this._keysId = null;
			this._uiRoll.empty();
			// this._dataKeys.clear();
			// this._uiRoll.toggleShadow( !id );
			this._uiRoll.setPxPerBeat( 90 );
			if ( id ) {
				const pat = this._dawcore.get.pattern( id ),
					keys = this._dawcore.get.keys( pat.keys );

				this._keysId = pat.keys;
				GSUtils.diffAssign( this._uiRoll.data, keys );
				// this._dataKeys.change( keys );
				this._uiRoll.resetKey();
				this._uiRoll.scrollToKeys();
			}
		}
	}
	change( obj ) {
		if ( "beatsPerMeasure" in obj || "stepsPerBeat" in obj ) {
			this._uiRoll.timeSignature(
				this._dawcore.get.beatsPerMeasure(),
				this._dawcore.get.stepsPerBeat() );
		}
		if ( "patternKeysOpened" in obj ) {
			this.selectPattern( obj.patternKeysOpened );
		} else {
			const keys = obj.keys && obj.keys[ this._keysId ];

			if ( keys ) {
				GSUtils.diffAssign( this._uiRoll.data, keys );
				// this._dataKeys.change( keys );
			}
		}
	}
	clear() {
		this._uiRoll.empty();
		// this._dataKeys.clear();
	}
	getUIKeys() {
		return this._uiRoll.uiKeys;
	}

	// .........................................................................
	attached() {
		this._uiRoll.attached();
	}
	resized() {
		this._uiRoll.resized();
	}
	setFontSize( fs ) {
		this._uiRoll.setFontSize( fs );
	}
	setPxPerBeat( ppb ) {
		this._uiRoll.setPxPerBeat( ppb );
	}
	currentTime( t ) {
		this._uiRoll.currentTime( t );
	}
	loop( a, b ) {
		this._uiRoll.loop( a, b );
	}

	// .........................................................................
	_onchange( obj, ...args ) {
		switch ( obj ) { // tmp
			case "xxxxxxxx": this._dawcore.callAction( "xxxxxxxxxxx", ...args ); break;
			default:
				this._dawcore.callAction( "changePatternKeys", this._patternId, obj, this._uiRoll.getDuration() );
				break;
		}
	}
	_onchangeLoop( looping, a, b ) {
		looping
			? this._dawcore.pianoroll.setLoop( a, b )
			: this._dawcore.pianoroll.clearLoop();
	}
	_onchangeCurrentTime( t ) {
		this._dawcore.pianoroll.setCurrentTime( t );
	}
}

Object.freeze( GSPianoroll );
