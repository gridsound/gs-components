"use strict";

class GSPatternroll {
	#dawcore = null
	#svgForms = null
	rootElement = GSUI.createElement( "gsui-patternroll" )
	timeline = this.rootElement.timeline
	#dataTracks = new DAWCore.controllers.tracks( {
		dataCallbacks: {
			addTrack: id => this.rootElement.addTrack( id ),
			removeTrack: id => this.rootElement.removeTrack( id ),
			toggleTrack: ( id, b ) => this.rootElement.toggleTrack( id, b ),
			renameTrack: ( id, s ) => this.rootElement.renameTrack( id, s ),
			reorderTrack: ( id, n ) => this.rootElement.reorderTrack( id, n ),
		}
	} )
	#dataBlocks = new DAWCore.controllers.blocks( {
		dataCallbacks: {
			addBlock: ( id, blc ) => {
				const pat = this.#dawcore.get.pattern( blc.pattern ),
					dataReady = pat.type === "buffer"
						? !!this.#dawcore.get.audioBuffer( pat.buffer )
						: true;

				this.rootElement.addBlock( id, blc, { dataReady } );
			},
			removeBlock: id => this.rootElement.removeBlock( id ),
			changeBlockProp: ( id, prop, val ) => this.rootElement.changeBlockProp( id, prop, val ),
			updateBlockViewBox: ( id, blc ) => this.rootElement.updateBlockViewBox( id, blc ),
		},
	} )

	constructor() {
		Object.seal( this );

		this.rootElement.setData( this.#dataBlocks.data );
		this.rootElement.setCallbacks( {
			onchange: this.#onchange.bind( this ),
			onaddBlock: this.#onaddBlock.bind( this ),
			oneditBlock: this.#oneditBlock.bind( this ),
		} );
		this.rootElement.addEventListener( "gsuiEvents", this.#ongsuiEvents.bind( this ) );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	setSVGForms( svgForms ) {
		this.#svgForms = svgForms;
	}
	change( obj ) {
		this.#dataTracks.change( obj );
		this.#dataBlocks.change( obj );
		if ( "loopA" in obj || "loopB" in obj ) {
			this.rootElement.loop(
				this.#dawcore.get.loopA(),
				this.#dawcore.get.loopB() );
		}
		if ( "beatsPerMeasure" in obj || "stepsPerBeat" in obj ) {
			this.rootElement.timeDivision(
				this.#dawcore.get.beatsPerMeasure(),
				this.#dawcore.get.stepsPerBeat() );
		}
		if ( "patterns" in obj ) {
			Object.entries( obj.patterns ).forEach( ( [ id, pat ] ) => {
				if ( pat && "bufferBpm" in pat ) {
					this.#updatePattern( id );
				}
			} );
		}
	}
	clear() {
		this.#dataBlocks.clear();
		this.#dataTracks.clear();
	}

	// .........................................................................
	#ongsuiEvents( e ) {
		const d = e.detail;

		switch ( d.component ) {
			case "gsuiTracklist":
				this.#dawcore.callAction( d.eventName, ...d.args );
				break;
			case "gsuiTimeline":
				switch ( d.eventName ) {
					case "changeLoop":
						this.#dawcore.callAction( "changeLoop", ...d.args );
						break;
					case "changeCurrentTime":
						this.#dawcore.composition.setCurrentTime( d.args[ 0 ] );
						break;
				}
				break;
		}
		e.stopPropagation();
	}

	// .........................................................................
	#updatePattern( id ) {
		this.rootElement.getBlocks().forEach( blc => {
			if ( blc.dataset.pattern === id ) {
				this.rootElement.updateBlockViewBox( blc.dataset.id, this.#dataBlocks.data[ blc.dataset.id ] );
			}
		} );
	}
	#onchange( obj, ...args ) {
		switch ( obj ) { // tmp
			case "add": this.#dawcore.callAction( "addBlock", ...args ); break;
			case "move": this.#dawcore.callAction( "moveBlocks", ...args ); break;
			case "cropEnd": this.#dawcore.callAction( "cropEndBlocks", ...args ); break;
			case "cropStart": this.#dawcore.callAction( "cropStartBlocks", ...args ); break;
			case "duplicate": this.#dawcore.callAction( "duplicateSelectedBlocks", ...args ); break;
			case "deletion": this.#dawcore.callAction( "removeBlocks", ...args ); break;
			case "selection": this.#dawcore.callAction( "selectBlocks", ...args ); break;
			case "unselection": this.#dawcore.callAction( "unselectAllBlocks", ...args ); break;
			case "unselectionOne": this.#dawcore.callAction( "unselectBlock", ...args ); break;
		}
	}
	#oneditBlock( id, obj, blc ) {
		if ( blc._gsuiSVGform ) {
			const pat = this.#dawcore.get.pattern( obj.pattern ),
				bpm = pat.bufferBpm || this.#dawcore.get.bpm();

			this.#svgForms[ pat.type ].setSVGViewbox( blc._gsuiSVGform, obj.offset, obj.duration, bpm / 60 );
		}
	}
	#onaddBlock( id, obj, blc ) {
		const pat = this.#dawcore.get.pattern( obj.pattern ),
			SVGs = this.#svgForms[ pat.type ],
			svg = SVGs.createSVG( obj.pattern );

		blc._gsuiSVGform = svg;
		blc.children[ 3 ].append( svg );
		SVGs.setSVGViewbox( svg, obj.offset, obj.duration, this.#dawcore.get.bpm() / 60 );
		blc.ondblclick = () => this.#dawcore.callAction( "openPattern", obj.pattern );
		blc.querySelector( ".gsuiPatternroll-block-name" ).textContent = pat.name;
	}
}

Object.freeze( GSPatternroll );
