"use strict";

class GSDrums {
	#dawcore = null
	#drumsId = null
	#patternId = null
	#svgManager = null
	rootElement = document.createElement( "gsui-drums" )
	timeline = this.rootElement.timeline
	#uiDrumrows = this.rootElement.drumrows
	#dataDrums = new DAWCore.controllers.drums( {
		dataCallbacks: {
			addDrum: ( id, drum ) => this.rootElement.addDrum( id, drum ),
			addDrumcut: ( id, drumcut ) => this.rootElement.addDrumcut( id, drumcut ),
			changeDrum: ( id, prop, val ) => this.rootElement.changeDrum( id, prop, val ),
			removeDrum: id => this.rootElement.removeDrum( id ),
			removeDrumcut: id => this.rootElement.removeDrumcut( id ),
		},
	} )
	#dataDrumrows = new DAWCore.controllers.drumrows( {
		dataCallbacks: {
			addDrumrow: id => {
				this.#uiDrumrows.add( id, this.rootElement.createDrumrow( id ) );
				this.#setPropFilter( id, "gain" );
			},
			removeDrumrow: id => this.#uiDrumrows.remove( id ),
			changeDrumrow: ( id, prop, val ) => {
				switch ( prop ) {
					default:
						this.#uiDrumrows.change( id, prop, val );
						break;
					case "pattern":
						this.#uiDrumrows.change( id, prop, this.#svgManager.createSVG( val ) );
					break;
					case "duration": {
						const patId = this.#dawcore.get.drumrow( id ).pattern,
							bufId = this.#dawcore.get.pattern( patId ).buffer;

						this.#uiDrumrows.change( id, prop, this.#dawcore.get.buffer( bufId ).duration );
					} break;
				}
			},
		},
	} )

	constructor() {
		Object.seal( this );

		GSUI.listenEvents( this.rootElement, {
			gsuiDrumrows: {
				change: d => { this.#dawcore.callAction( ...d.args ); },
				propFilter: d => { this.#setPropFilter( ...d.args ); },
				propFilters: d => { this.#setAllPropFilters( ...d.args ); },
				liveStopDrum: d => { this.#dawcore.drums.stopLiveDrum( ...d.args ); },
				liveStartDrum: d => { this.#dawcore.drums.startLiveDrum( ...d.args ); },
				liveChangeDrumrow: d => { this.#dawcore.drums.changeLiveDrumrow( ...d.args ); },
			},
			gsuiDrums: {
				change: d => {
					const [ act, ...args ] = d.args;

					this.#dawcore.callAction( act, this.#patternId, ...args );
				},
			},
			gsuiTimeline: {
				changeCurrentTime: d => {
					this.#dawcore.drums.setCurrentTime( d.args[ 0 ] );
				},
				changeLoop: d => {
					const [ a, b ] = d.args;

					a !== false
						? this.#dawcore.drums.setLoop( a, b )
						: this.#dawcore.drums.clearLoop();
				},
			},
			gsuiSliderGroup: {
				change: d => {
					this.#dawcore.callAction( "changeDrumsProps", this.#patternId, ...d.args );
				},
				input: d => {
					this.#uiDrumrows.setDrumPropValue( d.args[ 0 ], d.args[ 2 ], d.args[ 3 ] );
				},
				inputEnd: d => {
					this.#uiDrumrows.removeDrumPropValue( ...d.args );
				},
			},
		} );
		GSUI.setAttribute( this.rootElement, "disabled", true );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	selectPattern( id ) {
		if ( id !== this.#patternId ) {
			this.#patternId = id;
			this.#drumsId = null;
			this.#dataDrums.clear();
			GSUI.setAttribute( this.rootElement, "disabled", !id );
			if ( id ) {
				const pat = this.#dawcore.get.pattern( id ),
					drums = this.#dawcore.get.drums( pat.drums );

				this.#drumsId = pat.drums;
				this.#dataDrums.change( drums );
			}
		}
	}
	setWaveforms( svgManager ) {
		this.#svgManager = svgManager;
	}
	onstartdrum( rowId ) {
		this.#uiDrumrows.playRow( rowId );
	}
	onstopdrumrow( rowId ) {
		this.#uiDrumrows.stopRow( rowId );
	}
	change( obj ) {
		const drmObj = obj.drums && obj.drums[ this.#drumsId ];

		this.#dataDrumrows.change( obj );
		if ( obj.drumrows ) {
			this.rootElement.drumrows.reorderDrumrows( obj.drumrows );
		}
		if ( "beatsPerMeasure" in obj || "stepsPerBeat" in obj ) {
			const bPM = obj.beatsPerMeasure || this.#dawcore.get.beatsPerMeasure(),
				sPB = obj.stepsPerBeat || this.#dawcore.get.stepsPerBeat();

			this.rootElement.timeDivision( bPM, sPB );
		}
		if ( drmObj ) {
			this.#dataDrums.change( drmObj );
		}
		if ( "patternDrumsOpened" in obj ) {
			this.selectPattern( obj.patternDrumsOpened );
		}
	}
	clear() {
		this.selectPattern( null );
		this.#dataDrumrows.clear();
	}

	// .........................................................................
	#setPropFilter( rowId, prop ) {
		const propValues = Object.entries( this.#dawcore.get.drums( this.#drumsId ) )
				.filter( ( [, drm ] ) => drm.row === rowId && "gain" in drm )
				.map( ( [ id, drm ] ) => [ id, drm[ prop ] ] );

		this.#uiDrumrows.setPropFilter( rowId, prop );
		this.rootElement.setPropValues( rowId, prop, propValues );
	}
	#setAllPropFilters( prop ) {
		Object.keys( this.#dawcore.get.drumrows() )
			.forEach( id => this.#setPropFilter( id, prop ) );
	}
}

Object.freeze( GSDrums );
