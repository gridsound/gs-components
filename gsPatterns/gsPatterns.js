"use strict";

class GSPatterns {
	#dawcore = null;
	#gsLibraries = null;
	#uiPatterns = null;
	#synthsCrud = null;
	#patternsCrud = null;
	#channelsCrud = null;
	#patternsActions = {
		clonePattern: DAWCoreActions_clonePattern,
		removePattern: DAWCoreActions_removePattern,
		openPattern: DAWCoreActions_openPattern,
		openSynth: DAWCoreActions_openSynth,
		addPatternKeys: DAWCoreActions_addPatternKeys,
		removeSynth: DAWCoreActions_removeSynth,
		addPatternSlices: DAWCoreActions_addPatternSlices,
		addPatternDrums: DAWCoreActions_addPatternDrums,
		addSynth: DAWCoreActions_addSynth,
		reorderPattern: DAWCoreActions_reorderPattern,
		redirectPatternKeys: DAWCoreActions_redirectPatternKeys,
		changePatternBufferInfo: DAWCoreActions_changePatternBufferInfo,
		redirectPatternBuffer: DAWCoreActions_redirectPatternBuffer,
		redirectSynth: DAWCoreActions_redirectSynth,
	};

	constructor() {
		const uiPatterns = GSUcreateElement( "gsui-patterns" );

		uiPatterns.onpatternDataTransfer = elPat => elPat.dataset.id;
		uiPatterns.onchange = ( act, ...args ) => {
			if ( act in this.#patternsActions ) {
				const daw = this.#dawcore;

				if ( act === "removePattern" && daw.$isPlaying() ) {
					const id = args[ 0 ];
					const type = daw.$getPattern( id ).type;

					if ( type === daw.$getFocusedName() && id === daw.$getOpened( type ) ) {
						daw.$stop();
					}
				}
				daw.$callAction( this.#patternsActions[ act ], ...args );
			} else {
				console.log( "GSPatterns.onchange", act, ...args );
			}
		};
		uiPatterns.$getChannels = () => this.#dawcore.$getChannels();
		GSUlistenEvents( uiPatterns, {
			gsuiPatterns: {
				libraryBufferDropped: d => this.#dawcore.$callAction( DAWCoreActions_addPatternBuffer, ...d.args ),
			},
		} );
		this.data = Object.freeze( {
			synths: {},
			patterns: {},
			channels: {},
		} );
		this.rootElement = uiPatterns;
		this.#uiPatterns = uiPatterns;
		this.#synthsCrud = GSUcreateUpdateDelete.bind( null, this.data.synths,
			this.#createSynth.bind( this ),
			this.#updateSynth.bind( this ),
			this.#deleteSynth.bind( this ) );
		this.#patternsCrud = GSUcreateUpdateDelete.bind( null, this.data.patterns,
			this.#createPattern.bind( this ),
			this.#updatePattern.bind( this ),
			this.#deletePattern.bind( this ) );
		this.#channelsCrud = GSUcreateUpdateDelete.bind( null, this.data.channels,
			this.#createChannel.bind( this ),
			this.#updateChannel.bind( this ),
			this.#deleteChannel.bind( this ) );
		Object.seal( this );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	setLibraries( lib ) {
		this.#gsLibraries = lib;
	}
	clear() {
		Object.keys( this.data.patterns ).forEach( this.#deletePattern, this );
		Object.keys( this.data.synths ).forEach( this.#deleteSynth, this );
	}
	bufferLoaded( id, buf ) {
		const pats = Object.entries( this.#dawcore.$getPatterns() );
		const bufToPat = pats.reduce( ( map, [ id, pat ] ) => {
			map[ pat.buffer ] = id;
			return map;
		}, {} );

		gsuiSVGPatterns.$update( "buffer", bufToPat[ id ], buf );
		this.#uiPatterns.$changePattern( bufToPat[ id ], "data-missing", false );
	}
	change( obj ) {
		this.#synthsCrud( obj.synths );
		this.#patternsCrud( obj.patterns );
		this.#channelsCrud( obj.channels );
		if ( obj.keys || obj.drums || obj.slices || obj.drumrows || obj.patterns ) {
			Object.entries( this.#dawcore.$getPatterns() ).forEach( ( [ id, pat ] ) => {
				const objPat = obj.patterns?.[ id ];

				if (
					( pat.type === "drums" && ( objPat?.duration || obj.drums?.[ pat.drums ] || obj.drumrows ) ) ||
					( pat.type === "keys" && ( objPat?.duration || obj.keys?.[ pat.keys ] ) ) ||
					( pat.type === "slices" && ( objPat?.source || obj.patterns?.[ pat.source ]?.duration || obj.slices?.[ pat.slices ] ) )
				) {
					this.#updatePatternContent( id );
				}
			} );
		}
		if ( obj.patterns ) {
			this.#uiPatterns.$reorderPatterns( obj.patterns );
		}
		if ( "patternSlicesOpened" in obj ) {
			this.#uiPatterns.$selectPattern( "slices", obj.patternSlicesOpened );
		}
		if ( "patternDrumsOpened" in obj ) {
			this.#uiPatterns.$selectPattern( "drums", obj.patternDrumsOpened );
		}
		if ( "patternKeysOpened" in obj ) {
			this.#uiPatterns.$selectPattern( "keys", obj.patternKeysOpened );
		}
		if ( "synthOpened" in obj ) {
			this.#uiPatterns.$selectSynth( obj.synthOpened );
		}
		if ( obj.buffers ) {
			Object.entries( this.#dawcore.$getPatterns() ).forEach( ( [ id, pat ] ) => {
				const objBuf = obj.buffers[ pat.buffer ];

				if ( objBuf && "reverse" in objBuf ) {
					this.#uiPatterns.$changePattern( id, "reverse", objBuf.reverse );
				}
			} );
		}
	}

	// .........................................................................
	#updatePatternContent( id ) {
		const daw = this.#dawcore;
		const pat = daw.$getPattern( id );
		const elPat = this.#uiPatterns.$getPattern( id );

		if ( elPat ) {
			gsuiSVGPatterns.$update( pat.type, id,
				this.#getPatternContent( id ),
				daw.$getPatternDuration( id ),
				elPat.querySelector( "svg" ) );
		}
	}
	#getPatternContent( id ) {
		const daw = this.#dawcore;
		const pat = daw.$getPattern( id );

		switch ( pat.type ) {
			case "keys": return daw.$getKeys( pat.keys );
			case "slices": return daw.$getSlices( pat.slices );
			case "buffer": return daw.$getAudioBuffer( pat.buffer );
			case "drums": return [
				daw.$getDrums( pat.drums ),
				daw.$getDrumrows(),
				daw.$getStepsPerBeat(),
			];
		}
	}

	// .........................................................................
	#createSynth( id, obj ) {
		this.data.synths[ id ] = GSUjsonCopy( obj );
		this.#uiPatterns.$addSynth( id );
		this.#updateSynth( id, obj );
	}
	#updateSynth( id, obj ) {
		const dat = this.data.synths[ id ];

		Object.entries( obj ).forEach( ( [ prop, val ] ) => {
			dat[ prop ] = val;
			this.#uiPatterns.$changeSynth( id, prop, val );
		} );
		if ( "dest" in obj ) {
			this.#uiPatterns.$changeSynth( id, "destName", this.#dawcore.$getChannel( obj.dest ).name );
		}
	}
	#deleteSynth( id ) {
		delete this.data.synths[ id ];
		this.#uiPatterns.$deleteSynth( id );
	}

	// .........................................................................
	#createPattern( id, obj ) {
		const isBuf = obj.type === "buffer";
		const type = isBuf ? "bufferHD" : obj.type;
		const buf = isBuf && this.#dawcore.$getAudioBuffer( obj.buffer );

		this.data.patterns[ id ] = GSUjsonCopy( obj );
		gsuiSVGPatterns.$add( type, id );
		if ( isBuf ) {
			const objBuf = this.#dawcore.$getBuffer( obj.buffer );
			const bufHash = objBuf.url || objBuf.hash;

			gsuiSVGPatterns.$add( "buffer", id );
			if ( buf ) {
				gsuiSVGPatterns.$update( "buffer", id, buf );
			}
			this.data.patterns[ id ].bufferHash = bufHash;
			this.#gsLibraries.$bookmarkBuffer( bufHash, true );
		}
		this.#uiPatterns.$addPattern( id, obj );
		this.#updatePattern( id, obj );
		this.#uiPatterns.$appendPatternSVG( id, gsuiSVGPatterns.$createSVG( type, id ) );
		if ( isBuf && !buf ) {
			this.#uiPatterns.$changePattern( id, "data-missing", true );
		}
	}
	#updatePattern( id, obj ) {
		const dat = this.data.patterns[ id ];

		Object.entries( obj ).forEach( ( [ prop, val ] ) => {
			dat[ prop ] = val;
			this.#uiPatterns.$changePattern( id, prop, val );
		} );
		if ( "dest" in obj ) {
			this.#uiPatterns.$changePattern( id, "destName", this.#dawcore.$getChannel( obj.dest ).name );
		}
	}
	#deletePattern( id ) {
		const pat = this.data.patterns[ id ];

		delete this.data.patterns[ id ];
		gsuiSVGPatterns.$delete( pat.type, id );
		if ( pat.type === "buffer" ) {
			gsuiSVGPatterns.$delete( "bufferHD", id );
			this.#gsLibraries.$bookmarkBuffer( pat.bufferHash, false );
		}
		this.#uiPatterns.$deletePattern( id );
	}

	// .........................................................................
	#createChannel( id, obj ) {
		this.data.channels[ id ] = obj.name;
	}
	#updateChannel( id, obj ) {
		if ( "name" in obj ) {
			this.#uiPatterns.$updateChannel( id, obj.name );
		}
	}
	#deleteChannel( id ) {
		delete this.data.channels[ id ];
	}
}

Object.freeze( GSPatterns );
