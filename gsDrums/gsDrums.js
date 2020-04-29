"use strict";

class GSDrums {
	constructor() {
		const uiDrums = new gsuiDrums(),
			uiDrumrows = uiDrums.drumrows,
			dataDrums = new GSDataDrums( {
				dataCallbacks: {
					addDrum: ( id, drum ) => uiDrums.addDrum( id, drum ),
					removeDrum: id => uiDrums.removeDrum( id ),
				},
			} ),
			dataDrumrows = new GSDataDrumrows( {
				dataCallbacks: {
					addDrumrow: id => uiDrumrows.add( id, uiDrums.createDrumrow( id ) ),
					removeDrumrow: id => uiDrumrows.remove( id ),
					changeDrumrow: ( id, prop, val ) => {
						switch ( prop ) {
							default:
								uiDrumrows.change( id, prop, val );
								break;
							case "pattern": {
								const bufId = this._dawcore.get.pattern( val ).buffer;

								uiDrumrows.change( id, prop, this._svgManager.createSVG( bufId ) );
							} break;
							case "duration": {
								const patId = this._dawcore.get.drumrow( id ).pattern,
									bufId = this._dawcore.get.pattern( patId ).buffer;

								uiDrumrows.change( id, prop, this._dawcore.get.buffer( bufId ).duration );
							} break;
						}
					},
				},
			} );

		this.rootElement = uiDrums.rootElement;
		this.timeline = uiDrums._timeline;
		this._uiDrums = uiDrums;
		this._uiDrumrows = uiDrumrows;
		this._dataDrums = dataDrums;
		this._dataDrumrows = dataDrumrows;
		this._dawcore =
		this._drumsId =
		this._patternId =
		this._svgManager = null;
		Object.seal( this );

		uiDrums.onchange = ( act, ...args ) => this._dawcore.callAction( act, this._patternId, ...args );
		uiDrumrows.onchange = ( ...args ) => this._dawcore.callAction( ...args );
		uiDrumrows.onlivestart = rowId => this._dawcore.drums.startLiveDrum( rowId );
		uiDrumrows.onlivestop = rowId => this._dawcore.drums.stopLiveDrum( rowId );
		uiDrums.onchangeCurrentTime = t => this._dawcore.drums.setCurrentTime( t );
		uiDrums.onchangeLoop = ( looping, a, b ) => {
			looping
				? this._dawcore.drums.setLoop( a, b )
				: this._dawcore.drums.clearLoop();
		};
		this._uiDrums.toggleShadow( true );
	}

	// .........................................................................
	setDAWCore( core ) {
		this._dawcore = core;
	}
	selectPattern( id ) {
		if ( id !== this._patternId ) {
			this._patternId = id;
			this._drumsId = null;
			this._dataDrums.clear();
			this._uiDrums.toggleShadow( !id );
			if ( id ) {
				const pat = this._dawcore.get.pattern( id ),
					drums = this._dawcore.get.drums( pat.drums );

				this._drumsId = pat.drums;
				this._dataDrums.change( drums );
			}
		}
	}
	setWaveforms( svgManager ) {
		this._svgManager = svgManager;
	}
	onstartdrum( rowId ) {
		this._uiDrumrows.playRow( rowId );
	}
	onstopdrumrow( rowId ) {
		this._uiDrumrows.stopRow( rowId );
	}
	change( obj ) {
		const drmObj = obj.drums && obj.drums[ this._drumsId ];

		this._dataDrumrows.change( obj );
		if ( obj.drumrows ) {
			this._uiDrums.drumrows.reorderDrumrows( obj.drumrows );
		}
		if ( "beatsPerMeasure" in obj || "stepsPerBeat" in obj ) {
			const bPM = obj.beatsPerMeasure || this._dawcore.get.beatsPerMeasure(),
				sPB = obj.stepsPerBeat || this._dawcore.get.stepsPerBeat();

			this._uiDrums.timeSignature( bPM, sPB );
		}
		if ( drmObj ) {
			this._dataDrums.change( drmObj );
		}
		if ( "patternDrumsOpened" in obj ) {
			this.selectPattern( obj.patternDrumsOpened );
		}
	}
	clear() {
		this.selectPattern( null );
		this._dataDrumrows.clear();
	}

	// .........................................................................
	attached() {
		this._uiDrums.attached();
	}
	resize( w, h ) {
		this._uiDrums.resize( w, h );
	}
	setFontSize( fs ) {
		this._uiDrums.drumrows.setFontSize( fs );
	}
	setPxPerBeat( ppb ) {
		this._uiDrums.setPxPerBeat( ppb );
	}
	currentTime( beat ) {
		this._uiDrums.currentTime( beat );
	}
	loop( a, b ) {
		this._uiDrums.loop( a, b );
	}
}

Object.freeze( GSDrums );
