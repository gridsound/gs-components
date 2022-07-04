"use strict";

class GSSlicer {
	rootElement = GSUI.$createElement( "gsui-slicer" );
	#dawcore = null;
	#ctrlSlices = new DAWCoreControllers.slicer( {
		dataCallbacks: {
			disabled: b => GSUI.$setAttribute( this.rootElement, "disabled", b ),
			timedivision: timediv => GSUI.$setAttribute( this.rootElement, "timedivision", timediv ),
			setBuffer: buf => this.rootElement.setBuffer( buf ),
			renameBuffer: name => this.rootElement.setBufferName( name ),
			removeBuffer: () => {
				this.rootElement.removeBuffer();
				GSUI.$setAttribute( this.rootElement, "duration", this.#dawcore.$getBeatsPerMeasure() );
			},
			changeDuration: dur => GSUI.$setAttribute( this.rootElement, "duration", dur ),
			addSlice: ( id, obj ) => this.rootElement.addSlice( id, obj ),
			changeSlice: ( id, obj ) => this.rootElement.changeSlice( id, obj ),
			removeSlice: id => this.rootElement.removeSlice( id ),
		},
	} );

	constructor() {
		Object.seal( this );

		GSUI.$listenEvents( this.rootElement, {
			gsuiSlicer: {
				dropBuffer: obj => {
					this.#dawcore.$callAction( "redirectPatternSlices", this.#ctrlSlices.getPatternId(), obj.args[ 0 ] );
				},
				changeProp: obj => {
					this.#dawcore.$callAction( "changePatternSlices", this.#ctrlSlices.getPatternId(), ...obj.args );
				},
			},
			gsuiTimeline: {
				changeCurrentTime: d => {
					this.#dawcore.$slicesSetCurrentTime( d.args[ 0 ] );
				},
				changeLoop: d => {
					d.args[ 0 ] !== false
						? this.#dawcore.$slicesSetLoop( ...d.args )
						: this.#dawcore.$slicesClearLoop();
				},
			},
		} );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
		this.#ctrlSlices.setDAWCore( core );
	}
	change( obj ) {
		this.#ctrlSlices.change( obj );
	}
	clear() {
		this.#ctrlSlices.clear();
	}
}

Object.freeze( GSSlicer );
