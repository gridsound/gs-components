"use strict";

class GSDrums {
	#dawcore = null;
	#drumsId = null;
	#patternId = null;
	rootElement = GSUcreateElement( "gsui-drums" );
	timeline = this.rootElement.timeline;
	#dataDrums = new DAWCoreControllerDrums( {
		$changeDuration: dur => this.rootElement.$changeDuration( dur ),
		$addDrum: ( id, drum ) => this.rootElement.$addDrum( id, drum ),
		$addDrumcut: ( id, drumcut ) => this.rootElement.$addDrumcut( id, drumcut ),
		$changeDrum: ( id, prop, val ) => this.rootElement.$changeDrum( id, prop, val ),
		$removeDrum: id => this.rootElement.$removeDrum( id ),
		$removeDrumcut: id => this.rootElement.$removeDrumcut( id ),
	} );
	#dataDrumrows = new DAWCoreControllers.drumrows( {
		dataCallbacks: {
			addDrumrow: id => this.rootElement.$addDrumrow( id ),
			removeDrumrow: id => this.rootElement.$removeDrumrow( id ),
			changeDrumrow: ( id, prop, val ) => {
				switch ( prop ) {
					default:
						this.rootElement.$changeDrumrow( id, prop, val );
						break;
					case "pattern":
						this.rootElement.$changeDrumrow( id, prop, gsuiSVGPatterns.$createSVG( "bufferHD", val ) );
						break;
					case "duration": {
						const patId = this.#dawcore.$getDrumrow( id ).pattern;
						const bufId = this.#dawcore.$getPattern( patId ).buffer;

						this.rootElement.$changeDrumrow( id, prop, this.#dawcore.$getBuffer( bufId ).duration );
					} break;
				}
			},
		},
	} );

	constructor() {
		Object.seal( this );

		GSUlistenEvents( this.rootElement, {
			gsuiDrumrows: {
				remove: d => { this.#dawcore.$callAction( "removeDrumrow", d.args[ 0 ] ); },
				change: d => { this.#dawcore.$callAction( ...d.args ); },
				toggle: d => { this.#dawcore.$callAction( "toggleDrumrow", d.args[ 0 ] ); },
				toggleSolo: d => { this.#dawcore.$callAction( "toggleSoloDrumrow", d.args[ 0 ] ); },
				liveStopDrum: d => { this.#dawcore.$liveDrumStop( ...d.args ); },
				liveStartDrum: d => { this.#dawcore.$liveDrumStart( ...d.args ); },
				liveChangeDrumrow: d => { this.#dawcore.$liveDrumrowChange( ...d.args ); },
			},
			gsuiDrums: {
				reorderDrumrow: d => this.#dawcore.$callAction( "reorderDrumrow", ...d.args ),
				change: d => {
					const [ act, ...args ] = d.args;

					this.#dawcore.$callAction( act, this.#patternId, ...args );
				},
			},
			gsuiTimeline: {
				changeCurrentTime: d => {
					this.#dawcore.$drumsSetCurrentTime( d.args[ 0 ] );
				},
				changeLoop: d => {
					const [ a, b ] = d.args;

					a !== false
						? this.#dawcore.$drumsSetLoop( a, b )
						: this.#dawcore.$drumsClearLoop();
				},
			},
			gsuiSliderGroup: {
				change: d => {
					this.#dawcore.$callAction( "changeDrumsProps", this.#patternId, ...d.args );
				},
			},
		} );
		GSUsetAttribute( this.rootElement, "disabled", true );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	$selectPattern( id ) {
		if ( id !== this.#patternId ) {
			this.#patternId = id;
			this.#drumsId = null;
			this.#dataDrums.$clear();
			GSUsetAttribute( this.rootElement, "disabled", !id );
			if ( id ) {
				const pat = this.#dawcore.$getPattern( id );
				const drums = this.#dawcore.$getDrums( pat.drums );

				this.#drumsId = pat.drums;
				this.#dataDrums.$change( drums );
			}
		}
	}
	onstartdrum( rowId ) {
		this.rootElement.$startDrumrow( rowId );
	}
	onstopdrumrow( rowId ) {
		this.rootElement.$stopDrumrow( rowId );
	}
	change( obj ) {
		const drmObj = obj.drums?.[ this.#drumsId ];

		this.#dataDrumrows.change( obj );
		if ( obj.drumrows ) {
			this.rootElement.$reorderDrumrows( obj.drumrows );
		}
		if ( "timedivision" in obj ) {
			this.#dataDrums.$setTimedivision( obj.timedivision );
			GSUsetAttribute( this.rootElement, "timedivision", obj.timedivision );
		}
		if ( drmObj ) {
			this.#dataDrums.$change( drmObj );
		}
		if ( "patternDrumsOpened" in obj ) {
			this.$selectPattern( obj.patternDrumsOpened );
		}
	}
	clear() {
		this.$selectPattern( null );
		this.#dataDrumrows.clear();
		this.#dawcore.$drumsClearLoop();
	}
}

Object.freeze( GSDrums );
