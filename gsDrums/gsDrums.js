"use strict";

class GSDrums {
	constructor() {
		const uiDrums = new gsuiDrums(),
			uiDrumrows = uiDrums.drumrows,
			dataDrumrows = new GSDataDrumrows( {
				dataCallbacks: {
					addDrumrow: id => uiDrumrows.addDrumrow( id, uiDrums.createDrumrow( id ) ),
					removeDrumrow: id => uiDrumrows.removeDrumrow( id ),
					renameDrumrow: ( id, name ) => uiDrumrows.renameDrumrow( id, name ),
					toggleDrumrow: ( id, b ) => uiDrumrows.toggleDrumrow( id, b ),
					reorderDrumrow: ( id, order ) => uiDrumrows.reorderDrumrow( id, order ),
				},
			} ),
			dataDrums = new GSDataDrums( {
				dataCallbacks: {
					addDrum: ( id, drum ) => uiDrums.addDrum( id, drum ),
					removeDrum: id => uiDrums.removeDrum( id ),
				},
			} );

		this.rootElement = uiDrums.rootElement;
		this._uiDrums = uiDrums;
		this._dataDrums = dataDrums;
		this._dataDrumrows = dataDrumrows;
		this._dawcore =
		this._drumsId =
		this._patternId = null;
		Object.seal( this );

		uiDrums.onchange = ( act, ...args ) => this._dawcore.callAction( act, this._patternId, ...args );
		uiDrums.drumrows.onchange = ( ...args ) => this._dawcore.callAction( ...args );
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
	change( obj ) {
		const drmObj = obj.drums && obj.drums[ this._drumsId ];

		this._dataDrumrows.change( obj );
		if ( obj.drumrows ) {
			this._uiDrums.drumrows.reorderDrumrows();
		}
		if ( drmObj ) {
			this._dataDrums.change( drmObj );
		}
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
	timeSignature( a, b ) {
		this._uiDrums.timeSignature( a, b );
	}
	empty() {
		this._dataDrums.clear();
		this._dataDrumrows.clear();
	}
}

Object.freeze( GSDrums );
