"use strict";

class GSLibrary {
	rootElement = null
	#dawcore = null;
	#buffers = new Map();

	constructor() {
		this.rootElement = GSUI.$createElement( "gsui-library" );
		GSUI.$listenEvents( this.rootElement, {
			gsuiLibrary: {
				loadSample: d => this.#loadSample( d.args[ 0 ] ),
				playSample: d => this.#playSample( d.args[ 0 ] ),
			},
		} );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	loadSamples() {
		return GSUI.$loadJSFile( "/assets/gsuiLibrarySamples-v1.js" ).then( () => {
			this.rootElement.setLibrary( gsuiLibrarySamples );
		} );
	}
	clear() {
	}

	// .........................................................................
	#loadSample( id ) {
		this.rootElement.loadSample( id );
		fetch( `/samples/${ id }.wav` )
			.then( res => res.arrayBuffer() )
			.then( arr => this.#dawcore.$getCtx().decodeAudioData( arr ) )
			.then( buffer => {
				this.#buffers.set( id, Object.seal( { buffer, absn: null } ) );
				this.rootElement.readySample( id );
				this.#playSample( id );
			} );
	}
	#playSample( id ) {
		const obj = this.#buffers.get( id );
		const ctx = this.#dawcore.$getCtx();
		const absn = ctx.createBufferSource();

		obj.absn = absn;
		absn.buffer = obj.buffer;
		absn.connect( this.#dawcore.$getAudioDestination() );
		absn.start();
		this.rootElement.playSample( id, obj.buffer.duration );
	}
}

Object.freeze( GSLibrary );
