"use strict";

class GSPatternroll {
	#dawcore = null;
	rootElement = GSUcreateElement( "gsui-patternroll" );
	timeline = this.rootElement.timeline;
	#dataTracks = new DAWCoreControllerTracks( {
		$addTrack: id => this.rootElement.$addTrack( id ),
		$removeTrack: id => this.rootElement.$removeTrack( id ),
		$toggleTrack: ( id, b ) => this.rootElement.$toggleTrack( id, b ),
		$renameTrack: ( id, s ) => this.rootElement.$renameTrack( id, s ),
		$reorderTrack: ( id, n ) => this.rootElement.$reorderTrack( id, n ),
	} );
	#dataBlocks = new DAWCoreControllerBlocks( {
		$changeDuration: dur => this.rootElement.$changeDuration( dur ),
		$addBlock: ( id, blc ) => {
			const pat = this.#dawcore.$getPattern( blc.pattern );
			const dataReady = pat.type === "buffer"
				? !!this.#dawcore.$getAudioBuffer( pat.buffer )
				: true;

			this.rootElement.$addBlock( id, blc, { dataReady } );
		},
		$removeBlock: id => this.rootElement.$removeBlock( id ),
		$changeBlockProp: ( id, prop, val ) => this.rootElement.$changeBlockProp( id, prop, val ),
		$updateBlockViewBox: ( id, blc ) => this.rootElement.$updateBlockViewBox( id, blc ),
	} );
	#tracksAction = {
		renameTrack: DAWCoreActions_renameTrack,
		toggleTrack: DAWCoreActions_toggleTrack,
		toggleSoloTrack: DAWCoreActions_toggleSoloTrack,
	};
	#pianorollActions = {
		add: DAWCoreActions_addBlock,
		move: DAWCoreActions_moveBlocks,
		cropEnd: DAWCoreActions_cropEndBlocks,
		cropStart: DAWCoreActions_cropStartBlocks,
		duplicate: DAWCoreActions_cloneSelectedBlocks,
		deletion: DAWCoreActions_removeBlocks,
		selection: DAWCoreActions_selectBlocks,
		unselection: DAWCoreActions_unselectAllBlocks,
		unselectionOne: DAWCoreActions_unselectBlock,
	};

	constructor() {
		Object.seal( this );

		this.rootElement.$setData( this.#dataBlocks.$data );
		this.rootElement.$setCallbacks( {
			$onchange: this.#onchange.bind( this ),
			$onaddBlock: this.#onaddBlock.bind( this ),
			$oneditBlock: this.#oneditBlock.bind( this ),
		} );
		this.rootElement.addEventListener( "gsuiEvents", this.#ongsuiEvents.bind( this ) );
	}

	// .........................................................................
	setDAWCore( core ) {
		this.#dawcore = core;
	}
	change( obj ) {
		this.#dataTracks.$change( obj );
		this.#dataBlocks.$change( obj );
		if ( "loopA" in obj || "loopB" in obj ) {
			this.rootElement.$loop(
				this.#dawcore.$getLoopA(),
				this.#dawcore.$getLoopB() );
		}
		if ( "timedivision" in obj ) {
			this.rootElement.$timedivision( obj.timedivision );
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
		this.#dataBlocks.$clear();
		this.#dataTracks.$clear();
	}

	// .........................................................................
	#ongsuiEvents( e ) {
		const d = e.detail;

		switch ( d.component ) {
			case "gsuiTracklist":
				this.#dawcore.$callAction( this.#tracksAction[ d.eventName ], ...d.args );
				break;
			case "gsuiTimeline":
				switch ( d.eventName ) {
					case "changeLoop":
						this.#dawcore.$callAction( DAWCoreActions_changeLoop, ...d.args );
						break;
					case "changeCurrentTime":
						this.#dawcore.$compositionSetCurrentTime( d.args[ 0 ] );
						break;
				}
				break;
		}
		e.stopPropagation();
	}

	// .........................................................................
	#updatePattern( id ) {
		this.rootElement.$getBlocks().forEach( blc => {
			if ( blc.dataset.pattern === id ) {
				this.rootElement.$updateBlockViewBox( blc.dataset.id, this.#dataBlocks.$data[ blc.dataset.id ] );
			}
		} );
	}
	#onchange( obj, ...args ) {
		this.#dawcore.$callAction( this.#pianorollActions[ obj ], ...args );
	}
	#oneditBlock( id, obj, blc ) {
		if ( blc._gsuiSVGform ) {
			const pat = this.#dawcore.$getPattern( obj.pattern );
			const bpm = pat.bufferBpm || this.#dawcore.$getBPM();

			gsuiSVGPatterns.$setSVGViewbox( pat.type, blc._gsuiSVGform, obj.offset, obj.duration, bpm / 60 );
		}
	}
	#onaddBlock( id, obj, blc ) {
		const pat = this.#dawcore.$getPattern( obj.pattern );
		const svg = gsuiSVGPatterns.$createSVG( pat.type, obj.pattern );

		blc._gsuiSVGform = svg;
		blc.children[ 3 ].append( svg );
		gsuiSVGPatterns.$setSVGViewbox( pat.type, svg, obj.offset, obj.duration, this.#dawcore.$getBPS() );
		blc.ondblclick = () => this.#dawcore.$callAction( DAWCoreActions_openPattern, obj.pattern );
		blc.querySelector( ".gsuiPatternroll-block-name" ).textContent = pat.name;
	}
}

Object.freeze( GSPatternroll );
