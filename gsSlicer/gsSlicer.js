"use strict";

class GSSlicer {
	rootElement = GSUI.createElem( "gsui-slicer" );
	#dawcore = null;
	#ctrlSlices = new DAWCore.controllers.slicer( {
		dataCallbacks: {
			disabled: b => GSUI.setAttr( this.rootElement, "disabled", b ),
			timedivision: timediv => GSUI.setAttr( this.rootElement, "timedivision", timediv ),
			setBuffer: buf => this.rootElement.setBuffer( buf ),
			renameBuffer: name => this.rootElement.setBufferName( name ),
			removeBuffer: () => {
				this.rootElement.removeBuffer();
				GSUI.setAttr( this.rootElement, "duration", this.#dawcore.$getBeatsPerMeasure() );
			},
			changeDuration: dur => GSUI.setAttr( this.rootElement, "duration", dur ),
			addSlice: ( id, obj ) => this.rootElement.addSlice( id, obj ),
			changeSlice: ( id, obj ) => this.rootElement.changeSlice( id, obj ),
			removeSlice: id => this.rootElement.removeSlice( id ),
		},
	} );

	constructor() {
		Object.seal( this );

		GSUI.listenEv( this.rootElement, {
			gsuiSlicer: {
				dropBuffer: obj => {
					this.#dawcore.callAction( "redirectPatternSlices", this.#ctrlSlices.getPatternId(), obj.args[ 0 ] );
				},
				changeProp: obj => {
					this.#dawcore.callAction( "changePatternSlices", this.#ctrlSlices.getPatternId(), ...obj.args );
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
