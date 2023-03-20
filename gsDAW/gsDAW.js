"use strict";

class GSDAW {
	#dawcore = new DAWCore();
	#libraries = new GSLibraries();
	#patterns = new GSPatterns();
	#midiControllersManager = new gswaMIDIControllersManager();
	#windows = null;
	rootElement = GSUI.$createElement( "gsui-daw", {
		version: "0.0.0",
		volume: this.#dawcore.$getAudioDestinationGain(),
		uirate: +localStorage.getItem( "uiRefreshRate" ) || "auto",
		samplerate: this.#dawcore.$env.$sampleRate,
		timelinenumbering: localStorage.getItem( "uiTimeNumbering" ) || "1",
		windowslowgraphics: !!+( localStorage.getItem( "gsuiWindows.lowGraphics" ) || "0" ),
	} );
	#elements = null;
	#keyboardFns = [
		[ true,  false, "o", () => this.rootElement.showOpenPopup() ],
		[ true,  false, "s", () => this.#dawcore.$saveComposition() ],
		[ true,  true,  "n", () => this.#oncmpClickNewLocal() ],
		[ true,  false, "z", () => this.#dawcore.$historyUndo() ],
		[ true,  false, "Z", () => this.#dawcore.$historyRedo() ],
		[ false, false, " ", () => this.#dawcore.$isPlaying() ? this.#dawcore.$stop() : this.#dawcore.$play() ],
	];
	#gsCmp = Object.seal( {
		synth: null,
		drums: null,
		mixer: null,
		slicer: null,
		piano: null,
		main: null,
	} );
	#gsCmpConstructor = Object.seal( {
		synth: GSSynth,
		drums: GSDrums,
		mixer: GSMixer,
		slicer: GSSlicer,
		piano: GSPianoroll,
		main: GSPatternroll,
	} );
	static #audioMIMEs = [ "audio/wav", "audio/wave", "audio/flac", "audio/webm", "audio/ogg", "audio/mpeg", "audio/mp3", "audio/mp4" ];
	static #dropExtensions = { gs: true, txt: true, json: true };

	constructor() {
		Object.seal( this );
		this.#initHTML();
		this.#initWindowsHTML();
		this.#initWindows();
		// this.#midiControllersManager.$setDAWCore( this.#dawcore );
		// this.#midiControllersManager.$setPianorollKeys( this.#gsCmp.piano.getUIKeys() );
		this.#initMIDIAccess();
		this.#initComponents();
		this.#initEvents();
		this.#authGetMe();
	}

	// .........................................................................
	#initHTML() {
		document.body.append(
			this.rootElement,
			GSUI.$getTemplate( "gsui-daw-window-main" ),
			GSUI.$getTemplate( "gsui-daw-window-piano" ),
			GSUI.$getTemplate( "gsui-daw-window-drums" ),
			GSUI.$getTemplate( "gsui-daw-window-synth" ),
			GSUI.$getTemplate( "gsui-daw-window-mixer" ),
			GSUI.$getTemplate( "gsui-daw-window-slicer" ),
		);
		this.#windows = this.rootElement.querySelector( "gsui-windows" );
		this.#dawcore.$setLoopRate( +localStorage.getItem( "uiRefreshRate" ) || 60 );
		this.#windows.$setLowGraphics( !!+( localStorage.getItem( "gsuiWindows.lowGraphics" ) || "0" ) );
		GSUI.$setAttribute( this.rootElement.clock, "mode", localStorage.getItem( "gsuiClock.display" ) || "second" );
		gsuiClock.numbering( localStorage.getItem( "uiTimeNumbering" ) || "1" );
		gsuiTimeline.numbering( localStorage.getItem( "uiTimeNumbering" ) || "1" );
		this.#elements = GSUI.$findElements( document.body, {
			drumsName: "[data-target=drums]",
			synthName: "[data-target=synth]",
			slicesName: "[data-target=slices]",
			pianorollName: "[data-target=pianoroll]",
			synthChannelBtn: "[data-target=synthChannel]",
			synthChannelBtnText: "[data-target=synthChannel] span",
		} );
	}
	#initComponents() {
		this.#patterns.setDAWCore( this.#dawcore );
		this.#libraries.setDAWCore( this.#dawcore );
		this.rootElement.querySelector( ".gsuiDAW-patterns" ).append( this.#patterns.rootElement );
		this.rootElement.querySelector( ".gsuiDAW-libraries" ).append( this.#libraries.rootElement );
		this.#elements.synthName.onclick = this.#onclickName.bind( this, "Rename synthesizer", "renameSynth", "synth" );
		this.#elements.drumsName.onclick = this.#onclickName.bind( this, "Rename pattern", "renamePattern", "drums" );
		this.#elements.slicesName.onclick = this.#onclickName.bind( this, "Rename pattern", "renamePattern", "slices" );
		this.#elements.pianorollName.onclick = this.#onclickName.bind( this, "Rename pattern", "renamePattern", "keys" );
		this.#elements.synthChannelBtn.onclick = this.#onclickSynthChannel.bind( this );
		this.#patterns.setLibraries( this.#libraries );
		this.#windows.$window( "main" ).$open();
		this.#windows.$window( "mixer" ).$open();
		gswaPeriodicWaves.$loadWaves( gswaPeriodicWavesList )
			.forEach( ( w, name ) => gsuiPeriodicWave.addWave( name, w.real, w.imag ) );
	}
	#initEvents() {
		window.onblur = () => this.#gsCmp.piano?.getUIKeys().midiReleaseAllKeys();
		window.onkeyup = this.#onkeyup.bind( this );
		window.onkeydown = this.#onkeydown.bind( this );
		window.onbeforeunload = this.#oncmpBeforeUnload.bind( this );
		this.rootElement.ondragover = () => false;
		this.rootElement.oncontextmenu = () => location.host === "localhost" ? undefined : false;
		this.rootElement.addEventListener( "wheel", GSDAW.#onwheel, { passive: false } );
		this.rootElement.addEventListener( "drop", this.#ondrop.bind( this ) );

		this.#dawcore.cb.focusOn = this.#oncontrolsFocus.bind( this );
		this.#dawcore.cb.currentTime = ( beat, focused ) => {
			const win = this.#controlsGetFocusedGrid( focused );

			GSUI.$setAttribute( this.rootElement, "currenttime", beat );
			if ( win ) {
				GSUI.$setAttribute( win, "currenttime", beat );
			}
		};
		this.#dawcore.cb.buffersLoaded = ( id, objBuf ) => this.#onpatternsBuffersLoaded( id, objBuf );
		this.#dawcore.cb.buffersDropped = files => this.#libraries.addLocalSamples( files );
		this.#dawcore.cb.compositionAdded = cmp => this.rootElement.addComposition( cmp );
		this.#dawcore.cb.compositionOpened = cmp => {
			GSUI.$setAttribute( this.rootElement, "currentcomposition", `${ cmp.options.saveMode }:${ cmp.id }` );
			this.#patterns.rootElement.expandSynth( cmp.synthOpened, true );
			this.#setTitle( cmp.name );
		};
		this.#dawcore.cb.compositionClosed = this.#oncmpClosed.bind( this );
		this.#dawcore.cb.compositionChanged = this.#oncmpChanged.bind( this );
		this.#dawcore.cb.compositionDeleted = cmp => this.rootElement.deleteComposition( cmp );
		this.#dawcore.cb.compositionLoading = ( cmp, loading ) => GSUI.$setAttribute( this.rootElement, "saving", loading );
		this.#dawcore.cb.compositionSavedStatus = ( cmp, saved ) => {
			GSUI.$setAttribute( this.rootElement, "saved", saved );
			this.#setTitle( cmp.name );
		};
		this.#dawcore.cb.compositionSavingPromise = this.#authSaveComposition.bind( this );
		this.#dawcore.cb.historyUndo = () => this.rootElement.undo();
		this.#dawcore.cb.historyRedo = () => this.rootElement.redo();
		this.#dawcore.cb.historyAddAction = act => this.rootElement.stackAction( act.icon, act.desc );
		this.#dawcore.cb.onstartdrum = rowId => this.#gsCmp.drums?.onstartdrum( rowId );
		this.#dawcore.cb.onstopdrumrow = rowId => this.#gsCmp.drums?.onstopdrumrow( rowId );
		this.#dawcore.cb.analyserFilled = data => this.rootElement.updateSpectrum( data );
		this.#dawcore.cb.channelAnalyserFilled = ( chanId, ldata, rdata ) => this.#gsCmp.mixer?.updateAudioData( chanId, ldata, rdata );
		this.#dawcore.cb.pause =
		this.#dawcore.cb.stop = () => GSUI.$setAttribute( this.rootElement, "playing", false );
		this.#dawcore.cb.play = () => GSUI.$setAttribute( this.rootElement, "playing", true );

		this.rootElement.onSubmitLogin = ( email, pass ) => {
			GSUI.$setAttribute( this.rootElement, "logging", true );
			GSUI.$setAttribute( this.rootElement, "errauth", false );
			return gsapiClient.login( email, pass )
				.then( me => {
					this.#authLoginThen( me );
					return gsapiClient.getUserCompositions( me.id );
				} )
				.then( cmps => {
					const opt = { saveMode: "cloud" };

					cmps.forEach( cmp => this.#dawcore.$addCompositionByJSObject( cmp.data, opt ) );
				} )
				.catch( res => {
					GSUI.$setAttribute( this.rootElement, "errauth", res.msg );
					throw res;
				} )
				.finally( () => GSUI.$setAttribute( this.rootElement, "logging", false ) );
		};
		this.rootElement.onSubmitOpen = ( url, file ) => {
			if ( url || file[ 0 ] ) {
				return ( url
					? this.#dawcore.$addCompositionByURL( url )
					: this.#dawcore.$addCompositionByBlob( file[ 0 ] )
				).then( cmp => this.#dawcore.$openComposition( "local", cmp.id ) );
			}
		};
		this.rootElement.onExportJSON = ( saveMode, id ) => this.#dawcore.$compositionExportJSON( saveMode, id );

		GSUI.$listenEvents( this.rootElement, {
			gsuiDAW: {
				switchCompositionLocation: d => {
					const [ saveMode, id ] = d.args;

					saveMode === "local"
						? this.#oncmpCloudDrop( saveMode, id )
						: this.#oncmpLocalDrop( saveMode, id );
				},
				settings: d => {
					const data = d.args[ 0 ];

					this.#dawcore.$setLoopRate( data.uiRate === "auto" ? 60 : data.uiRate );
					this.#dawcore.$setSampleRate( data.sampleRate );
					this.#windows.$setLowGraphics( data.windowsLowGraphics );
					gsuiClock.numbering( data.timelineNumbering );
					gsuiTimeline.numbering( data.timelineNumbering );
					localStorage.setItem( "uiRefreshRate", data.uiRate );
					localStorage.setItem( "gsuiWindows.lowGraphics", +data.windowsLowGraphics );
					localStorage.setItem( "uiTimeNumbering", data.timelineNumbering );
					GSUI.$setAttribute( this.rootElement, "uirate", data.uiRate );
					GSUI.$setAttribute( this.rootElement, "samplerate", data.sampleRate );
					GSUI.$setAttribute( this.rootElement, "timelinenumbering", data.timelineNumbering );
					GSUI.$setAttribute( this.rootElement, "windowslowgraphics", data.windowsLowGraphics );
				},
				changeDisplayClock( d ) {
					const display = d.args[ 0 ];

					localStorage.setItem( "gsuiClock.display", display );
				},
				export: () => {
					const dur = this.#dawcore.$getDuration() * 60 / this.#dawcore.$getBPM();
					const intervalId = setInterval( () => {
						GSUI.$setAttribute( this.rootElement, "exporting", this.#dawcore.$getCtx().currentTime / dur );
					}, 100 );

					this.#dawcore.$compositionExportWAV().then( obj => {
						clearInterval( intervalId );
						GSUI.$setAttribute( this.rootElement, "exporting", 1 );
						this.rootElement.readyToDownload( obj.url, obj.name );
					} );
				},
				abortExport: () => this.#dawcore.$compositionAbortWAV(),
				save: () => this.#dawcore.$saveComposition(),
				open: d => this.#oncmpClickOpen( ...d.args ),
				delete: d => this.#oncmpClickDelete( ...d.args ),
				tempo: d => {
					const o = d.args[ 0 ];

					this.#dawcore.$callAction( "changeTempo", o.bpm, o.timedivision );
				},
				logout: () => {
					GSUI.$setAttribute( this.rootElement, "logging", true );
					gsapiClient.logout()
						.finally( () => GSUI.$setAttribute( this.rootElement, "logging", false ) )
						.then( () => {
							GSUI.$setAttribute( this.rootElement, "logged", false );
							GSUI.$setAttribute( this.rootElement, "useravatar", false );
							GSUI.$setAttribute( this.rootElement, "username", false );
							this.#dawcore.$getCompositions( "cloud" )
								.forEach( cmp => this.#dawcore.$deleteComposition( "cloud", cmp.id ) );
							if ( !this.#dawcore.$getCmp() ) {
								this.#oncmpClickNewLocal();
							}
						} );
				},
				localNewCmp: () => this.#oncmpClickNewLocal(),
				cloudNewCmp: () => this.#oncmpClickNewCloud(),
				openWindow: d => this.#windows.$window( d.args[ 0 ] ).$open(),
				closeWindow: d => this.#windows.$window( d.args[ 0 ] ).$close(),
				focusSwitch: () => this.#dawcore.$focusSwitch(),
				volume: d => this.#dawcore.$destinationSetGain( d.args[ 0 ] ),
				rename: d => this.#dawcore.$callAction( "renameComposition", d.args[ 0 ] ),
				currentTimeLive: d => {
					const win = this.#controlsGetFocusedGrid();

					if ( win ) {
						GSUI.$setAttribute( win.timeline, "currenttime-preview", d.args[ 0 ] );
					}
				},
				currentTime: d => {
					const win = this.#controlsGetFocusedGrid();
					let tpreview;

					if ( win ) {
						tpreview = GSUI.$getAttribute( win.timeline, "currenttime-preview" );
						GSUI.$setAttribute( win.timeline, "currenttime-preview", null );
					}
					this.#dawcore.$setCurrentTime( +( tpreview || d.args[ 0 ] ) );
				},
				play: () => this.#dawcore.$togglePlay(),
				stop: () => {
					this.#dawcore.$stop();
					this.#libraries.stop();
					if ( this.#gsCmp.piano && document.activeElement === this.#gsCmp.piano.rootElement ) {
						this.#dawcore.$focusOn( "keys", "-f" );
					}
					if ( this.#gsCmp.drums && document.activeElement === this.#gsCmp.drums.rootElement ) {
						this.#dawcore.$focusOn( "drums", "-f" );
					}
					if ( this.#gsCmp.slicer && document.activeElement === this.#gsCmp.slicer.rootElement ) {
						this.#dawcore.$focusOn( "slices", "-f" );
					}
					if ( this.#gsCmp.main && document.activeElement === this.#gsCmp.main.rootElement ) {
						this.#dawcore.$focusOn( "composition", "-f" );
					}
				},
				reset: () => this.#dawcore.$resetAudioContext(),
				undo: () => this.#dawcore.$historyUndo(),
				redo: () => this.#dawcore.$historyRedo(),
				redoN: d => {
					let n = d.args[ 0 ];

					if ( n < 0 ) {
						while ( n++ < 0 ) {
							this.#dawcore.$historyUndo();
						}
					} else {
						while ( n-- > 0 ) {
							this.#dawcore.$historyRedo();
						}
					}
				},
			},
		} );
	}
	#initWindows() {
		this.#windows.onopen = this.#onopenWindow.bind( this );
		this.#windows.onclose = this.#oncloseWindow.bind( this );
		this.#initWindowsPos( "mixer",   20,  20, 266, 200, 460, 300, "mixer",      "mixer" );
		this.#initWindowsPos( "main",   500,  20, 380, 180, 600, 360, "music",      "composition" );
		this.#initWindowsPos( "synth",   20, 340, 340, 220, 460, 460, "oscillator", "synth" );
		this.#initWindowsPos( "piano",  500, 400, 380, 180, 600, 400, "keys",       "pianoroll" );
		this.#initWindowsPos( "drums",   70, 450, 380, 180, 600, 400, "drums",      "drums" );
		this.#initWindowsPos( "slicer", 160, 140, 306, 250, 420, 360, "slices",     "slicer" );
	}
	#initWindowsPos( winId, x, y, wmin, hmin, w, h, icon, title ) {
		const win = this.#windows.$window( winId );

		GSUI.$setAttribute( win, { x, y, w, h, wmin, hmin, icon, title } );
	}
	#initWindowsHTML() {
		document.querySelectorAll( "div[data-window]" ).forEach( winCnt => {
			const win = this.#windows.$createWindow( winCnt.dataset.window );
			const elWinCnt = win.querySelector( ".gsuiWindow-content" );
			const children = Array.from( winCnt.children );

			winCnt.remove();
			winCnt.classList.forEach( c => elWinCnt.classList.add( c ) );
			if ( children.length ) {
				const child0 = children[ 0 ];

				if ( child0.classList.contains( "gsuiDAW-winMenu" ) ) {
					children.shift();
					win.$headAppend( ...child0.children );
				}
			}
		} );
	}
	#onopenWindow( win ) {
		const id = win.dataset.id;
		const winCnt = new this.#gsCmpConstructor[ id ]();
		const cmpData = this.#dawcore.$getCmp();

		this.#gsCmp[ id ] = winCnt;
		winCnt.setDAWCore( this.#dawcore );
		win.$contentAppend( winCnt.rootElement );
		if ( id === "main" ) {
			winCnt.rootElement.onfocus = () => this.#dawcore.$focusOn( "composition" );
			winCnt.setSVGForms( this.#patterns.svgForms );
		} else if ( id === "piano" ) {
			winCnt.rootElement.onfocus = () => this.#dawcore.$focusOn( "keys" );
			winCnt.rootElement.octaves( 1, 7 );
		} else if ( id === "drums" ) {
			winCnt.rootElement.onfocus = () => this.#dawcore.$focusOn( "drums" );
			winCnt.setWaveforms( this.#patterns.svgForms.bufferHD );
		} else if ( id === "slicer" ) {
			winCnt.rootElement.onfocus = () => this.#dawcore.$focusOn( "slices" );
		}
		if ( cmpData ) {
			winCnt.change( cmpData );
		}
		this.rootElement.toggleWindow( id, true );
	}
	#oncloseWindow( win ) {
		switch ( win.dataset.id ) {
			case "piano": this.#dawcore.$callAction( "closePattern", "keys" ); break;
			case "drums": this.#dawcore.$callAction( "closePattern", "drums" ); break;
			case "slicer": this.#dawcore.$callAction( "closePattern", "slices" ); break;
		}
		this.rootElement.toggleWindow( win.dataset.id, false );
		this.#gsCmp[ win.dataset.id ].clear();
		this.#gsCmp[ win.dataset.id ] = null;
	}

	// .........................................................................
	getDAWCore() { return this.#dawcore; }
	newComposition() { this.#oncmpClickNewLocal(); }

	// .........................................................................
	#oncontrolsFocus( focStr ) {
		const beat = this.#dawcore.$getCurrentTime();
		const grid = this.#controlsGetFocusedGrid( focStr );
		const onCmp = focStr === "composition";

		GSUI.$setAttribute( this.rootElement, "focus", onCmp ? "up" : "down" );
		GSUI.$setAttribute( this.rootElement, "duration", this.#dawcore.$getFocusedDuration() );
		GSUI.$setAttribute( this.rootElement, "currenttime", beat );
		this.#gsCmp.piano?.rootElement.classList.toggle( "selected", focStr === "keys" );
		this.#gsCmp.drums?.rootElement.classList.toggle( "selected", focStr === "drums" );
		this.#gsCmp.slicer?.rootElement.classList.toggle( "selected", focStr === "slices" );
		this.#gsCmp.main?.rootElement.classList.toggle( "selected", onCmp );
		grid?.focus( { preventScroll: true } );
	}
	#controlsGetFocusedGrid( focStr = this.#dawcore.$getFocusedName() ) {
		switch ( focStr ) {
			default: return null;
			case "keys": return this.#gsCmp.piano?.rootElement;
			case "drums": return this.#gsCmp.drums?.rootElement;
			case "slices": return this.#gsCmp.slicer?.rootElement;
			case "composition": return this.#gsCmp.main?.rootElement;
		}
	}
	#onkeydown( e ) {
		if ( !this.#isKeyboardShortcuts( e ) && !e.ctrlKey && !e.altKey && !e.shiftKey ) {
			this.#pianorollKeyboardEvent( true, e );
		}
	}
	#onkeyup( e ) {
		this.#pianorollKeyboardEvent( false, e );
	}
	#pianorollKeyboardEvent( status, e ) {
		const uiKeys = this.#gsCmp.piano?.getUIKeys();

		if ( uiKeys ) {
			const midi = uiKeys.getMidiKeyFromKeyboard( e );

			if ( midi !== false ) {
				status
					? uiKeys.midiKeyDown( midi )
					: uiKeys.midiKeyUp( midi );
				return true;
			}
		}
	}
	#isKeyboardShortcuts( e ) {
		return this.#keyboardFns.some( ( [ ctrlOrAlt, alt, key, fn ] ) => {
			if ( ( key === e.key ) &&
				( !alt || e.altKey ) &&
				( ctrlOrAlt === ( e.ctrlKey || e.altKey ) )
			) {
				fn();
				e.preventDefault();
				return true;
			}
		} );
	}
	#oncmpClickNewLocal() {
		( !this.#dawcore.$compositionNeedSave()
			? this.#dawcore.$newComposition()
			: GSUI.$popup.confirm( "Warning", "Are you sure you want to discard unsaved works" )
				.then( b => b && this.#dawcore.$newComposition() )
		).then( cmp => cmp && this.#dawcore.$openComposition( "local", cmp.id ) );
	}
	#oncmpClickNewCloud() {
		if ( !gsapiClient.user.id ) {
			GSUI.$popup.alert( "Error",
				"You can not create a new composition in the <b>cloud</b><br/>without being connected" );
		} else {
			( !this.#dawcore.$compositionNeedSave()
				? this.#dawcore.$newComposition( { saveMode: "cloud" } )
				: GSUI.$popup.confirm( "Warning", "Are you sure you want to discard unsaved works" )
					.then( b => b && this.#dawcore.$newComposition( { saveMode: "cloud" } ) )
			).then( cmp => cmp && this.#dawcore.$openComposition( "cloud", cmp.id ) );
		}
	}
	#oncmpBeforeUnload() {
		if ( this.#dawcore.$compositionNeedSave() ) {
			return "Data unsaved";
		}
	}
	#oncmpClickOpen( saveMode, id ) {
		if ( this.#dawcore.$compositionNeedSave() ) {
			GSUI.$popup.confirm( "Warning",
				"Are you sure you want to discard unsaved works"
			).then( ok => ok && this.#dawcore.$openComposition( saveMode, id ) );
		} else {
			this.#dawcore.$openComposition( saveMode, id );
		}
	}
	#oncmpClickDelete( saveMode, id ) {
		const cmp = this.#dawcore.$getComposition( saveMode, id );

		GSUI.$popup.confirm( "Warning",
			`Are you sure you want to delete "${ cmp.name }" ? (no undo possible)`,
			"Delete"
		).then( b => {
			if ( b ) {
				( saveMode === "cloud"
					? gsapiClient.deleteComposition( id )
					: Promise.resolve() )
					.catch( err => {
						if ( err.code !== 404 ) {
							GSUI.$popup.alert( `Error ${ err.code }`,
								"An error happened while deleting " +
								"your composition&nbsp;:<br/>" +
								`<code>${ err.msg || err }</code>` );
							throw err;
						}
					} )
					.then( () => {
						if ( id === this.#dawcore.$getId() ) {
							this.#oncmpClickNewLocal();
						}
						this.#dawcore.$deleteComposition( saveMode, id );
					} );
			}
		} );
	}
	static #onwheel( e ) {
		if ( e.ctrlKey ) {
			e.preventDefault();
		}
	}
	#onclickName( title, action, area, e ) {
		const id = this.#dawcore.$getOpened( area );

		if ( id ) {
			GSUI.$popup.prompt( title, "", e.currentTarget.textContent, "Rename" )
				.then( name => this.#dawcore.$callAction( action, id, name ) );
		}
	}
	#onclickSynthChannel() {
		const id = this.#dawcore.$getOpened( "synth" );

		if ( id ) {
			gsuiChannels.openSelectChannelPopup( this.#dawcore.$getSynth( id ).dest )
				.then( chanId => chanId && this.#dawcore.$callAction( "redirectSynth", id, chanId ) );
		}
	}
	#ondrop( e ) {
		e.preventDefault();
		this.#dawcore.$dropFiles( GSUI.$getFilesDataTransfert( e.dataTransfer.items ) );
	}
	#oncmpDrop( saveMode, id ) {
		const to = saveMode === "local" ? "cloud" : "local";
		const cmpFrom = this.#dawcore.$getComposition( saveMode, id );
		const cmpTo = this.#dawcore.$getComposition( to, id );

		return !cmpTo
			? Promise.resolve( cmpFrom )
			: GSUI.$popup.confirm( "Warning",
				"Are you sure you want to overwrite " +
				`the <b>${ to }</b> composition <i>${ cmpTo.name || "Untitled" }</i>&nbsp;?` )
				.then( b => {
					if ( b ) {
						return cmpFrom;
					}
					throw undefined;
				} );
	}
	#oncmpLocalDrop( saveMode, id ) {
		this.#oncmpDrop( saveMode, id )
			.then( cmp => this.#dawcore.$addCompositionByJSObject( cmp, { saveMode: "local" } ) )
			.then( cmp => DAWCoreLocalStorage.$put( cmp.id, cmp ) );
	}
	#oncmpCloudDrop( saveMode, id ) {
		if ( gsapiClient.user.id ) {
			this.#oncmpDrop( saveMode, id )
				.then( cmp => this.#authSaveComposition( cmp ) )
				.then( cmp => this.#dawcore.$addCompositionByJSObject( cmp, { saveMode: "cloud" } ) );
		} else {
			GSUI.$popup.alert( "Error",
				"You need to be connected to your account before uploading your composition" );
		}
	}
	#authSaveComposition( cmp ) {
		return gsapiClient.saveComposition( cmp )
			.then( () => cmp, err => {
				GSUI.$popup.alert( `Error ${ err.code }`,
					"An error happened while saving your composition&nbsp;:<br/>" +
					`<code>${ err.msg || err }</code>`
				);
				throw err;
			} );
	}
	#authGetMe() {
		GSUI.$setAttribute( this.rootElement, "logging", true );
		return gsapiClient.getMe()
			.then( me => {
				this.#authLoginThen( me );
				return gsapiClient.getUserCompositions( me.id );
			} )
			.then( cmps => {
				const opt = { saveMode: "cloud" };

				cmps.forEach( cmp => this.#dawcore.$addCompositionByJSObject( cmp.data, opt ) );
			} )
			.catch( res => {
				if ( res.code !== 401 ) {
					throw res;
				}
			} )
			.finally( () => GSUI.$setAttribute( this.rootElement, "logging", false ) );
	}
	#authLoginThen( me ) {
		GSUI.$setAttribute( this.rootElement, "useravatar", me.avatar );
		GSUI.$setAttribute( this.rootElement, "username", me.username );
		GSUI.$setAttribute( this.rootElement, "logged", true );
		return me;
	}

	// .........................................................................
	#setTitle( cmpName ) {
		const name = cmpName || "GridSound";

		document.title = this.#dawcore.$compositionNeedSave() ? `*${ name }` : name;
	}

	// .........................................................................
	#oncmpClosed( cmp ) {
		this.#oncmpChanged( {
			bpm: cmp.bpm,
			name: cmp.name,
			duration: cmp.duration,
		}, {} );
		GSUI.$setAttribute( this.rootElement, "currentcomposition", false );
		GSUI.$setAttribute( this.#libraries.rootElement, "lib", "default" );
		this.#gsCmp.synth?.clear();
		this.#gsCmp.mixer?.clear();
		this.#gsCmp.drums?.clear();
		this.#gsCmp.piano?.clear();
		this.#gsCmp.main?.clear();
		this.#elements.drumsName.textContent =
		this.#elements.synthName.textContent =
		this.#elements.pianorollName.textContent = "";
		this.#patterns.clear();
		this.#libraries.clear();
	}
	#oncmpChanged( obj ) {
		console.log( "change", obj );
		this.#patterns.change( obj );
		this.#gsCmp.synth?.change( obj );
		this.#gsCmp.drums?.change( obj );
		this.#gsCmp.mixer?.change( obj );
		this.#gsCmp.slicer?.change( obj );
		this.#gsCmp.piano?.change( obj );
		this.#gsCmp.main?.change( obj );
		GSDAW.#cmpChangedFns.forEach( ( fn, prop ) => {
			if ( prop in obj ) {
				fn.call( this, obj );
			}
		} );
	}
	static #cmpChangedFns = new Map( [
		[ "channels", function( obj ) {
			const synOpenedChan = obj.channels[ this.#dawcore.$getSynth( this.#dawcore.$getOpened( "synth" ) ).dest ];

			if ( synOpenedChan && "name" in synOpenedChan ) {
				this.#elements.synthChannelBtnText.textContent = synOpenedChan.name;
			}
		} ],
		[ "synths", function( obj ) {
			const synOpened = obj.synths[ this.#dawcore.$getOpened( "synth" ) ];

			if ( synOpened ) {
				if ( "name" in synOpened ) {
					this.#elements.synthName.textContent = synOpened.name;
				}
				if ( "dest" in synOpened ) {
					this.#elements.synthChannelBtnText.textContent = this.#dawcore.$getChannel( synOpened.dest ).name;
				}
			}
		} ],
		[ "patterns", function( obj ) {
			Object.entries( obj.patterns ).forEach( kv => this.#onupdatePattern( ...kv ) );
		} ],
		[ "timedivision", function( obj ) {
			GSUI.$setAttribute( this.rootElement, "timedivision", obj.timedivision );
		} ],
		[ "bpm", function( { bpm } ) {
			GSUI.$setAttribute( this.rootElement, "bpm", bpm );
			this.rootElement.updateComposition( this.#dawcore.$getCmp() );
		} ],
		[ "name", function( { name } ) {
			this.#setTitle( name );
			this.rootElement.updateComposition( this.#dawcore.$getCmp() );
			GSUI.$setAttribute( this.rootElement, "name", name );
		} ],
		[ "duration", function( { duration } ) {
			if ( this.#dawcore.$getFocusedName() === "composition" ) {
				GSUI.$setAttribute( this.rootElement, "duration", duration );
			}
			this.rootElement.updateComposition( this.#dawcore.$getCmp() );
		} ],
		[ "patternSlicesOpened", function( obj ) {
			if ( obj.patternSlicesOpened ) {
				const pat = this.#dawcore.$getPattern( obj.patternSlicesOpened );

				this.#elements.slicesName.textContent = pat.name;
				this.#windows.$window( "slicer" ).$open();
				if ( this.#dawcore.$getFocusedName() === "slices" ) {
					GSUI.$setAttribute( this.rootElement, "duration", this.#dawcore.$getPattern( pat.source )?.duration ?? this.#dawcore.$getBeatsPerMeasure() );
				}
			} else {
				this.#elements.slicesName.textContent = "";
			}
		} ],
		[ "patternDrumsOpened", function( obj ) {
			if ( obj.patternDrumsOpened ) {
				const pat = this.#dawcore.$getPattern( obj.patternDrumsOpened );

				this.#elements.drumsName.textContent = pat.name;
				this.#windows.$window( "drums" ).$open();
				if ( this.#dawcore.$getFocusedName() === "drums" ) {
					GSUI.$setAttribute( this.rootElement, "duration", pat.duration );
				}
			} else {
				this.#elements.drumsName.textContent = "";
			}
		} ],
		[ "synthOpened", function( obj ) {
			if ( obj.synthOpened ) {
				const syn = this.#dawcore.$getSynth( obj.synthOpened );

				this.#elements.synthName.textContent = syn.name;
				this.#elements.synthChannelBtnText.textContent = this.#dawcore.$getChannel( this.#dawcore.$getSynth( obj.synthOpened ).dest ).name;
				this.#windows.$window( "synth" ).$open();
			} else {
				this.#elements.synthName.textContent = "";
				this.#elements.synthChannelBtnText.textContent = "";
			}
		} ],
		[ "patternKeysOpened", function( { patternKeysOpened } ) {
			if ( patternKeysOpened ) {
				const pat = this.#dawcore.$getPattern( patternKeysOpened );

				this.#elements.pianorollName.textContent = pat.name;
				if ( this.#dawcore.$getFocusedName() === "keys" ) {
					GSUI.$setAttribute( this.rootElement, "duration", pat.duration );
				}
				this.#windows.$window( "piano" ).$open();
			} else {
				this.#elements.pianorollName.textContent = "";
			}
		} ],
	] );
	#onupdatePattern( id, obj ) {
		if ( obj ) {
			if ( "duration" in obj ) {
				const foc = this.#dawcore.$getFocusedName();

				if ( foc !== "composition" && id === this.#dawcore.$getOpened( foc ) ) {
					GSUI.$setAttribute( this.rootElement, "duration", obj.duration );
				}
			}
			if ( "name" in obj ) {
				const name = obj.name;

				this.#gsCmp.main?.rootElement.getBlocks().forEach( blc => {
					if ( blc.dataset.pattern === id ) {
						blc.querySelector( ".gsuiPatternroll-block-name" ).textContent = name;
					}
				} );
				if ( id === this.#dawcore.$getOpened( "slices" ) ) {
					this.#elements.slicesName.textContent = name;
				}
				if ( id === this.#dawcore.$getOpened( "keys" ) ) {
					this.#elements.pianorollName.textContent = name;
				}
				if ( id === this.#dawcore.$getOpened( "drums" ) ) {
					this.#elements.drumsName.textContent = name;
				}
			}
		}
	}
	#onpatternsBuffersLoaded( id, objBuf ) {
		const patSli = this.#dawcore.$getPattern( this.#dawcore.$getOpened( "slices" ) );
		const sliBuf = patSli?.source && this.#dawcore.$getPattern( patSli.source ).buffer;

		if ( sliBuf === id ) {
			this.#gsCmp.slicer?.rootElement.setBuffer( objBuf.buffer );
		}
		this.#patterns.bufferLoaded( id, objBuf.buffer );
		this.#gsCmp.main?.rootElement.getBlocks().forEach( ( elBlc, blcId ) => {
			const blc = this.#dawcore.$getBlock( blcId );
			const pat = this.#dawcore.$getPattern( blc.pattern );

			if ( pat.type === "buffer" && pat.buffer === id ) {
				const bpm = pat.bufferBpm || this.#dawcore.$getBPM();

				GSUI.$setAttribute( elBlc, "data-missing", false );
				this.#patterns.svgForms.buffer.setSVGViewbox( elBlc._gsuiSVGform, blc.offset, blc.duration, bpm / 60 );
			}
		} );
	}
	#onMIDISuccess( midiAccess, sysex = false ) {
		if ( sysex === false ) {
			console.log( "GSLogs: Sysex is not allowed. Some features of your devices may be disabled." );
		}
		this.#midiControllersManager.$initMidiAccess( midiAccess );
	}
	#onMIDIFailure( msg, sysex = false ) {
		if ( sysex === true ) {
			navigator.requestMIDIAccess().then( onMIDISuccess, onMIDIFailure )
		} else {
			console.log( "GSLogs: Failed to get MIDI access - " + msg );
			console.log( "GSLogs: MIDI devices are disabled" );
		}
	}
	#initMIDIAccess() {
		navigator.requestMIDIAccess({ sysex: true })
				 .then( midiAccess => this.#onMIDISuccess( midiAccess, true ),
						msg => this.#onMIDIFailure( msg, true ));
	}
}

Object.freeze( GSDAW );
