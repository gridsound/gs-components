"use strict";

class GSPianoroll {
	#dawcore = null;
	#keysId = null;
	#patternId = null;
	rootElement = new gsuiPianoroll();
	timeline = this.rootElement.timeline;
	#dataKeys = new DAWCoreControllers.keys( {
		dataCallbacks: {
			addKey: ( id, blc ) => this.rootElement.addKey( id, blc ),
			removeKey: id => this.rootElement.removeKey( id ),
			changeKeyProp: ( id, prop, val ) => this.rootElement.changeKeyProp( id, prop, val ),
		},
	} );

	constructor() {
		Object.seal( this );

		GSUI.$listenEvents( this.rootElement, {
			gsuiPianoroll: {
				changeKeysProps: d => {
					this.#dawcore.$callAction( "changeKeysProps", this.#patternId, ...d.args );
				},
			},
			gsuiTimeline: {
				changeCurrentTime: d => {
					this.#dawcore.$keysSetCurrentTime( d.args[ 0 ] );
				},
				changeLoop: d => {
					d.args[ 0 ] !== false
						? this.#dawcore.$keysSetLoop( ...d.args )
						: this.#dawcore.$keysClearLoop();
				},
			},
			gsuiKeys: {
				keyUp: d => { this.#dawcore.$liveKeyup( d.args[ 0 ] ); },
				keyDown: d => { this.#dawcore.$liveKeydown( d.args[ 0 ] ); },
			},
		} );
		this.rootElement.setData( this.#dataKeys.data );
		this.rootElement.setCallbacks( {
			onchange: this.#onchange.bind( this ),
		} );
		GSUI.$setAttribute( this.rootElement, "disabled", true );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	selectPattern( id ) {
		if ( id !== this.#patternId ) {
			this.#patternId = id;
			this.#keysId = null;
			this.#dataKeys.clear();
			this.rootElement.reset();
			GSUI.$setAttribute( this.rootElement, "disabled", !id );
			if ( id ) {
				const pat = this.#dawcore.$getPattern( id );
				const keys = this.#dawcore.$getKeys( pat.keys );

				this.#keysId = pat.keys;
				this.#dataKeys.change( keys );
				this.rootElement.scrollToKeys();
			}
		}
	}
	change( obj ) {
		if ( "timedivision" in obj ) {
			this.rootElement.timedivision( obj.timedivision );
		}
		if ( "patternKeysOpened" in obj ) {
			this.selectPattern( obj.patternKeysOpened );
		} else {
			const keys = obj.keys && obj.keys[ this.#keysId ];

			if ( keys ) {
				this.#dataKeys.change( keys );
			}
		}
	}
	clear() {
		this.selectPattern( null );
		this.#dataKeys.clear();
		this.#dawcore.$keysClearLoop();
	}
	getUIKeys() {
		return this.rootElement.uiKeys;
	}

	// .........................................................................
	#onchange( obj, ...args ) {
		switch ( obj ) { // tmp
			case "add": this.#dawcore.$callAction( "addKey", this.#patternId, ...args ); break;
			case "move": this.#dawcore.$callAction( "moveKeys", this.#patternId, ...args ); break;
			case "clone": this.#dawcore.$callAction( "cloneSelectedKeys", this.#patternId, ...args ); break;
			case "remove": this.#dawcore.$callAction( "removeKeys", this.#patternId, ...args ); break;
			case "cropEnd": this.#dawcore.$callAction( "cropEndKeys", this.#patternId, ...args ); break;
			case "redirect": this.#dawcore.$callAction( "redirectKey", this.#patternId, ...args ); break;
			case "selection": this.#dawcore.$callAction( "selectKeys", this.#patternId, ...args ); break;
			case "unselection": this.#dawcore.$callAction( "unselectAllKeys", this.#patternId, ...args ); break;
			case "unselectionOne": this.#dawcore.$callAction( "unselectKey", this.#patternId, ...args ); break;
		}
	}
}

Object.freeze( GSPianoroll );
