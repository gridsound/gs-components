"use strict";

class GSLibraries {
	rootElement = null
	#dawcore = null;
	#buffers = {
		default: new Map(),
		local: new Map(),
	};

	constructor() {
		this.rootElement = GSUI.$createElement( "gsui-libraries" );
		GSUI.$setAttribute( this.rootElement.getLibrary( "local" ), "name", "local" );
		GSUI.$setAttribute( this.rootElement.getLibrary( "default" ), "name", "default" );
		GSUI.$listenEvents( this.rootElement, {
			gsuiLibrary: {
				loadSample: ( d, tar ) => {
					const lib = GSUI.$getAttribute( tar, "name" );

					this.#loadSample( lib, d.args[ 0 ] )
						.then( () => this.#playSample( lib, d.args[ 0 ] ) );
				},
				playSample: ( d, tar ) => {
					this.#playSample( GSUI.$getAttribute( tar, "name" ), d.args[ 0 ] );
				},
			},
		} );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	loadDefaultLibrary() {
		return GSUI.$loadJSFile( "/assets/gsuiLibrarySamples-v1.js" ).then( () => {
			this.rootElement.getLibrary( "default" ).setLibrary( gsuiLibrarySamples );
		} );
	}
	getSample( lib, id ) {
		const buf = this.#buffers[ lib ].get( id );

		return buf
			? Promise.resolve( buf.buffer )
			: this.#loadSample( lib, id );
	}
	clear() {
	}

	// .........................................................................
	#loadSample( lib, id ) {
		this.rootElement.getLibrary( lib ).loadSample( id );
		return fetch( `/🥁/${ id }.wav` )
			.then( res => res.arrayBuffer() )
			.then( arr => this.#dawcore.$getCtx().decodeAudioData( arr ) )
			.then( buffer => {
				this.#buffers.default.set( id, Object.seal( { buffer, absn: null } ) );
				this.rootElement.getLibrary( lib ).readySample( id );
				return buffer;
			} );
	}
	#playSample( lib, id ) {
		const obj = this.#buffers[ lib ].get( id );
		const ctx = this.#dawcore.$getCtx();
		const absn = ctx.createBufferSource();

		obj.absn?.stop();
		obj.absn = absn;
		absn.buffer = obj.buffer;
		absn.connect( this.#dawcore.$getAudioDestination() );
		absn.start();
		this.rootElement.getLibrary( lib ).playSample( id, obj.buffer.duration );
	}
}

Object.freeze( GSLibraries );
