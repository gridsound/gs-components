"use strict";

class GSMixer {
	#dawcore = null
	onselectChan = null
	rootElement = GSUI.createElement( "gsui-channels" )
	#ctrlMixer = new DAWCore.controllers.mixer( {
		dataCallbacks: {
			addChannel: ( id, chan ) => this.rootElement.addChannel( id, chan ),
			removeChannel: id => this.rootElement.removeChannel( id ),
			renameChannel: ( id, name ) => this.rootElement.renameChannel( id, name ),
			redirectChannel: ( id, dest ) => this.rootElement.redirectChannel( id, dest ),
			toggleChannel: ( id, b ) => this.rootElement.toggleChannel( id, b ),
			reorderChannel: ( id, n ) => this.rootElement.reorderChannel( id, n ),
			changePanChannel: ( id, val ) => this.rootElement.changePanChannel( id, val ),
			changeGainChannel: ( id, val ) => this.rootElement.changeGainChannel( id, val ),
		},
	} )

	constructor() {
		Object.seal( this );

		this.rootElement.oninput = this.#oninput.bind( this );
		this.rootElement.onchange = this.#onchange.bind( this );
		this.rootElement.onselectChan = this.#onselectChan.bind( this );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	clear() {
		this.#ctrlMixer.clear();
	}
	change( obj ) {
		this.#ctrlMixer.change( obj );
		if ( obj.channels ) {
			this.rootElement.reorderChannels( obj.channels );
		}
	}
	updateAudioData( chanId, ldata, rdata ) {
		this.rootElement.updateAudioData( chanId, ldata, rdata );
	}
	selectChannel( id ) {
		this.rootElement.selectChannel( id );
	}
	getSelectedChannelId() {
		return this.rootElement.getSelectedChannelId();
	}

	// .........................................................................
	#oninput( id, prop, val ) {
		this.#dawcore.liveChangeChannel( id, prop, val );
	}
	#onchange( act, ...args ) {
		this.#dawcore.callAction( act, ...args );
	}
	#onselectChan( id ) {
		if ( this.onselectChan ) {
			this.onselectChan( id );
		}
	}
}

Object.freeze( GSMixer );
