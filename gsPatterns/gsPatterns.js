"use strict";

class GSPatterns {
	#buffers = {}
	#dawcore = null
	#uiPatterns = null
	#synthsCrud = null
	#patternsCrud = null
	#channelsCrud = null

	constructor() {
		const uiPatterns = GSUI.createElement( "gsui-patterns" ),
			svgForms = Object.freeze( {
				keys: new gsuiKeysforms(),
				drums: new gsuiDrumsforms(),
				buffer: new gsuiWaveforms(),
				bufferHD: new gsuiWaveforms(),
				slices: new gsuiSlicesforms(),
			} );

		uiPatterns.onpatternDataTransfer = elPat => {
			const id = elPat.dataset.id;

			return `${ id }:${ this.#dawcore.get.pattern( id ).duration }`;
		};
		uiPatterns.onchange = ( act, ...args ) => {
			if ( act in DAWCore.actions ) {
				this.#dawcore.callAction( act, ...args );
			} else {
				lg( "GSPatterns.onchange", act, ...args );
			}
		};
		this.data = Object.freeze( {
			synths: {},
			patterns: {},
			channels: {},
		} );
		this.rootElement = uiPatterns;
		this.svgForms = svgForms;
		this.#uiPatterns = uiPatterns;
		this.#synthsCrud = DAWCore.utils.createUpdateDelete.bind( null, this.data.synths,
			this.#createSynth.bind( this ),
			this.#updateSynth.bind( this ),
			this.#deleteSynth.bind( this ) );
		this.#patternsCrud = DAWCore.utils.createUpdateDelete.bind( null, this.data.patterns,
			this.#createPattern.bind( this ),
			this.#updatePattern.bind( this ),
			this.#deletePattern.bind( this ) );
		this.#channelsCrud = DAWCore.utils.createUpdateDelete.bind( null, this.data.channels,
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
	clear() {
		Object.keys( this.data.patterns ).forEach( this.#deletePattern, this );
		Object.keys( this.data.synths ).forEach( this.#deleteSynth, this );
		Object.keys( this.#buffers ).forEach( id => delete this.#buffers[ id ] );
		this.svgForms.keys.empty();
		this.svgForms.drums.empty();
		this.svgForms.slices.empty();
		this.svgForms.buffer.empty();
		this.svgForms.bufferHD.empty();
	}
	bufferLoaded( buffers ) {
		const pats = Object.entries( this.#dawcore.get.patterns() ),
			bufToPat = pats.reduce( ( map, [ id, pat ] ) => {
				map[ pat.buffer ] = id;
				return map;
			}, {} );

		Object.entries( buffers ).forEach( ( [ idBuf, buf ] ) => {
			this.#buffers[ idBuf ] = buf;
			this.svgForms.buffer.update( bufToPat[ idBuf ], buf.buffer );
			this.svgForms.bufferHD.update( bufToPat[ idBuf ], buf.buffer );
		} );
	}
	change( obj ) {
		this.#synthsCrud( obj.synths );
		this.#patternsCrud( obj.patterns );
		this.#channelsCrud( obj.channels );
		if ( obj.keys || obj.drums || obj.slices || obj.drumrows || obj.patterns ) {
			Object.entries( this.#dawcore.get.patterns() ).forEach( ( [ id, pat ] ) => {
				if (
					( pat.type === "drums" && ( obj.patterns?.[ id ]?.duration || obj.drums?.[ pat.drums ] || obj.drumrows ) ) ||
					( pat.type === "keys" && ( obj.patterns?.[ id ]?.duration || obj.keys?.[ pat.keys ] ) ) ||
					( pat.type === "slices" && ( obj.patterns?.[ id ]?.duration || obj.slices?.[ pat.slices ] ) )
				) {
					this.#updatePatternContent( id );
				}
			} );
		}
		if ( obj.patterns ) {
			this.#uiPatterns.reorderPatterns( obj.patterns );
		}
		if ( "patternSlicesOpened" in obj ) {
			// this.#uiPatterns.selectPattern( "slices", obj.patternSlicesOpened );
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
		const get = this.#dawcore.get,
			pat = get.pattern( id ),
			elPat = this.#uiPatterns.getPattern( id );

		if ( elPat ) {
			const type = pat.type;

			switch ( type ) {
				case "keys":
					this.svgForms.keys.update( id, get.keys( pat.keys ), pat.duration );
					break;
				case "slices":
					this.svgForms.slices.update( id, get.slices( pat.slices ), pat.duration );
					break;
				case "drums":
					this.svgForms.drums.update( id, get.drums( pat.drums ), get.drumrows(), pat.duration, get.stepsPerBeat() );
					break;
				case "buffer": {
					const buf = this.#buffers[ pat.buffer ];

					if ( buf ) {
						this.svgForms.buffer.update( id, buf.buffer );
						this.svgForms.bufferHD.update( id, buf.buffer );
					}
				} break;
			}
			if ( type !== "buffer" ) {
				this.svgForms[ type ].setSVGViewbox( elPat.querySelector( "svg" ), 0, pat.duration );
			}
		}
	}

	// .........................................................................
	#createSynth( id, obj ) {
		this.data.synths[ id ] = DAWCore.utils.jsonCopy( obj );
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
			this.#uiPatterns.changeSynth( id, "destName", this.#dawcore.get.channel( obj.dest ).name );
		}
	}
	#deleteSynth( id ) {
		delete this.data.synths[ id ];
		this.#uiPatterns.deleteSynth( id );
	}

	// .........................................................................
	#createPattern( id, obj ) {
		if ( obj.type === "slices" ) {
			return;
		}

		const isBuf = obj.type === "buffer",
			SVG = this.svgForms[ isBuf ? "bufferHD" : obj.type ];

		this.data.patterns[ id ] = DAWCore.utils.jsonCopy( obj );
		SVG.add( id );
		if ( isBuf ) {
			const buf = this.#buffers[ obj.buffer ];

			this.svgForms.buffer.add( id );
			if ( buf ) {
				this.svgForms.buffer.update( id, buf.buffer );
				SVG.update( id, buf.buffer );
			}
		}
		this.#uiPatterns.addPattern( id, obj );
		this.#updatePattern( id, obj );
		this.#uiPatterns.appendPatternSVG( id, SVG.createSVG( id ) );
	}
	#updatePattern( id, obj ) {
		const dat = this.data.patterns[ id ];

		Object.entries( obj ).forEach( ( [ prop, val ] ) => {
			dat[ prop ] = val;
			this.#uiPatterns.changePattern( id, prop, val );
		} );
		if ( "dest" in obj ) {
			this.#uiPatterns.changePattern( id, "destName", this.#dawcore.get.channel( obj.dest ).name );
		}
	}
	#deletePattern( id ) {
		const pat = this.data.patterns[ id ];

		delete this.data.patterns[ id ];
		this.svgForms[ pat.type ].delete( id );
		if ( pat.type === "buffer" ) {
			this.svgForms.bufferHD.delete( id );
		}
		this.#uiPatterns.deletePattern( id );
	}

	// .........................................................................
	#createChannel( id, obj ) {
		this.data.channels[ id ] = obj.name;
		this.#uiPatterns.addChannel( id, obj.name );
	}
	#updateChannel( id, obj ) {
		if ( "name" in obj ) {
			this.#uiPatterns.updateChannel( id, obj.name );
		}
	}
	#deleteChannel( id ) {
		delete this.data.channels[ id ];
		this.#uiPatterns.deleteChannel( id );
	}
}

Object.freeze( GSPatterns );
