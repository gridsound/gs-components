"use strict";

class GSLibraries {
	rootElement = null
	#dawcore = null;
	#absn = null;
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
	addLocalSamples( arr ) {
		if ( arr.length > 0 ) {
			arr.forEach( smp => {
				if ( Array.isArray( smp ) ) {
					this.#buffers.local.set( smp[ 0 ], Object.seal( { buffer: smp[ 1 ] } ) );
				}
			} );
			this.rootElement.getLibrary( "local" ).setLibrary( arr.map( smp =>
				Array.isArray( smp )
					? [ smp[ 0 ], smp[ 2 ], smp[ 3 ] ]
					: smp
			) );
			GSUI.$setAttribute( this.rootElement, "lib", "local" );
		}
	}
	getSample( lib, idStr ) {
		const [ id, name ] = idStr.split( ":" );
		const buf = this.#buffers[ lib ].get( id );

		return buf
			? Promise.resolve( buf.buffer )
			: this.#loadSample( lib, id );
	}
	stop() {
		this.#absn?.stop();
		this.rootElement.getLibrary( "local" ).stopSample();
		this.rootElement.getLibrary( "default" ).stopSample();
	}
	clear() {
		this.stop();
		this.#buffers.default.clear();
		this.#buffers.local.clear();
		this.rootElement.getLibrary( "local" ).clear();
	}

	// .........................................................................
	#loadSample( lib, id ) {
		switch ( lib ) {
			case "local":
				this.rootElement.getLibrary( "local" ).readySample( id );
				return Promise.resolve();
			case "default":
				this.rootElement.getLibrary( "default" ).loadSample( id );
				return fetch( `/🥁/${ id }.wav` )
					.then( res => res.arrayBuffer() )
					.then( arr => this.#dawcore.$getCtx().decodeAudioData( arr ) )
					.then( buffer => {
						this.#buffers.default.set( id, Object.seal( { buffer } ) );
						this.rootElement.getLibrary( "default" ).readySample( id );
						return buffer;
					} );
		}
	}
	#playSample( lib, id ) {
		const obj = this.#buffers[ lib ].get( id );
		const ctx = this.#dawcore.$getCtx();
		const absn = ctx.createBufferSource();

		this.#absn?.stop();
		this.#absn = absn;
		absn.buffer = obj.buffer;
		absn.connect( this.#dawcore.$getAudioDestination() );
		absn.start();
		this.rootElement.getLibrary( lib ).playSample( id, obj.buffer.duration );
	}
}

Object.freeze( GSLibraries );
