"use strict";

class GSPatterns {
	constructor() {
		const uiPatterns = new gsuiPatterns( {
				patternDataTransfer: elPat => {
					const id = elPat.dataset.id;

					return `${ id }:${ this._dawcore.get.pattern( id ).duration }`;
				},
				onchange: ( act, ...args ) => {
					if ( act in DAWCore.actions ) {
						this._dawcore.callAction( act, ...args );
					} else {
						lg( "GSPatterns.onchange", act, ...args );
					}
				},
			} ),
			svgForms = Object.freeze( {
				keys: new gsuiKeysforms(),
				drums: new gsuiDrumsforms(),
				buffer: new gsuiWaveforms(),
				bufferHD: new gsuiWaveforms(),
			} );

		this.data = Object.freeze( {
			synths: {},
			patterns: {},
		} );
		this.rootElement = uiPatterns.rootElement;
		this.svgForms = svgForms;
		this._buffers = {};
		this._dawcore = null;
		this._uiPatterns = uiPatterns;
		this._synthsCrud = GSUtils.createUpdateDelete.bind( null, this.data.synths,
			this._createSynth.bind( this ),
			this._updateSynth.bind( this ),
			this._deleteSynth.bind( this ) );
		this._patternsCrud = GSUtils.createUpdateDelete.bind( null, this.data.patterns,
			this._createPattern.bind( this ),
			this._updatePattern.bind( this ),
			this._deletePattern.bind( this ) );
		Object.seal( this );

		svgForms.bufferHD.hdMode( true );
		svgForms.bufferHD.setDefaultViewbox( 260, 48 );
	}

	// .........................................................................
	setDAWCore( core ) {
		this._dawcore = core;
	}
	attached() {
		this._uiPatterns.attached();
	}
	clear() {
		Object.keys( this.data.patterns ).forEach( this._deletePattern, this );
		Object.keys( this.data.synths ).forEach( this._deleteSynth, this );
		Object.keys( this._buffers ).forEach( id => delete this._buffers[ id ] );
		this.svgForms.keys.empty();
		this.svgForms.drums.empty();
		this.svgForms.buffer.empty();
		this.svgForms.bufferHD.empty();
	}
	bufferLoaded( buffers ) {
		const pats = Object.entries( this._dawcore.get.patterns() ),
			bufToPat = pats.reduce( ( map, [ id, pat ] ) => {
				map[ pat.buffer ] = id;
				return map;
			}, {} );

		Object.entries( buffers ).forEach( ( [ idBuf, buf ] ) => {
			this._buffers[ idBuf ] = buf;
			this.svgForms.buffer.update( bufToPat[ idBuf ], buf.buffer );
			this.svgForms.bufferHD.update( bufToPat[ idBuf ], buf.buffer );
		} );
	}
	change( obj ) {
		this._synthsCrud( obj.synths );
		this._patternsCrud( obj.patterns );
		this._updateChannels( obj.channels );
		if ( obj.keys || obj.drums || obj.drumrows ) {
			Object.entries( this._dawcore.get.patterns() )
				.filter( ( [ id, pat ] ) => (
					( pat.type === "drums" && ( obj.drumrows || obj.drums?.[ pat.drums ] ) ) ||
					( pat.type === "keys" && obj.keys?.[ pat.keys ] )
				) )
				.forEach( kv => this._updatePatternContent( kv[ 0 ] ) );
		}
		if ( obj.patterns ) {
			this._uiPatterns.reorderPatterns( obj.patterns );
		}
		if ( "synthOpened" in obj ) {
			this._uiPatterns.selectSynth( obj.synthOpened );
		}
		if ( "patternDrumsOpened" in obj ) {
			this._uiPatterns.selectPattern( "drums", obj.patternDrumsOpened );
		}
		if ( "patternKeysOpened" in obj ) {
			this._uiPatterns.selectPattern( "keys", obj.patternKeysOpened );
		}
	}

	// .........................................................................
	_updatePatternContent( id ) {
		const get = this._dawcore.get,
			pat = get.pattern( id ),
			elPat = this._uiPatterns._getPattern( id );

		if ( elPat ) {
			const type = pat.type;

			if ( type === "keys" ) {
				this.svgForms.keys.update( id, get.keys( pat.keys ), pat.duration );
			} else if ( type === "drums" ) {
				this.svgForms.drums.update( id, get.drums( pat.drums ), get.drumrows(), pat.duration, get.stepsPerBeat() );
			} else if ( type === "buffer" ) {
				const buf = this._buffers[ pat.buffer ];

				if ( buf ) {
					this.svgForms.buffer.update( id, buf.buffer );
					this.svgForms.bufferHD.update( id, buf.buffer );
				}
			}
			if ( type !== "buffer" ) {
				this.svgForms[ type ].setSVGViewbox( elPat.querySelector( "svg" ), 0, pat.duration );
			}
		}
	}
	_updateChannels( chans ) {
		if ( chans ) {
			const chanMap = Object.freeze( Object.entries( chans )
					.reduce( ( map, [ id, syn ] ) => {
						if ( syn && "name" in syn ) {
							map[ id ] = true;
						}
						return map;
					}, {} ) );

			Object.entries( this._dawcore.get.synths() ).forEach( ( [ id, syn ] ) => {
				if ( syn.dest in chanMap ) {
					this._uiPatterns.changeSynth( id, "dest", syn.dest );
				}
			} );
			Object.entries( this._dawcore.get.patterns() ).forEach( ( [ id, pat ] ) => {
				if ( pat.dest in chanMap ) {
					this._uiPatterns.changePattern( id, "dest", pat.dest );
				}
			} );
		}
	}

	// .........................................................................
	_createSynth( id, obj ) {
		this.data.synths[ id ] = GSUtils.jsonCopy( obj );
		this._uiPatterns.addSynth( id );
		this._updateSynth( id, obj );
	}
	_updateSynth( id, obj ) {
		if ( "name" in obj ) {
			this.data.synths[ id ].name = obj.name;
			this._uiPatterns.changeSynth( id, "name", obj.name );
		}
		if ( "dest" in obj ) {
			this.data.synths[ id ].dest = obj.dest;
			this._uiPatterns.changeSynth( id, "dest", this._dawcore.get.channel( obj.dest ).name );
		}
	}
	_deleteSynth( id ) {
		delete this.data.synths[ id ];
		this._uiPatterns.deleteSynth( id );
	}

	// .........................................................................
	_createPattern( id, obj ) {
		const isBuf = obj.type === "buffer",
			SVG = this.svgForms[ isBuf ? "bufferHD" : obj.type ];

		this.data.patterns[ id ] = GSUtils.jsonCopy( obj );
		SVG.add( id );
		if ( isBuf ) {
			const buf = this._buffers[ obj.buffer ];

			this.svgForms.buffer.add( id );
			if ( buf ) {
				this.svgForms.buffer.update( id, buf.buffer );
				SVG.update( id, buf.buffer );
			}
		}
		this._uiPatterns.addPattern( id, obj );
		this._updatePattern( id, obj );
		this._uiPatterns.appendPatternSVG( id, SVG.createSVG( id ) );
	}
	_updatePattern( id, obj ) {
		const dat = this.data.patterns[ id ];

		Object.entries( obj ).forEach( ( [ prop, val ] ) => {
			dat[ prop ] = val;
			this._uiPatterns.changePattern( id, prop, val );
		} );
	}
	_deletePattern( id ) {
		const pat = this.data.patterns[ id ];

		delete this.data.patterns[ id ];
		this.svgForms[ pat.type ].delete( id );
		if ( pat.type === "buffer" ) {
			this.svgForms.bufferHD.delete( id );
		}
		this._uiPatterns.deletePattern( id );
	}
}

Object.freeze( GSPatterns );
