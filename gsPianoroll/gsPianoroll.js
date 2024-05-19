"use strict";

class GSPianoroll {
	#dawcore = null;
	#keysId = null;
	#patternId = null;
	rootElement = new gsuiPianoroll();
	timeline = this.rootElement.timeline;
	#dataKeys = new DAWCoreControllerKeys( {
		$changeDuration: dur => this.rootElement.$changeDuration( dur ),
		$addKey: ( id, blc ) => this.rootElement.$addKey( id, blc ),
		$removeKey: id => this.rootElement.$removeKey( id ),
		$changeKeyProp: ( id, prop, val ) => this.rootElement.$changeKeyProp( id, prop, val ),
	} );
	#pianorollActions = {
		add: DAWCoreActions_addKey,
		move: DAWCoreActions_moveKeys,
		clone: DAWCoreActions_cloneSelectedKeys,
		remove: DAWCoreActions_removeKeys,
		cropEnd: DAWCoreActions_cropEndKeys,
		redirect: DAWCoreActions_redirectKey,
		selection: DAWCoreActions_selectKeys,
		unselection: DAWCoreActions_unselectAllKeys,
		unselectionOne: DAWCoreActions_unselectKey,
	};

	constructor() {
		Object.seal( this );

		GSUlistenEvents( this.rootElement, {
			gsuiPianoroll: {
				changeKeysProps: d => {
					this.#dawcore.$callAction( DAWCoreActions_changeKeysProps, this.#patternId, ...d.args );
				},
				midiDropped: d => {
					this.#dawcore.$callAction( DAWCoreActions_dropMidiOnKeys, this.#patternId, ...d.args );
				},
			},
			gsuiBlocksManager: {
				startPreviewAudio: d => this.#dawcore.$liveKeydown( d.args[ 1 ], this.#dataKeys.$data[ d.args[ 0 ] ] ),
				stopPreviewAudio: d => this.#dawcore.$liveKeyup( d.args[ 1 ] ),
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
				keyDown: d => { this.#dawcore.$liveKeydown( d.args[ 0 ] ); },
				keyUp: d => { this.#dawcore.$liveKeyup( d.args[ 0 ] ); },
			},
		} );
		this.rootElement.$setData( this.#dataKeys.$data );
		this.rootElement.$setCallbacks( {
			$onchange: this.#onchange.bind( this ),
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
			this.#keysId = null;
			this.#dataKeys.$clear();
			this.rootElement.$reset();
			GSUsetAttribute( this.rootElement, "disabled", !id );
			if ( id ) {
				const pat = this.#dawcore.$getPattern( id );
				const keys = this.#dawcore.$getKeys( pat.keys );

				this.#keysId = pat.keys;
				this.#dataKeys.$change( keys );
				this.rootElement.$scrollToKeys();
			}
		}
	}
	change( obj ) {
		if ( "timedivision" in obj ) {
			this.rootElement.$timedivision( obj.timedivision );
		}
		if ( "patternKeysOpened" in obj ) {
			this.$selectPattern( obj.patternKeysOpened );
		} else {
			const keys = obj.keys && obj.keys[ this.#keysId ];

			if ( keys ) {
				this.#dataKeys.$change( keys );
			}
		}
	}
	clear() {
		this.$selectPattern( null );
		this.#dataKeys.$clear();
		this.#dawcore.$keysClearLoop();
	}
	getUIKeys() {
		return this.rootElement.uiKeys;
	}

	// .........................................................................
	#onchange( obj, ...args ) {
		this.#dawcore.$callAction( this.#pianorollActions[ obj ], this.#patternId, ...args );
	}
}

Object.freeze( GSPianoroll );
