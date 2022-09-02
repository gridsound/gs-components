"use strict";

class GSLibraries {
	rootElement = null
	#dawcore = null;

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
				stopSample: () => {
					this.#dawcore.$buffersStopBuffer();
					this.stop();
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
	addLocalSamples( files ) {
		if ( files.length > 0 ) {
			this.rootElement.getLibrary( "local" ).setLibrary( files.map( smp =>
				Array.isArray( smp )
					? [ smp[ 0 ], gsuiWaveform.getPointsFromBuffer( 40, 10, smp[ 1 ] ), smp[ 2 ] ]
					: smp
			) );
			GSUI.$setAttribute( this.rootElement, "lib", "local" );
		}
	}
	stop() {
		this.rootElement.getLibrary( "local" ).stopSample();
		this.rootElement.getLibrary( "default" ).stopSample();
	}
	clear() {
		this.stop();
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
				return this.#dawcore.$buffersLoadURLBuffer( id )
					.then( buf => {
						this.rootElement.getLibrary( "default" ).readySample( id );
						return buf;
					} );
		}
	}
	#playSample( lib, id ) {
		const buf = this.#dawcore.$buffersPlayBuffer( id );

		this.rootElement.getLibrary( lib ).playSample( id, buf.duration );
	}
}

Object.freeze( GSLibraries );
