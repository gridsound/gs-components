"use strict";

class GSPatterns {
	#dawcore = null;
	#gsLibraries = null;
	#uiPatterns = null;
	#synthsCrud = null;
	#patternsCrud = null;
	#channelsCrud = null;

	constructor() {
		const uiPatterns = GSUI.$createElement( "gsui-patterns" );
		const svgForms = Object.freeze( {
			keys: new gsuiKeysforms(),
			drums: new gsuiDrumsforms(),
			buffer: new gsuiWaveforms(),
			bufferHD: new gsuiWaveforms(),
			slices: new gsuiSlicesforms(),
		} );

		uiPatterns.onpatternDataTransfer = elPat => elPat.dataset.id;
		uiPatterns.onchange = ( act, ...args ) => {
			if ( DAWCoreActions.has( act ) ) {
				const daw = this.#dawcore;

				if ( act === "removePattern" && daw.$isPlaying() ) {
					const id = args[ 0 ];
					const type = daw.$getPattern( id ).type;

					if ( type === daw.$getFocusedName() && id === daw.$getOpened( type ) ) {
						daw.$stop();
					}
				}
				daw.$callAction( act, ...args );
			} else {
				console.log( "GSPatterns.onchange", act, ...args );
			}
		};
		GSUI.$listenEvents( uiPatterns, {
			gsuiPatterns: {
				libraryBufferDropped: d => {
					const [ lib, bufURL ] = d.args;
					const [ hash, name ] = bufURL.split( ":" );

					this.#dawcore.$buffersGetAudioBuffer( hash )
						.then( buf => {
							const obj = this.#dawcore.$callAction( "addPatternBuffer", lib, bufURL, buf );
							const buf2 = obj && Object.entries( obj.buffers )[ 0 ];

							if ( buf2 ) {
								this.#dawcore.$callCallback( "buffersLoaded", buf2[ 0 ], { ...buf2[ 1 ], buffer: buf } );
							}
						} );
				},
			},
		} );
		this.data = Object.freeze( {
			synths: {},
			patterns: {},
			channels: {},
		} );
		this.rootElement = uiPatterns;
		this.svgForms = svgForms;
		this.#uiPatterns = uiPatterns;
		this.#synthsCrud = DAWCoreUtils.$createUpdateDelete.bind( null, this.data.synths,
			this.#createSynth.bind( this ),
			this.#updateSynth.bind( this ),
			this.#deleteSynth.bind( this ) );
		this.#patternsCrud = DAWCoreUtils.$createUpdateDelete.bind( null, this.data.patterns,
			this.#createPattern.bind( this ),
			this.#updatePattern.bind( this ),
			this.#deletePattern.bind( this ) );
		this.#channelsCrud = DAWCoreUtils.$createUpdateDelete.bind( null, this.data.channels,
			this.#createChannel.bind( this ),
			this.#updateChannel.bind( this ),
			this.#deleteChannel.bind( this ) );
		Object.seal( this );

		svgForms.bufferHD.hdMode( true );
		svgForms.bufferHD.setDefaultViewbox( 260, 48 );
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
		this.svgForms.keys.empty();
		this.svgForms.drums.empty();
		this.svgForms.slices.empty();
		this.svgForms.buffer.empty();
		this.svgForms.bufferHD.empty();
	}
	bufferLoaded( id, buf ) {
		const pats = Object.entries( this.#dawcore.$getPatterns() );
		const bufToPat = pats.reduce( ( map, [ id, pat ] ) => {
			map[ pat.buffer ] = id;
			return map;
		}, {} );

		this.svgForms.buffer.update( bufToPat[ id ], buf );
		this.svgForms.bufferHD.update( bufToPat[ id ], buf );
		this.#uiPatterns.changePattern( bufToPat[ id ], "data-missing", false );
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
			this.#uiPatterns.reorderPatterns( obj.patterns );
		}
		if ( "patternSlicesOpened" in obj ) {
			this.#uiPatterns.selectPattern( "slices", obj.patternSlicesOpened );
		}
		if ( "patternDrumsOpened" in obj ) {
			this.#uiPatterns.selectPattern( "drums", obj.patternDrumsOpened );
		}
		if ( "patternKeysOpened" in obj ) {
			this.#uiPatterns.selectPattern( "keys", obj.patternKeysOpened );
		}
		if ( "synthOpened" in obj ) {
			this.#uiPatterns.selectSynth( obj.synthOpened );
		}
	}

	// .........................................................................
	#updatePatternContent( id ) {
		const daw = this.#dawcore;
		const pat = daw.$getPattern( id );
		const elPat = this.#uiPatterns.getPattern( id );

		if ( elPat ) {
			const type = pat.type;
			const dur = daw.$getPatternDuration( id );

			switch ( type ) {
				case "keys":
					this.svgForms.keys.update( id, daw.$getKeys( pat.keys ), dur );
					break;
				case "slices":
					this.svgForms.slices.update( id, daw.$getSlices( pat.slices ), dur );
					break;
				case "drums":
					this.svgForms.drums.update( id, daw.$getDrums( pat.drums ), daw.$getDrumrows(), dur, daw.$getStepsPerBeat() );
					break;
				case "buffer": {
					const buf = this.#dawcore.$getAudioBuffer( pat.buffer );

					if ( buf ) {
						this.svgForms.buffer.update( id, buf );
						this.svgForms.bufferHD.update( id, buf );
					}
				} break;
			}
			if ( type !== "buffer" ) {
				this.svgForms[ type ].setSVGViewbox( elPat.querySelector( "svg" ), 0, dur );
			}
		}
	}

	// .........................................................................
	#createSynth( id, obj ) {
		this.data.synths[ id ] = DAWCoreUtils.$jsonCopy( obj );
		this.#uiPatterns.addSynth( id );
		this.#updateSynth( id, obj );
	}
	#updateSynth( id, obj ) {
		const dat = this.data.synths[ id ];

		Object.entries( obj ).forEach( ( [ prop, val ] ) => {
			dat[ prop ] = val;
			this.#uiPatterns.changeSynth( id, prop, val );
		} );
		if ( "dest" in obj ) {
			this.#uiPatterns.changeSynth( id, "destName", this.#dawcore.$getChannel( obj.dest ).name );
		}
	}
	#deleteSynth( id ) {
		delete this.data.synths[ id ];
		this.#uiPatterns.deleteSynth( id );
	}

	// .........................................................................
	#createPattern( id, obj ) {
		const isBuf = obj.type === "buffer";
		const buf = isBuf && this.#dawcore.$getAudioBuffer( obj.buffer );
		const SVG = this.svgForms[ isBuf ? "bufferHD" : obj.type ];

		this.data.patterns[ id ] = DAWCoreUtils.$jsonCopy( obj );
		SVG.add( id );
		if ( isBuf ) {
			const objBuf = this.#dawcore.$getBuffer( obj.buffer );
			const bufHash = objBuf.url || objBuf.hash;

			this.svgForms.buffer.add( id );
			if ( buf ) {
				this.svgForms.buffer.update( id, buf );
				SVG.update( id, buf );
			}
			this.data.patterns[ id ].bufferHash = bufHash;
			this.#gsLibraries.$bookmarkBuffer( bufHash, true );
		}
		this.#uiPatterns.addPattern( id, obj );
		this.#updatePattern( id, obj );
		this.#uiPatterns.appendPatternSVG( id, SVG.createSVG( id ) );
		if ( isBuf && !buf ) {
			this.#uiPatterns.changePattern( id, "data-missing", true );
		}
	}
	#updatePattern( id, obj ) {
		const dat = this.data.patterns[ id ];

		Object.entries( obj ).forEach( ( [ prop, val ] ) => {
			dat[ prop ] = val;
			this.#uiPatterns.changePattern( id, prop, val );
		} );
		if ( "dest" in obj ) {
			this.#uiPatterns.changePattern( id, "destName", this.#dawcore.$getChannel( obj.dest ).name );
		}
	}
	#deletePattern( id ) {
		const pat = this.data.patterns[ id ];

		delete this.data.patterns[ id ];
		this.svgForms[ pat.type ].delete( id );
		if ( pat.type === "buffer" ) {
			this.svgForms.bufferHD.delete( id );
			this.#gsLibraries.$bookmarkBuffer( pat.bufferHash, false );
		}
		this.#uiPatterns.deletePattern( id );
	}

	// .........................................................................
	#createChannel( id, obj ) {
		this.data.channels[ id ] = obj.name;
	}
	#updateChannel( id, obj ) {
		if ( "name" in obj ) {
			this.#uiPatterns.updateChannel( id, obj.name );
		}
	}
	#deleteChannel( id ) {
		delete this.data.channels[ id ];
	}
}

Object.freeze( GSPatterns );
