"use strict";

class GSLibrary {
	rootElement = null
	#dawcore = null;

	constructor() {
		this.rootElement = GSUI.$createElement( "gsui-library" );
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
}

Object.freeze( GSLibrary );
