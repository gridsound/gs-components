"use strict";

class GSPatternroll {
	constructor() {
		const uiPatternroll = new gsuiPatternroll( {
				onchange: this._onchange.bind( this ),
				onaddBlock: this._onaddBlock.bind( this ),
				oneditBlock: this._oneditBlock.bind( this ),
				onchangeLoop: this._onchangeLoop.bind( this ),
				onchangeCurrentTime: t => this._dawcore.composition.setCurrentTime( t ),
			} ),
			dataBlocks = null;
			// dataBlocks = new DAWCore.controllers.blocks( {
			// 	dataCallbacks: {
			// 		xxxxxx: () => {},
			// 	},
			// } );

		this.rootElement = uiPatternroll.rootElement;
		this._uiRoll = uiPatternroll;
		this._dataBlocks = dataBlocks;
		this._dawcore =
		this._svgForms = null;
		Object.seal( this );

		this.rootElement.addEventListener( "gsuiEvents", e => {
			const d = e.detail,
				a = d.args,
				dc = this._dawcore;

			switch ( d.component ) {
				case "gsuiXxxxxxx":
					switch ( d.eventName ) {
						case "xxxxxx": dc.callAction( "xxxxx" ); break;
					}
					break;
			}
			e.stopPropagation();
		} );
	}

	// .........................................................................
	setDAWCore( core ) {
		this._dawcore = core;
	}
	setSVGForms( svgForms ) {
		this._svgForms = svgForms;
	}
	change( obj ) {
		// this._dataBlocks.change( obj );
		GSUtils.diffAssign( this._uiRoll.data.tracks, obj.tracks );
		GSUtils.diffAssign( this._uiRoll.data.blocks, obj.blocks );
		if ( "loopA" in obj || "loopB" in obj ) {
			this._uiRoll.loop(
				this._dawcore.get.loopA(),
				this._dawcore.get.loopB() );
		}
		if ( "beatsPerMeasure" in obj || "stepsPerBeat" in obj ) {
			this._uiRoll.timeSignature(
				this._dawcore.get.beatsPerMeasure(),
				this._dawcore.get.stepsPerBeat() );
		}
	}
	clear() {
		this._dataBlocks.clear();
	}

	// .........................................................................
	attached() {
		this._uiRoll.attached();
	}
	resized() {
		this._uiRoll.resized();
	}
	setFontSize( fs ) {
		this._uiRoll.setFontSize( fs );
	}
	setPxPerBeat( ppb ) {
		this._uiRoll.setPxPerBeat( ppb );
	}
	getBlocks() {
		return this._uiRoll.getBlocks();
	}

	// .........................................................................
	_onchange( obj, ...args ) {
		switch ( obj ) { // tmp
			case "move": this._dawcore.callAction( "moveBlocks", ...args ); break;
			case "cropEnd": this._dawcore.callAction( "cropEndBlocks", ...args ); break;
			case "cropStart": this._dawcore.callAction( "cropStartBlocks", ...args ); break;
			case "duplicate": this._dawcore.callAction( "duplicateSelectedBlocks", ...args ); break;
			case "deletion": this._dawcore.callAction( "removeBlocks", ...args ); break;
			case "selection": this._dawcore.callAction( "selectBlocks", ...args ); break;
			case "unselection": this._dawcore.callAction( "unselectBlocks", ...args ); break;
			default: {
				const dur = this.getBlocks().size && this._uiRoll.getDuration();

				if ( dur !== this._dawcore.get.duration() ) {
					obj.duration = dur;
				}
				this._dawcore.callAction( "changeTracksAndBlocks", obj );
			} break;
		}
	}
	_onchangeLoop( looping, a, b ) {
		this._dawcore.callAction( "changeLoop", looping && a, looping && b );
	}
	_oneditBlock( _id, obj, blc ) {
		if ( blc._gsuiSVGform ) {
			const pat = this._dawcore.get.pattern( obj.pattern );

			this._svgForms[ pat.type ].setSVGViewbox( blc._gsuiSVGform, obj.offset, obj.duration, this._dawcore.get.bpm() / 60 );
		}
	}
	_onaddBlock( id, obj, blc ) {
		const pat = this._dawcore.get.pattern( obj.pattern ),
			SVGs = this._svgForms[ pat.type ],
			svg = SVGs.createSVG( obj.pattern );

		blc._gsuiSVGform = svg;
		blc.children[ 3 ].append( svg );
		SVGs.setSVGViewbox( svg, obj.offset, obj.duration, this._dawcore.get.bpm() / 60 );
		blc.ondblclick = () => this._dawcore.callAction( "openPattern", obj.pattern );
		blc.querySelector( ".gsuiPatternroll-block-name" ).textContent = pat.name;
	}
}

Object.freeze( GSPatternroll );
