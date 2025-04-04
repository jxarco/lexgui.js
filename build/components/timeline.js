import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'Timeline' );

/**
 * @class Session
 * @description Store info about timeline session
 */

class Session {

    constructor() {

        this.start_time = -0.01;
        this.left_margin = 0;
        // this.current_time = 0;
        // this.last_time = 0;
        // this.seconds_to_pixels = 50;
        this.scroll_y = 0;
        // this.offset_y = 0;
        // this.selection = null;
    }
};

/**
 * @class Timeline
 * @description Agnostic timeline, do not impose any timeline content. Renders to a canvas
 */

class Timeline {

    /**
     * @param {string} name = string unique id
     * @param {object} options = {animationClip, selectedItems, position = [0,0], width, height, canvas, trackHeight, skipLock, skipVisibility}
     */
    constructor( name, options = {} ) {

        this.name = name ?? '';
        this.currentTime = 0;
        this.opacity = options.opacity || 1;
        this.topMargin = 40;
        this.clickDiscardTimeout = 200; // ms
        this.lastMouse = [];
        this.lastKeyFramesSelected = [];
        this.tracksDrawn = [];
        this.trackStateUndo = [];
        this.trackStateRedo = [];
        this.trackStateSaveEnabler = true; // used in saveState
        this.trackStateMaxSteps = 100; // used in saveState
        this.clipboard = null;
        this.grabbing = false;
        this.grabTime = 0;
        this.grabbingTimeBar = false;
        this.grabbingScroll = false;
        this.movingKeys = false;
        this.timeBeforeMove = 0;

        this.onBeforeCreateTopBar = options.onBeforeCreateTopBar;
        this.onAfterCreateTopBar = options.onAfterCreateTopBar;
        this.onChangePlayMode = options.onChangePlayMode;
        this.onShowConfiguration = options.onShowConfiguration;
        this.onBeforeDrawContent = options.onBeforeDrawContent;
        
        this.playing = false;
        this.loop = options.loop ?? true;

        this.session = new Session();

        this.canvas = options.canvas ?? document.createElement('canvas');

        this.duration = 1;
        this.speed = 1;
        this.size = [ options.width ?? 400, options.height ?? 100 ];
        
        this.currentScroll = 0; //in percentage
        this.currentScrollInPixels = 0; //in pixels
       
        this.secondsToPixels = Math.max( 0.00001, this.size[0]/1 );
        this.pixelsToSeconds = 1 / this.secondsToPixels;
        this.selectedItems = options.selectedItems ?? [];
        this.animationClip = options.animationClip ?? null;
        this.trackHeight = options.trackHeight ?? 25;
        this.timeSeparators = [0.01, 0.1, 0.5, 1, 5];

        this.boxSelection = false;
        this.boxSelectionStart = [0,0];
        this.boxSelectionEnd = [0,0];

        this.active = true;
        this.skipVisibility = options.skipVisibility ?? false;
        this.skipLock = options.skipLock ?? false;
        this.disableNewTracks = options.disableNewTracks ?? false;

        this.optimizeThreshold = 0.01;

        this.root = new LX.Area({className : 'lextimeline'});
        
        this.header_offset = 48;
        
        let width = options.width ? options.width : null;
        let height = options.height ? options.height - this.header_offset : null;

        let area = new LX.Area( {id: "bottom-timeline-area", width: width || "calc(100% - 7px)", height: height || "100%"});
        area.split({ type: "horizontal", sizes: ["15%", "85%"] });
        area.splitBar.style.zIndex = 1; // for some reason this is needed here
        this.content_area = area;
        let [ left, right ] = area.sections;
        
        right.root.appendChild( this.canvas );
        this.canvasArea = right;
        this.canvasArea.root.classList.add("lextimelinearea");
        this.updateHeader();
        this.updateLeftPanel( left );
        this.root.root.appendChild( area.root );

        if(!options.canvas && this.name != '') {
            this.root.root.id = this.name;
            this.canvas.id = this.name + '-canvas';
        }

        // Process mouse events
        this.canvas.addEventListener("mousedown", this.processMouse.bind(this));
        this.canvas.addEventListener("mouseup", this.processMouse.bind(this));
        this.canvas.addEventListener("mousemove", this.processMouse.bind(this));
        this.canvas.addEventListener("wheel", this.processMouse.bind(this));
        this.canvas.addEventListener("dblclick", this.processMouse.bind(this));
        this.canvas.addEventListener("contextmenu", this.processMouse.bind(this));

        this.canvas.tabIndex = 1;
        // Process keys events
        this.canvasArea.root.addEventListener("keydown", this.processKeys.bind(this));

        right.onresize = bounding => {
            if(!(bounding.width && bounding.height)) 
                return;
            this.resizeCanvas( [ bounding.width, bounding.height + this.header_offset ] );
        }
        this.resize(this.size);

        // update color theme
        this.updateTheme();
        LX.addSignal( "@on_new_color_scheme", (el, value) => {
            // Retrieve again the color using LX.getThemeColor, which checks the applied theme
            this.updateTheme();
        } )
    }

    /**
     * @method updateHeader
     * @param {*}  
     */

    updateHeader() {

        if( this.header )
        {
            this.header.clear();
        }
        else
        {
            this.header = new LX.Panel( { id: 'lextimelineheader', height: this.header_offset + "px" } );
            this.root.root.appendChild( this.header.root );
        }

        let header = this.header;
        header.sameLine();

        if( this.name )
        {
            header.addTitle(this.name );
        }

        const buttonContainer = LX.makeContainer(["auto", "100%"], "", { display: "flex" });

        header.queue( buttonContainer );

        header.addButton("playBtn", '', (value, event) => {
           this.changeState();
        }, { buttonClass: "accept", title: "Play", hideName: true, icon: ("fa-solid fa-"+ (this.playing ? 'pause' : 'play')) });

        header.addButton("toggleLoopBtn", '', ( value, event ) => {
            this.loop = !this.loop;
            if( this.onChangePlayMode )
            {
                this.onChangePlayMode( this.loop );
            }
        }, { selectable: true, selected: this.loop, title: 'Loop', hideName: true, icon: "fa-solid fa-rotate" });
        
        if( this.onBeforeCreateTopBar )
        {
            this.onBeforeCreateTopBar( header );
        }

        header.clearQueue( buttonContainer );

        header.addContent( "header-buttons", buttonContainer );

        header.addNumber("Current Time", this.currentTime, (value, event) => {
            this.setTime(value)
        }, {
            units: "s",
            signal: "@on_set_time_" + this.name,
            step: 0.01, min: 0, precision: 3,
            skipSlider: true
        });

        header.addNumber("Duration", + this.duration.toFixed(3), (value, event) => {
            this.setDuration(value, false)
        }, {
            units: "s",
            step: 0.01, min: 0,
            signal: "@on_set_duration_" + this.name
        });    

        header.addNumber("Speed", + this.speed.toFixed(3), (value, event) => {
            this.setSpeed(value)
        }, {
            step: 0.01,
            signal: "@on_set_speed_" + this.name
        });
           
        if( this.onAfterCreateTopBar )
        {
            this.onAfterCreateTopBar( header );      
        }

        if( this.onShowOptimizeMenu )
        {
            header.addButton(null, '<i class="fa-solid fa-filter"></i>', (value, event) => {this.onShowOptimizeMenu(event)}, { title: "Optimize" });
        }

        if( this.onShowConfiguration )
        {
            header.addButton(null, '<i class="fa-solid fa-gear"></i>', (value, event) => {
                if(this.configurationDialog){
                    this.configurationDialog.close();
                    this.configurationDialog = null;
                    return;
                }
                this.configurationDialog = new LX.Dialog("Configuration", dialog => {
                    this.onShowConfiguration(dialog);
                }, {
                    onclose: (root) => {
                        this.configurationDialog.panel.clear(); // clear signals
                        this.configurationDialog = null;
                        root.remove();
                    }
                })
            }, { title: "Settings" })
        }

        header.endLine( "space-around" );
    }

    /**
    * @method updateLeftPanel
    * 
    */
    updateLeftPanel( area ) {

        let scrollTop = 0;
        if( this.leftPanel )
        {
            scrollTop = this.leftPanel.root.children[ 1 ].scrollTop;
            this.leftPanel.clear();
        }
        else
        {
            this.leftPanel = area.addPanel( { className: 'lextimelinepanel', width: "100%", height: "100%" } );
        }

        let panel = this.leftPanel;
        panel.sameLine( 2 );

        let titleWidget = panel.addTitle( "Tracks" );
        let title = titleWidget.root;
        
        if( !this.disableNewTracks ) 
        {
            panel.addButton("addTrackBtn", '<i class = "fa-solid fa-plus"></i>', (value, event) => {
                this.addNewTrack();
            }, { hideName: true, title: "Add Track" });
        }

        panel.endLine();

        const styles = window.getComputedStyle( title );
        const titleHeight = title.clientHeight + parseFloat(styles['marginTop']) + parseFloat(styles['marginBottom']);
        
        let p = new LX.Panel({height: "calc(100% - " + titleHeight + "px)"});

        if( this.animationClip && this.selectedItems.length )
        {
            let items = { 'id': '', 'children': [] };

            const tracksPerItem = this.animationClip.tracksPerItem;
            for( let i = 0; i < this.selectedItems.length; i++ )
            {
                let selected = this.selectedItems[ i ];
                let t = {
                    'id': selected,
                    'skipVisibility': true,
                    'children': []
                }
                for( let j = 0; j < tracksPerItem[selected].length; j++ )
                {
                    let track = tracksPerItem[selected][j];
                    let id = track.type ? track.type : track.name;

                    t.children.push({'id': id, 'skipVisibility': this.skipVisibility, visible: track.active, /*selected: track.isSelected,*/ 'children':[], actions : this.skipLock ? null : [{
                        'name':'Lock edition',
                        'icon': 'fa-solid '+ (track.locked ? 'fa-lock' : 'fa-lock-open'),                       
                        'callback': (node, el) => {
                            // TO DO (apply functionality)
                            let value = el.classList.contains('fa-lock');
                         
                            if(value) {
                                el.title = 'Lock edition';
                                el.classList.remove('fa-lock');
                                el.classList.add('fa-lock-open');    
                            }
                            else {
                                el.title = 'Unlock edition';
                                el.classList.remove('fa-lock-open');
                                el.classList.add('fa-lock');                                 
                            }
                            let tracks = tracksPerItem[node.parent.id];
                            let type = node.id.replaceAll(node.parent.id, "").replaceAll(" (", "").replaceAll(")","");
                            let track = null;
                            for(let i = 0; i < tracks.length; i++) {
                                if(tracks[i].name == node.parent.id && type.includes(tracks[i].type)) {
                                    tracks[i].locked = !value;
                                    track = tracks[i];
                                }
                            }
                            if(this.onLockTrack)
                                this.onLockTrack(el, track, node)
                        }
                         
                    }]})
                    // panel.addTitle(track.name + (track.type? '(' + track.type + ')' : ''));
                }

                items.children.push( t );

                this.leftPanelTrackTreeWidget = p.addTree(null, t, {filter: false, rename: false, draggable: false, onevent: (e) => {
                    switch(e.type) {
                        case LX.TreeEvent.NODE_SELECTED:
                            if (e.node.parent){
                                const tracksInItem = this.animationClip.tracksPerItem[e.node.parent.id];
                                const type = e.node.id;
                                for(let i = 0; i < tracksInItem.length; i++) {
                                    if(tracksInItem[i].type == type){
                                        this.selectTrack(tracksInItem[i].clipIdx);
                                        break;
                                    }
                                }
                            }
                            break;
                        case LX.TreeEvent.NODE_VISIBILITY:   
                            if ( e.node.parent )
                            {
                                const tracksInItem = this.animationClip.tracksPerItem[ e.node.parent.id ];
                                const type = e.node.id;
                                for(let i = 0; i < tracksInItem.length; i++) {
                                    if(tracksInItem[i].type == type)
                                    {
                                        this.changeTrackVisibility( tracksInItem[ i ].clipIdx, e.value );
                                        break;
                                    }
                                }
                            } 
                            break;
                        case LX.TreeEvent.NODE_CARETCHANGED:
                            const tracksInItem = this.animationClip.tracksPerItem[e.node.id];
                            for( let i = 0; i < tracksInItem; ++i )
                            {
                                this.changeTrackDisplay( tracksInItem[ i ].clipIdx, e.node.closed );
                            }
                            break;
                    }
                }});

            }
        }

        panel.attach( p.root )
        p.root.style.overflowY = "scroll";
        p.root.addEventListener("scroll", e => {
            if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight){
                this.currentScroll = e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
            }
            else{
                this.currentScroll = 0;
            }
        });
        // for(let i = 0; i < this.animationClip.tracks.length; i++) {
        //     let track = this.animationClip.tracks[i];
        //     panel.addTitle(track.name + (track.type? '(' + track.type + ')' : ''));
        // }
        this.leftPanel.root.children[ 1 ].scrollTop = scrollTop;

        if( this.leftPanel.parent.root.classList.contains("hidden") || !this.root.root.parent )
        {
            return;
        }

        this.resizeCanvas([ this.root.root.clientWidth - this.leftPanel.root.clientWidth  - 8, this.size[1]]);
    }

    /**
     * @method addNewTrack
     */

    addNewTrack() {

        if( !this.animationClip )
        {
            this.animationClip = {tracks:[]};
        }

        let trackInfo = {
            idx: this.animationClip.tracks.length,
            values: [], times: [],
            selected: [], edited: [], hovered: []
        };

        this.animationClip.tracks.push( trackInfo );
        this.updateLeftPanel();
        return trackInfo.idx;
    }

    getTracksInRange( minY, maxY, threshold ) {

        let tracks = [];

        // Manage negative selection
        if( minY > maxY )
        {
            let aux = minY;
            minY = maxY;
            maxY = aux;
        }

        for(let i = this.tracksDrawn.length - 1; i >= 0; --i)
        {
            let t = this.tracksDrawn[ i ];
            let pos = t[ 1 ] - this.topMargin, size = t[ 2 ];
            if( pos + threshold >= minY && (pos + size - threshold) <= maxY ) {
                tracks.push( t[ 0 ] );
            }
        }

        return tracks;
    }

    getCurrentContent( track, time, threshold ) {

        if( this.getCurrentKeyFrame )
        {
            return this.getCurrentKeyFrame( track, time, threshold );
        }

        if( this.getCurrentClip )
        {
            return this.getCurrentClip( track, time, threshold );
        }
    }

    /**
     * @method setAnimationClip
     * @param {*} animation 
     * @param {boolean} needsToProcess
     * @param {obj} processOptions 
     * [KeyFrameTimeline] - each track should contain an attribute "dim" to indicate the value dimension (e.g. vector3 -> dim=3). Otherwise dimensions will be infered from track's values and times. Default is 1
     */
    setAnimationClip( animation, needsToProcess = true ) {

        if ( this.unSelectAllKeyFrames )
        {
            this.unSelectAllKeyFrames();
            this.unHoverAll();
            this.unSelectAllTracks();
            this.selectedItems = [];
        }

        if( !animation || !animation.tracks || needsToProcess )
        { 
            this.processTracks( animation ); // generate default animationclip or process the user's one
        }
        else
        {
            this.animationClip = animation;
        }
       
        this.duration = this.animationClip.duration;
        this.speed = this.animationClip.speed ?? this.speed;

        //this.updateHeader();
        this.updateLeftPanel();

        return this.animationClip;
    }

    drawTimeInfo( w, h = this.topMargin ) {
       
        let ctx = this.canvas.getContext( "2d" );
        ctx.font = "11px " + Timeline.FONT;//"11px Calibri";
        ctx.textAlign = "center";
                
        // Draw time markers
        ctx.save();

        // background of timeinfo
        ctx.fillStyle = Timeline.BACKGROUND_COLOR;
        ctx.fillRect( this.session.left_margin, 0, this.canvas.width, h );
        ctx.strokeStyle = Timeline.FONT_COLOR_PRIMARY;

        // set tick and sub tick times
        let tickTime = 4;
        if ( this.secondsToPixels > 900 ) { tickTime = 1; }
        else if ( this.secondsToPixels > 100 ) { tickTime = 2; }
        else if ( this.secondsToPixels > 50 ) { tickTime = 3; }

        let subtickTime = this.timeSeparators[tickTime - 1];
        tickTime = this.timeSeparators[tickTime];

        // Transform times into pixel coords
        let tickX = this.timeToX( this.startTime + tickTime ) - this.timeToX( this.startTime );
        let subtickX = subtickTime * tickX / tickTime; 

        let startx = this.timeToX( Math.floor( this.startTime / tickTime) * tickTime ); // floor because might need to draw previous subticks
        let endx = this.timeToX( this.endTime ); // draw up to endTime

        // Begin drawing
        ctx.beginPath();
        ctx.fillStyle = Timeline.FONT_COLOR_PRIMARY;
        ctx.globalAlpha = this.opacity;

        for( let x = startx; x <= endx; x += tickX )
        {
            // Draw main line
            ctx.moveTo( Math.round( x ) + 0.5, h * 0.4 + h * 0.3 );
            ctx.lineTo( Math.round( x ) + 0.5, h * 0.95 );

            // Draw following sub lines
            let endsub = x + tickX - subtickX * 0.5;
            for ( let subX = x; subX < endsub && subX < endx; subX += subtickX )
            {
                ctx.moveTo( Math.round( subX ) + 0.5, h * 0.4 + h * 0.45 );
                ctx.lineTo( Math.round( subX ) + 0.5, h * 0.95 );
            }

            // Draw time number
            let t = this.xToTime( x );
            ctx.fillText( t.toFixed( tickTime < 1 ? 1 : 0 ), x, h * 0.6 );
        }

        ctx.stroke();                
        ctx.restore();
    }

    drawTracksBackground( w, h ) {

        let canvas = this.canvas;
        let ctx = canvas.getContext("2d");
        let duration = this.duration;
        ctx.globalAlpha = this.opacity;

        // Content
        const topMargin = this.topMargin; 
        const leftMargin = this.session.left_margin;
        const treeOffset = this.leftPanelTrackTreeWidget.innerTree.domEl.offsetTop - this.canvas.offsetTop;
        const line_height = this.trackHeight;
    
        //fill track lines
        w = w || canvas.width;
        let max_tracks = Math.ceil( (h - topMargin) / line_height ) + 1;

        ctx.save();
        ctx.fillStyle = Timeline.TRACK_COLOR_SECONDARY;

        const rectsOffset = this.currentScrollInPixels % line_height; 
        const blackOrWhite = 1 - Math.floor(this.currentScrollInPixels / line_height ) % 2;
        for(let i = blackOrWhite; i <= max_tracks; i+=2)
        {
            ctx.fillRect(0, treeOffset - rectsOffset + i * line_height, w, line_height );
        }

        //bg lines
        ctx.strokeStyle = Timeline.TRACK_COLOR_TERCIARY;
        ctx.beginPath();
    
        let pos = this.timeToX( 0 );
        if(pos < leftMargin)
            pos = leftMargin;
        ctx.lineWidth = 1;
        ctx.moveTo( pos + 0.5, topMargin);
        ctx.lineTo( pos + 0.5, canvas.height);
        ctx.moveTo( Math.round( this.timeToX( duration ) ) + 0.5, topMargin);
        ctx.lineTo( Math.round( this.timeToX( duration ) ) + 0.5, canvas.height);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * @method draw
     */

    draw( ) {

        let ctx = this.canvas.getContext("2d");
        ctx.textBaseline = "bottom";
        ctx.font = "11px " + Timeline.FONT;//"11px Calibri";

        // this.canvas = ctx.canvas;
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        // this.updateHeader();

        const scrollableHeight = this.leftPanelTrackTreeWidget.root.scrollHeight;
        const treeOffset = this.leftPanelTrackTreeWidget.innerTree.domEl.offsetTop - this.canvas.offsetTop;

        if ( this.leftPanelTrackTreeWidget.root.scrollHeight > 0 ){
            const ul = this.leftPanelTrackTreeWidget.innerTree.domEl.children[0];
            this.trackHeight = ul.children.length < 1 ? 25 : (ul.offsetHeight / ul.children.length);
        }
        
        this.currentScrollInPixels = scrollableHeight <= (h-this.topMargin) ? 0 : (this.currentScroll * (scrollableHeight - (ctx.canvas.height-this.topMargin)));

        //zoom
        this.startTime = this.session.start_time; //seconds
        if(this.startTime < 0)
            this.startTime = 0;
        this.endTime = this.session.start_time + (w - this.session.left_margin) * this.pixelsToSeconds;
        if(this.endTime > this.duration)
            this.endTime = this.duration;
        if(this.startTime > this.endTime)
            this.endTime = this.startTime;

        
        this.tracksDrawn.length = 0;

        // Background
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = Timeline.TRACK_COLOR_SECONDARY;
        ctx.clearRect(0,0, this.canvas.width, this.canvas.height );

        this.drawTracksBackground(w, h);

        if( this.onBeforeDrawContent ){
            this.onBeforeDrawContent(ctx);
        }

        if(this.animationClip) {
            ctx.translate( 0, treeOffset );
            this.drawContent( ctx, this.timeStart, this.timeEnd, this );
            ctx.translate( 0, -treeOffset );
        }

        //scrollbar
        if( h < scrollableHeight ){
            ctx.fillStyle = "#222";
            ctx.fillRect( w - this.session.left_margin - 10, 0, 10, h );

            ctx.fillStyle = this.grabbingScroll ? Timeline.FONT_COLOR_PRIMARY : Timeline.FONT_COLOR_QUATERNARY;
           
            let scrollBarHeight = Math.max( 10, (h-this.topMargin)* (h-this.topMargin)/ this.leftPanel.root.children[1].scrollHeight);
            let scrollLoc = this.currentScroll * ( h - this.topMargin - scrollBarHeight ) + this.topMargin;
            ctx.roundRect( w - 10, scrollLoc, 10, scrollBarHeight, 5, true );
        }

        this.drawTimeInfo(w);

        // Current time marker vertical line
        let posx = Math.round( this.timeToX( this.currentTime ) );
        let posy = this.topMargin * 0.4;
        if(posx >= this.session.left_margin)
        {
            ctx.strokeStyle = ctx.fillStyle =  LX.getThemeColor("global-selected");
            ctx.globalAlpha = this.opacity;
            ctx.beginPath();
            ctx.moveTo(posx, posy * 0.6); ctx.lineTo(posx, this.canvas.height);//line
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 8;
            ctx.shadowColor = LX.getThemeColor("global-selected");
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            ctx.roundRect( posx - 10, posy * 0.6, 20, posy, 5, true );
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Current time seconds in text
        ctx.font = "11px " + Timeline.FONT;//"11px Calibri";
        ctx.textAlign = "center";
        //ctx.textBaseline = "middle";
        ctx.fillStyle = Timeline.COLOR_INACTIVE;
        ctx.fillText( (Math.floor(this.currentTime*10)*0.1).toFixed(1), posx, this.topMargin * 0.6 );

        // Selections
        ctx.strokeStyle = ctx.fillStyle = Timeline.FONT_COLOR_PRIMARY;
        ctx.translate( 0, this.topMargin );
        if(this.boxSelection) {
            ctx.globalAlpha = 0.15 * this.opacity;
            ctx.fillStyle = Timeline.BOX_SELECTION_COLOR;
            ctx.strokeRect( this.boxSelectionStart[0], this.boxSelectionStart[1], this.boxSelectionEnd[0] - this.boxSelectionStart[0], this.boxSelectionEnd[1] - this.boxSelectionStart[1]);
            ctx.fillRect( this.boxSelectionStart[0], this.boxSelectionStart[1], this.boxSelectionEnd[0] - this.boxSelectionStart[0], this.boxSelectionEnd[1] - this.boxSelectionStart[1]);
            ctx.stroke();
            ctx.globalAlpha = this.opacity;
        }
        ctx.translate( 0, -this.topMargin );

    }

    /**
     * @method drawMarkers
     * @param {*} ctx 
     * @param {*} markers 
     */

    drawMarkers( ctx, markers ) {

        //render markers
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        let markersPos = [];
        for (let i = 0; i < markers.length; ++i) {
            let marker = markers[i];
            if (marker.time < this.startTime - this.pixelsToSeconds * 100 ||
                marker.time > this.endTime)
                continue;
            var x = this.timeToX(marker.time);
            markersPos.push(x);
            ctx.save();
            ctx.translate(x, 0);
            ctx.rotate(Math.PI * -0.25);
            ctx.fillText(marker.title, 20, 4);
            ctx.restore();
        }

        if (markersPos.length) {
            ctx.beginPath();
            for (var i = 0; i < markersPos.length; ++i) {
                ctx.moveTo(markersPos[i] - 5, 0);
                ctx.lineTo(markersPos[i], -5);
                ctx.lineTo(markersPos[i] + 5, 0);
                ctx.lineTo(markersPos[i], 5);
                ctx.lineTo(markersPos[i] - 5, 0);
            }
            ctx.fill();
        }
    }

    /**
     * @method clearState
     */

    clearState() {
        this.trackStateUndo = [];
        this.trackStateRedo = [];
    }

    /**
     * @method setDuration
     * @param {Number} t 
     */

    setDuration( t, updateHeader = true, skipCallback = false ) {
        let v = this.validateDuration(t);
        let decimals = t.toString().split('.')[1] ? t.toString().split('.')[1].length : 0;
        updateHeader = (updateHeader || +v.toFixed(decimals) != t);
        this.duration = this.animationClip.duration = v; 

        if(updateHeader) {
            LX.emit( "@on_set_duration_" + this.name, +this.duration.toFixed(3)); // skipcallback = true
        }

        if( this.onSetDuration && !skipCallback ) 
            this.onSetDuration( this.duration );	 
    }

    /**
     * @method validateDuration
     * @param {Number} t 
     * @returns minimum available duration
     */
    validateDuration(t) {
        return t;
    }


        /**
     * @method setSpeed
     * @param {Number} speed 
     */

    setSpeed(speed, skipCallback = false) {
        this.speed = speed;
        LX.emit( "@on_set_speed_" + this.name, +this.speed.toFixed(3)); // skipcallback = true
        
        if( this.onSetSpeed && !skipCallback) 
            this.onSetSpeed( this.speed );	 
    }

    setTime(time, skipCallback = false ){
        this.currentTime = Math.max(0,Math.min(time,this.duration));
        LX.emit( "@on_set_time_" + this.name, +this.currentTime.toFixed(2)); // skipcallback = true

        if(this.onSetTime && !skipCallback)
            this.onSetTime(this.currentTime);
    }

    // Converts distance in pixels to time
    xToTime( x ) {
        return (x - this.session.left_margin) / this.secondsToPixels + this.session.start_time;
    }

    // Converts time to disance in pixels
    timeToX( t ) {
        return this.session.left_margin + (t - this.session.start_time) * this.secondsToPixels;
    }
    
    /**
     * @method setScale
     * @param {*} v
     */

    setScale( v ) {

        if(!this.session)
            return;

        const xCurrentTime = this.timeToX(this.currentTime);
        this.secondsToPixels *= v;
        this.secondsToPixels = Math.max( 0.00001, this.secondsToPixels );

        this.pixelsToSeconds = 1 / this.secondsToPixels;
        this.session.start_time += this.currentTime - this.xToTime(xCurrentTime);
    }

    /**
     * @method processMouse
     * @param {*} e
     */

    processMouse( e ) {

        if(!this.canvas)
            return;
    
        e.multipleSelection = false;

        let h = this.canvas.height;
        let w = this.canvas.width;

        // Process mouse
        let x = e.offsetX;
        let y = e.offsetY;
        e.deltax = x - this.lastMouse[0];
        e.deltay = y - this.lastMouse[1];
        let localX = e.offsetX;
        let localY = e.offsetY;

        let timeX = this.timeToX( this.currentTime );
        let isHoveringTimeBar = localY < this.topMargin && localX > this.session.left_margin && 
        localX > (timeX - 6) && localX < (timeX + 6);

        if( isHoveringTimeBar ) {
            this.canvas.style.cursor = "col-resize";
        }
        else if(this.movingKeys) {
            this.canvas.style.cursor = "grabbing";    
        }
        else if(e.shiftKey) {
            this.canvas.style.cursor = "crosshair";
        }
        else {
            this.canvas.style.cursor = "default";
        }

        if( e.type == "wheel" ) {
            if(e.shiftKey)
            {
                // mouseTime = xToTime(localX)_prev = xToTime(localX)_after
                //(x - this.session.left_margin) / this.secondsToPixels_prev + this.session.start_time_prev = (x - this.session.left_margin) / this.secondsToPixels_after + this.session.start_time_after
                // start_time = xToTime(localX)_prev - (x - this.session.left_margin) / this.secondsToPixels_after
                let mouseTime = this.xToTime(localX);
                this.setScale( e.wheelDelta < 0 ? 0.95 : 1.05 );
                this.session.start_time = mouseTime - (localX - this.session.left_margin) / this.secondsToPixels;
            }
            else if( h < this.leftPanelTrackTreeWidget.root.scrollHeight)
            {              
                this.leftPanel.root.children[1].scrollTop += e.deltaY; // wheel deltaY
            }
            
            if ( this.onMouse ){
                this.onMouse(e, time);
            }
            return;
        }

        var time = this.xToTime(x, true);

        var is_inside = x >= 0 && x <= this.size[0] &&
                        y >= 0 && y <= this.size[1];

        var track = null;
        for(var i = this.tracksDrawn.length - 1; i >= 0; --i)
        {
            var t = this.tracksDrawn[i];
            if( (t[1] + t[2]) >= this.topMargin && localY >= t[1] && localY < (t[1] + t[2]) )
            {
                track = t[0];
                break;
            }
        }

        e.track = track;
        e.localX = localX;
        e.localY = localY;

        if( e.type == "mouseup" )
        {
            if(!this.active) {
                this.grabbing = false;
                this.grabbingTimeBar = false;
                this.grabbingScroll = false;
                this.movingKeys = false;
                this.timeBeforeMove = null;
                this.boxSelection = false;
                return;
            }
            // this.canvas.style.cursor = "default";
            const discard = this.movingKeys || (LX.UTILS.getTime() - this.clickTime) > this.clickDiscardTimeout; // ms

            e.discard = discard;
 
            if( !this.grabbingScroll && !this.grabbingTimeBar && e.button == 0 && this.onMouseUp ) {
                this.onMouseUp(e, time);
            }

            this.grabbing = false;
            this.grabbingTimeBar = false;
            this.grabbingScroll = false;
            this.movingKeys = false;
            this.timeBeforeMove = null;
            this.boxSelection = false; // after mouseup
            this.unSelectAllTracks();
        }
    

        if( e.type == "mousedown")	{
            
            this.clickTime = LX.UTILS.getTime();

            if(this.trackBulletCallback && e.track)
                this.trackBulletCallback(e.track,e,this,[localX,localY]);

            if(e.shiftKey && this.active) {
                this.boxSelection = true;
                this.boxSelectionEnd[0] = this.boxSelectionStart[0] = localX; 
                this.boxSelectionEnd[1] = this.boxSelectionStart[1] = localY - this.topMargin;
                return; // Handled
            }
            else if( e.localY < this.topMargin ){
                this.grabbing = true;
                this.grabbingTimeBar = true;
                this.setTime(time);
            }
            else if( h < this.leftPanelTrackTreeWidget.root.scrollHeight && x > w - 10 ) { // grabbing scroll bar
                this.grabbing = true;
                this.grabbingScroll = true;
            }
            else { // grabbing canvas
                
                this.grabbing = true;
                this.grabTime = time;
                this.grabbingTimeBar = isHoveringTimeBar;
                if(this.onMouseDown && this.active )
                    this.onMouseDown(e, time);
            }
        }
        else if( e.type == "mousemove" ) {

            if(e.shiftKey && this.active && this.boxSelection) {
                this.boxSelectionEnd[0] = localX; 
                this.boxSelectionEnd[1] = localY - this.topMargin;
                return; // Handled
            }
            else if(this.grabbing && e.button !=2 && !this.movingKeys ) { // e.buttons != 2 on mousemove needs to be plural
                this.canvas.style.cursor = "grabbing"; 
                if(this.grabbingTimeBar && this.active)
                {
                    this.setTime(time);
                }
                else if(this.grabbingScroll)
                {
                    if ( y < this.topMargin ){
                        this.currentScroll = 0;
                    }
                    else{
                        let h = this.leftPanel.root.clientHeight;
                        let scrollBarHeight = Math.max( 10, (h-this.topMargin)* (h-this.topMargin)/this.leftPanel.root.children[1].scrollHeight);
                        let minScrollLoc = this.topMargin;
                        let maxScrollLoc = h - scrollBarHeight; // - sizeScrollBar
                        this.currentScroll = Math.min( 1, Math.max(this.currentScroll + e.deltay / (maxScrollLoc - minScrollLoc), 0) );    
                    }
                    this.leftPanel.root.children[1].scrollTop = this.currentScroll * (this.leftPanel.root.children[1].scrollHeight-this.leftPanel.root.children[1].clientHeight);
                }
                else
                {
                    // Move timeline in X (independent of current time)
                    var old = this.xToTime( this.lastMouse[0] );
                    var now = this.xToTime( e.offsetX );
                    this.session.start_time += (old - now);

                    this.leftPanel.root.children[1].scrollTop -= e.deltay; // will automatically call scroll event

                }
            }

            if(this.onMouseMove) {
                this.onMouseMove(e, time);
            }
        }
        else if (e.type == "dblclick" && this.onDblClick) {
            this.onDblClick(e);	
        }
        else if (e.type == "contextmenu" && this.showContextMenu && this.active) {
            this.showContextMenu(e);
        }

        this.lastMouse[0] = x;
        this.lastMouse[1] = y;

        if( !is_inside && !this.grabbing && !(e.metaKey || e.altKey ) ) {           
            return true;
        }

        if( this.onMouse )
            this.onMouse( e, time, this );

        return true;
    }
    
    /**
     * @method processKeys
     * @param {*} e
     */
    processKeys(e) {

        if( e.type == 'keydown' ) {
            switch(e.key) {
                case 'Delete': case 'Backspace':
                    this.deleteSelectedContent();
                    break;
                case 'c': case 'C':
                    if(e.ctrlKey)
                        this.copySelectedContent();
                    break;
                case 'v': case 'V':
                    if(e.ctrlKey)
                        this.pasteContent();
                    break;
                case ' ':
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    this.changeState();
                    break; 

                case "Shift":
                    this.canvas.style.cursor = "crosshair";
                    break;
            }
        }
    }
    
    /**
     * @method changeState
     * @description change play/pause state
     * ...
     **/
    changeState() {
        this.playing = !this.playing;
        this.updateHeader();

        if(this.onChangeState) {
            this.onChangeState(this.playing);
        }
    }
    /**
     * @method setState
     * @param {bool} state
     * @description change play/pause state
     * ...
     **/
    setState( state ) {
        this.playing = state;
        this.updateHeader();

        if(this.onChangeState) {
            this.onChangeState(this.playing);
        }
    }

    /**
     * @method drawTrackWithBoxes
     * @param {*} ctx
     */

    drawTrackWithBoxes( ctx, y, trackHeight, title, track ) {

        const treeOffset = this.leftPanelTrackTreeWidget.innerTree.domEl.offsetTop - this.canvas.offsetTop;
        this.tracksDrawn.push([track, y + treeOffset, trackHeight]);

        // Fill track background if it's selected
        ctx.globalAlpha = 0.2 * this.opacity;
        ctx.fillStyle = Timeline.TRACK_SELECTED_LIGHT;
        if(track.isSelected) {
            ctx.fillRect(0, y, ctx.canvas.width, trackHeight );    
        }

        const clips = track.clips;
        if(!clips) {
            return;
        }

        const  offset = (trackHeight - trackHeight * 0.6) * 0.5;
        
        trackHeight *= 0.6;
        
        let selectedClipArea = null;

        ctx.font = Math.floor( trackHeight * 0.8) + "px" + Timeline.FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const trackAlpha = this.opacity;

 
        for(var j = 0; j < clips.length; ++j)
        {
            selectedClipArea = null;
            let clip = clips[j];
            //let selected = track.selected[j];
            var x = Math.floor( this.timeToX(clip.start) ) + 0.5;
            var x2 = Math.floor( this.timeToX( clip.start + clip.duration ) ) + 0.5;
            var w = x2-x;

            if( x2 < 0 || x > this.canvas.width )
                continue;
            
            // Overwrite clip color state depending on its state
            ctx.globalAlpha = trackAlpha;
            ctx.fillStyle = clip.clipColor || (track.hovered[j] ? Timeline.COLOR_HOVERED : (Timeline.COLOR));
            if(track.selected[j] && !clip.clipColor) {
                ctx.fillStyle = Timeline.TRACK_SELECTED;
            }
            if(!this.active || track.active == false) {
                ctx.fillStyle = Timeline.COLOR_INACTIVE;
            }

            // Draw clip background
            ctx.roundRect( x, y + offset, w, trackHeight , 5, true);
            
            // Compute timeline position of fade-in and fade-out clip times
            let fadeinX = this.secondsToPixels * ((clip.fadein || 0) - clip.start);
            let fadeoutX = this.secondsToPixels * (clip.start + clip.duration - (clip.fadeout || (clip.start + clip.duration)));
            
            if(this.active && track.active) {
                // Transform fade-in and fade-out fill color to RGBA
                if(ctx.fillStyle[0] == "#") {
                    let color = LX.UTILS.HexToRgb(ctx.fillStyle);
                    color = color.map(x => x*=0.8);
                    ctx.fillStyle = 'rgba(' + color.join(',') + ', 0.8)';
                }
                else {
                    ctx.globalAlpha = 0.8 * this.opacity;
                }
            
                // Draw fade-in and fade-out
                if(fadeinX >= 0) {
                    ctx.roundRect(x, y + offset, fadeinX, trackHeight, {tl: 5, bl: 5, tr:0, br:0}, true);
                }
                if(fadeoutX) {
                    ctx.roundRect( x + w - fadeoutX, y + offset, fadeoutX, trackHeight, {tl: 0, bl: 0, tr:5, br:5}, true);
                }
            }
            
            ctx.fillStyle = clip.color || Timeline.FONT_COLOR_PRIMARY;
            //ctx.font = "12px" + Timeline.FONT;

            // Overwrite style and draw clip selection area if it's selected
            ctx.globalAlpha = clip.hidden ? trackAlpha * 0.5 : trackAlpha;
            
            if(track.selected[j] || track.hovered[j]) {
                ctx.strokeStyle = ctx.shadowColor = track.clips[j].clipColor || Timeline.TRACK_SELECTED;
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 1.5;
                ctx.shadowOffsetY = 1.5;
                
                selectedClipArea = [x - 1, y + offset -1, x2 - x + 2, trackHeight + 2];
                ctx.roundRect(selectedClipArea[0], selectedClipArea[1], selectedClipArea[2], selectedClipArea[3], 5, false, true);

                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                ctx.font = "bold" + Math.floor( trackHeight) + "px " + Timeline.FONT;
                ctx.fillStyle = "white";
            }

            // Overwrite style with small font size if it's zoomed out
            if( this.secondsToPixels < 200) {
                ctx.font = this.secondsToPixels*0.06  +"px" + Timeline.FONT;
            }

            const text = clip.id.replaceAll("_", " ").replaceAll("-", " ");
            const textInfo = ctx.measureText( text );
            
            // Draw clip name if it's readable
            if(this.secondsToPixels > 100) {
                ctx.fillText( text, x + (w - textInfo.width)*0.5,  y + offset + trackHeight * 0.5);
            }

            ctx.fillStyle = track.hovered[j] ? "white" : Timeline.FONT_COLOR_PRIMARY;
            // Draw resize bounding
            ctx.roundRect(x + w - 8 , y + offset , 8, trackHeight, {tl: 4, bl: 4, tr:4, br:4}, true);           
        }

        ctx.font = "12px" + Timeline.FONT;
    }

    /**
    * @method selectTrack
    * @param {int} trackIdx
    * // NOTE: to select a track from outside of the timeline, a this.leftPanelTrackTreeWidget.innerTree.select(item) needs to be called.
    */
    selectTrack( trackIdx ) {

        if( !this.animationClip )
        {
            return;
        }

        this.unSelectAllTracks();
        
        let track = this.animationClip.tracks[ trackIdx ];
        track.isSelected = true;
        
        if( this.onSelectTrack )
        {
            this.onSelectTrack(track);
        }
    }

    unSelectAllTracks() {

        if( !this.animationClip )
        {
            return;
        }

        for(let i = 0; i < this.selectedItems.length; i++)
        {
            let item = this.selectedItems[ i ];
            let tracks = this.animationClip.tracksPerItem[ item ];

            for( let t = 0; t < tracks.length; t++ )
            {
                tracks[ t ].isSelected = false;
            }
        }
    }

    /**
    * @method changeTrackVisibility
    * @param {int} trackIdx 
    */
    changeTrackVisibility(trackIdx, visible) {
        let track = this.animationClip.tracks[trackIdx];
            
        let oldState = track.active;
        track.active = visible;

        if(this.onChangeTrackVisibility)
            this.onChangeTrackVisibility(track, oldState);
    }

    /**
    * @method changeTrackDisplay
    * @param {int} trackIdx 
    */
    changeTrackDisplay(trackIdx, hide) {
        let track = this.animationClip.tracks[trackIdx];
        track.hide = hide;

        if(this.onChangeTrackDisplay)
            this.onChangeTrackDisplay(track, hide)
    }

    /**
     * @method resize
     * @param {*} size
     */
    resize( size = [this.root.parent.root.clientWidth, this.root.parent.root.clientHeight]) {

        // this.root.root.style.width = size[0] + "px";
        // this.root.root.style.height = size[1] + "px";
        
        this.size = size; 
        //this.content_area.setSize([size[0], size[1] - this.header_offset]);
        this.content_area.root.style.height = "calc(100% - "+ this.header_offset + "px)";

        let w = size[0] - this.leftPanel.root.clientWidth - 8;
        this.resizeCanvas([w , size[1]]);     
    }

    resizeCanvas( size ) {
        if( size[0] <= 0 && size[1] <=0 )
            return;
        size[1] -= this.header_offset;
        this.canvas.width = this.canvasArea.root.clientWidth;
        this.canvas.height = this.canvasArea.root.clientHeight;
    }

    /**
    * @method hide
    * Hide timeline area
    */
    hide() {
        this.root.hide();
    }

    /**
    * @method show
    * Show timeline area if it is hidden
    */
    show() {
        
        this.root.show();
        this.updateLeftPanel();
        this.resize();        
    }

    /**
     * updates theme (light - dark) based on LX's current theme
     */
    updateTheme( ){
        Timeline.BACKGROUND_COLOR = LX.getThemeColor("global-blur-background");
        Timeline.TRACK_COLOR_PRIMARY = LX.getThemeColor("global-color-primary");
        Timeline.TRACK_COLOR_SECONDARY = LX.getThemeColor("global-color-secondary");
        Timeline.TRACK_COLOR_TERCIARY = LX.getThemeColor("global-color-terciary");
        Timeline.TRACK_COLOR_QUATERNARY = LX.getThemeColor("global-color-quaternary");
        Timeline.FONT = LX.getThemeColor("global-font");
        Timeline.FONT_COLOR_PRIMARY = LX.getThemeColor("global-text-primary");
        Timeline.FONT_COLOR_QUATERNARY = LX.getThemeColor("global-text-quaternary");
     }
};

Timeline.BACKGROUND_COLOR = LX.getThemeColor("global-blur-background");
Timeline.TRACK_COLOR_PRIMARY = LX.getThemeColor("global-color-primary");
Timeline.TRACK_COLOR_SECONDARY = LX.getThemeColor("global-color-secondary");
Timeline.TRACK_COLOR_TERCIARY = LX.getThemeColor("global-color-terciary");
Timeline.TRACK_COLOR_QUATERNARY = LX.getThemeColor("global-color-quaternary");
Timeline.TRACK_SELECTED = LX.getThemeColor("global-color-accent");
Timeline.TRACK_SELECTED_LIGHT = LX.getThemeColor("global-color-accent-light");
Timeline.FONT = LX.getThemeColor("global-font");
Timeline.FONT_COLOR_PRIMARY = LX.getThemeColor("global-text-primary");
Timeline.FONT_COLOR_QUATERNARY = LX.getThemeColor("global-text-quaternary");
Timeline.COLOR = LX.getThemeColor("global-selected-dark");
Timeline.COLOR_SELECTED = Timeline.COLOR_HOVERED = "rgba(250,250,20,1)";///"rgba(250,250,20,1)";
// Timeline.COLOR_HOVERED = LX.getThemeColor("global-selected");
Timeline.COLOR_INACTIVE = "rgba(250,250,250,0.7)";
Timeline.COLOR_LOCK = "rgba(255,125,125,0.7)";
Timeline.COLOR_EDITED = "rgba(20,230,20,0.7)"//"rgba(125,250,250, 1)";
Timeline.BOX_SELECTION_COLOR = "#AAA";
LX.Timeline = Timeline;

/**
 * @class KeyFramesTimeline
 */

class KeyFramesTimeline extends Timeline {       

    /**
     * @param {string} name 
     * @param {object} options = {animationClip, selectedItems, x, y, width, height, canvas, trackHeight}
     */
    constructor(name, options = {}) {

        super(name, options);
               
        if(this.animationClip && this.animationClip.tracks.length) {
            this.processTracks(this.animationClip);
        }
    }

    onMouseUp( e, time )  {

        let track = e.track;
        let localX = e.localX;
        let discard = e.discard; // true when too much time has passed between Down and Up
        
        if(e.shiftKey) {
            e.multipleSelection = true;
            // Manual multiple selection
            if(!discard && track) {
                const keyFrameIdx = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );   
                if ( keyFrameIdx > -1 ){
                    track.selected[keyFrameIdx] ?
                    this.unSelectKeyFrame(track, keyFrameIdx) :
                    this.processCurrentKeyFrame( e, keyFrameIdx, track, null, true ); 
                }
            }
            // Box selection
            else if(this.boxSelection) {                
                let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                
                for(let t of tracks) {
                    let keyFrameIndices = this.getKeyFramesInRange(t, 
                        this.xToTime( this.boxSelectionStart[0] ), 
                        this.xToTime( this.boxSelectionEnd[0] ),
                        this.pixelsToSeconds * 5);
                        
                    if(keyFrameIndices) {
                        for(let index = keyFrameIndices[0]; index <= keyFrameIndices[1]; ++index){
                            this.processCurrentKeyFrame( e, index, t, null, true );
                        }
                    }
                }
            }
        }
        else if( !this.movingKeys && !discard ){ // if not moving timeline and not adding keyframes through e.shiftkey (just a click)

            if ( this.lastKeyFramesSelected.length ){
                if (this.onUnselectKeyFrames){
                    this.onUnselectKeyFrames( this.lastKeyFramesSelected );
                }
                this.unSelectAllKeyFrames();         
            }
            if (track){
                const keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                if( keyFrameIndex > -1 ) {
                    this.processCurrentKeyFrame( e, keyFrameIndex, track, null, e.multipleSelection ); // Settings this as multiple so time is not being set
                }  
            }
        }

        this.canvas.classList.remove('grabbing');
    }

    onMouseDown( e, time ) {
        // function not called if shift is pressed (boxselection)

        let localX = e.localX;
        let localY = e.localY;
        let track = e.track;

        if(e.ctrlKey && this.lastKeyFramesSelected.length) { // move keyframes
            this.movingKeys = true;
            this.canvas.style.cursor = "grab";  
            this.canvas.classList.add('grabbing');

            // Set pre-move state
            this.moveKeyMinTime = Infinity;
            const tracksPerItem = this.animationClip.tracksPerItem;
            for(let selectedKey of this.lastKeyFramesSelected) {
                let [name, localTrackIdx, keyIndex, trackIdx, keyTime] = selectedKey;
                const track = tracksPerItem[name][localTrackIdx];
                
                // save track states only once
                if (this.moveKeyMinTime < Infinity){
                    let state = this.trackStateUndo[this.trackStateUndo.length-1];
                    let s = 0;
                    for( s = 0; s < state.length; ++s){
                        if ( state[s].trackIdx == track.clipIdx ){ break; }
                    }
                    if( s == state.length ){
                        this.saveState(track.clipIdx, true);
                    }
                }else{
                    this.saveState(track.clipIdx, false);               
                }

                selectedKey[4] = track.times[keyIndex]; // update original time just in case 
                this.moveKeyMinTime = Math.min( this.moveKeyMinTime, selectedKey[4] );
            }
            
            this.timeBeforeMove = this.xToTime( localX );
        }
    }

    onMouseMove( e, time ) {
        // function not called if shift is pressed (boxselection)

        let localX = e.localX;
        let localY = e.localY;
        let track = e.track;

        if(this.movingKeys) { // move keyframes

            let newTime = this.xToTime( localX );
            let deltaTime = newTime - this.timeBeforeMove;
            if ( deltaTime + this.moveKeyMinTime < 0 ){
                deltaTime = -this.moveKeyMinTime;
            }
            this.timeBeforeMove = this.timeBeforeMove + deltaTime;
            this.moveKeyMinTime += deltaTime;
            const tracksPerItem = this.animationClip.tracksPerItem;
            for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                let idx = i;
                if ( deltaTime > 0 ){
                    idx = this.lastKeyFramesSelected.length - 1 - i;
                }
                
                const [name, localTrackIdx, keyIndex, trackIdx, originalKeyTime] = this.lastKeyFramesSelected[idx];
                track = tracksPerItem[name][localTrackIdx];
                if(track && track.locked)
                    continue;

                this.canvas.style.cursor = "grabbing";

                const times = this.animationClip.tracks[ track.clipIdx ].times;
                times[ keyIndex ] = Math.max(0,times[keyIndex] + deltaTime);
                if (times[ keyIndex ] > this.duration){ 
                    this.setDuration(times[ keyIndex ]); 
                }

                // sort keyframe
                let k = keyIndex;
                if ( deltaTime > 0 ){
                    for( ; k < times.length-1; ++k ){
                        if ( times[k] < times[k+1] ){ 
                            break; 
                        }
                        this.swapKeyFrames(track, k+1, k);
                    }
                }else{
                    for( ; k > 0; --k ){
                        if ( times[k-1] < times[k] ){ 
                            break; 
                        }
                        this.swapKeyFrames(track, k-1, k);
                    }
                }
                this.lastKeyFramesSelected[idx][2] = k; // update keyframe index
                this.lastKeyFramesSelected[idx][4] = times[k]; // update keyframe time
            }

            if ( this.onContentMoved ){
                for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                    const [name, localTrackIdx, keyIndex, trackIdx, originalKeyTime] = this.lastKeyFramesSelected[i];
                    track = this.animationClip.tracks[trackIdx];
                    if(track && track.locked)
                        continue;
                    this.onContentMoved(trackIdx, keyIndex);
                }
            }

            return;
        }

        if( this.grabbing && e.button != 2) {

        }
        else if(track) {

            this.unHoverAll();
            let keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
            if(keyFrameIndex > -1 ) {
                
                const name = this.animationClip.tracksDictionary[track.fullname]; 
                let t = this.animationClip.tracksPerItem[ name ][track.idx];
                if(t && t.locked)
                    return;
                
                this.lastHovered = [name, track.idx, keyFrameIndex];
                t.hovered[keyFrameIndex] = true;   
            }
        }
        else {
            this.unHoverAll();
        }
    }

    showContextMenu( e ) {

        e.preventDefault();
        e.stopPropagation();

        let actions = [];
        //let track = this.NMFtimeline.clip.tracks[0];
        if(this.lastKeyFramesSelected && this.lastKeyFramesSelected.length) {
            if(this.lastKeyFramesSelected.length == 1 && this.clipboard && this.clipboard.value)
            {
                actions.push(
                    {
                        title: "Paste",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {
                            let [id, trackIdx, keyIdx] = this.lastKeyFramesSelected[0];
                            this.pasteKeyFrameValue(null, this.animationClip.tracksPerItem[id][trackIdx], keyIdx);
                        }
                    }
                )
            }
            actions.push(
                {
                    title: "Copy",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                    callback: () => {
                        this.copySelectedContent(); // copy value and keyframes selected
                    }
                }
            )
            actions.push(
                {
                    title: "Delete",// + " <i class='bi bi-trash float-right'></i>",
                    callback: () => deleteSelectedContent()
                }
            )
        }
        else{
            
            actions.push(
                {
                    title: "Add",
                    callback: () => this.addKeyFrame( e.track )
                }
            )

            if(this.clipboard && this.clipboard.keyframes)
            {
                actions.push(
                    {
                        title: "Paste",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {
                            this.pasteContent();
                    
                        }
                    }
                )
            }
        }
        
        LX.addContextMenu("Options", e, (m) => {
            for(let i = 0; i < actions.length; i++) {
                m.add(actions[i].title,  actions[i].callback )
            }
        });

    }

    drawContent( ctx ) {
    
        if(!this.animationClip || !this.animationClip.tracksPerItem) 
            return;
        
        ctx.save();

        const trackHeight = this.trackHeight;
        const tracksPerItem = this.animationClip.tracksPerItem;
        const scrollY = - this.currentScrollInPixels;
        const treeOffset = this.leftPanelTrackTreeWidget.innerTree.domEl.offsetTop - this.canvas.offsetTop;

        let offset = scrollY;
        ctx.translate(0, offset);

        for(let t = 0; t < this.selectedItems.length; t++) {
            let tracks = tracksPerItem[this.selectedItems[t]];
            if(!tracks) continue;
            
            offset += trackHeight;
            ctx.translate(0, trackHeight);

            for(let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                if(track.hide) {
                    continue;
                }

                this.drawTrackWithKeyframes(ctx, trackHeight, track);
                this.tracksDrawn.push([track, offset + treeOffset, trackHeight]);
                
                offset += trackHeight;
                ctx.translate(0, trackHeight);
            }
        }
         
        ctx.restore();
    };

    /**
     * @method drawTrackWithKeyframes
     * @param {*} ctx
     * ...
     * @description helper function, you can call it from drawContent to render all the keyframes
     */

    drawTrackWithKeyframes( ctx, trackHeight, track ) {

        ctx.font = Math.floor( trackHeight * 0.8) + "px" + Timeline.FONT;
        ctx.textAlign = "left";

        
        if(track.isSelected) {
            ctx.globalAlpha = 0.2 * this.opacity;
            ctx.fillStyle = Timeline.TRACK_SELECTED;
            ctx.fillRect(0, 0, ctx.canvas.width, trackHeight );
        }

        ctx.fillStyle = Timeline.COLOR;
        ctx.globalAlpha = this.opacity;

        const keyframes = track.times;

        if(!keyframes) {
            return;
        }
         
        for(let j = 0; j < keyframes.length; ++j)
        {
            let time = keyframes[j];
            if( time < this.startTime || time > this.endTime ) {
                continue;
            }

            let keyframePosX = this.timeToX( time );
            let size = trackHeight * 0.3;
            
            if(!this.active || track.active == false) {
                ctx.fillStyle = Timeline.COLOR_INACTIVE;
            }
            else if(track.locked) {
                ctx.fillStyle = Timeline.COLOR_LOCK;
            }
            else if(track.hovered[j]) {
                size = trackHeight * 0.45;
                ctx.fillStyle = Timeline.COLOR_HOVERED;
            }
            else if(track.selected[j]) {
                ctx.fillStyle = Timeline.COLOR_SELECTED;
            }
            else if(track.edited[j]) {
                ctx.fillStyle = Timeline.COLOR_EDITED;
            }
            else {
                ctx.fillStyle = Timeline.COLOR;
            }
            
            ctx.save();
            ctx.translate(keyframePosX, trackHeight * 0.5);
            ctx.rotate(45 * Math.PI / 180);		
            ctx.fillRect( -size*0.5, -size*0.5, size, size);
            ctx.restore();
        }

        ctx.globalAlpha = this.opacity;
    }

    // Creates a map for each item -> tracks
    processTracks(animation) {

        this.animationClip = {
            name: (animation && animation.name) ? animation.name : "animationClip",
            duration: animation ? animation.duration : 0,
            speed: (animation && animation.speed ) ? animation.speed : this.speed,
            tracks: [],
            tracksPerItem: {},
            tracksDictionary: {}
        };
        if (animation && animation.tracks) {
            let tracksPerItem = {};
            let tracksDictionary = {};
            for( let i = 0; i < animation.tracks.length; ++i ) {
                
                let track = animation.tracks[i];
                
                const [name, type] = this.getTrackName(track.name);
                
                let valueDim = track.dim;
                if ( !valueDim || valueDim < 0 ){
                    if ( track.times.length && track.values.length ){ valueDim = track.values.length/track.times.length; }
                    else{ valueDim = 1; }
                }

                let leftOver = track.values.length % valueDim; // just in case values has an incorrect length
                let amounEntries = Math.min( track.times.length, track.values.length - leftOver );
                let times = track.times.slice(0, amounEntries); 
                let values = track.values.slice(0, amounEntries * valueDim);
                let boolArray = (new Array(amounEntries)).fill(false);

                let trackInfo = {
                    fullname: track.name,
                    name: name, type: type,
                    active: true,
                    locked: false,
                    dim: valueDim,
                    selected: boolArray.slice(), edited: boolArray.slice(), hovered: boolArray.slice(), 
                    times: times,
                    values: values
                };
                
                if(!tracksPerItem[name]) {
                    tracksPerItem[name] = [trackInfo];
                }else {
                    tracksPerItem[name].push( trackInfo );
                }
                
                const trackIndex = tracksPerItem[name].length - 1;
                trackInfo.idx = trackIndex; // index of track in "name"
                trackInfo.clipIdx = i; // index of track in the entire animation
                
                // Save index also in original track
                track.idx = trackIndex;
                tracksDictionary[track.name] = name; // map original track name with shortened one
                
                this.animationClip.tracks.push(trackInfo);
            }

            this.animationClip.tracksPerItem = tracksPerItem;
            this.animationClip.tracksDictionary = tracksDictionary;
        }
        this.resize();
    }

    /**
     * updates an existing track with new values and times.
     * @param {Integer} trackIdx index of track in the animationClip 
     * @param {*} newTrack object with two arrays: values and times. These will be set to the selected track
     * @returns 
     */
    updateTrack(trackIdx, newTrack) {
        if(!this.animationClip)
            return false;

        const track = this.animationClip.tracks[trackIdx]; 
        track.values = newTrack.values;
        track.times = newTrack.times;

        track.selected = (new Array(track.times.length)).fill(false);
        track.hovered = track.selected.slice();
        track.edited = track.selected.slice();
        return true;
    }

    /**
     * removes equivalent sequential keys either because of equal times or values
     * (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
     * @param {Int} trackIdx index of track in the animation
     * @param {Bool} onlyEqualTime if true, removes only keyframes with equal times. Otherwise, values are ALSO compared through the class threshold
     * @param {Bool} enableEvent if true, triggers "onOptimizeTracks" after optimizing
     */
    optimizeTrack(trackIdx, onlyEqualTime = false, enableEvent = true ) {
        if ( !this.animationClip ){ return; }

        const track = this.animationClip.tracks[trackIdx],
            times = track.times,
            values = track.values,
            stride = track.dim,
            threshold = this.optimizeThreshold;
        let cmpFunction = (v, p, n, t) => { return Math.abs(v - p) >= t || Math.abs(v - n) >= t };
        let lastSavedIndex = 0;
        const lastIndex = times.length-1;

        this.saveState(track.clipIdx);

        for ( let i = 1; i < lastIndex; ++ i ) {

            let keep = false;
            const time = times[ i ];
            const timePrev = times[ lastSavedIndex ];

            // remove adjacent keyframes scheduled at the same time
            if ( time !== timePrev ) {
                if ( ! onlyEqualTime ) {
                    // remove unnecessary keyframes same as their neighbors
                    const offset = i * stride,
                        offsetP = lastSavedIndex * stride,
                        offsetN = offset + stride;

                    for ( let j = 0; j !== stride; ++ j ) {
                        if( cmpFunction(
                            values[ offset + j ], 
                            values[ offsetP + j ], 
                            values[ offsetN + j ],
                            threshold))
                        {
                            keep = true;
                            break;
                        }
                    }
                } else {
                    keep = true;
                }
            }

            // in-place compaction
            if ( keep ) {
                ++lastSavedIndex;
                if ( i !== lastSavedIndex ) {
                    times[ lastSavedIndex ] = times[ i ];
                    const readOffset = i * stride,
                        writeOffset = lastSavedIndex * stride;
                    for ( let j = 0; j !== stride; ++ j ) {
                        values[ writeOffset + j ] = values[ readOffset + j ];
                    }
                }
            }
        }

        // add last frame. first and last keyframes should be always kept
        if ( times.length > 1 ) {
            ++lastSavedIndex;
            times[ lastSavedIndex ] = times[ times.length - 1 ];
            const readOffset = values.length - stride,
                writeOffset = lastSavedIndex * stride;
            for ( let j = 0; j !== stride; ++j ) {
                values[ writeOffset + j ] = values[ readOffset + j ];
            }
        }
        
        // commit changes
        if ( lastSavedIndex < times.length-1 ) {   
            track.times = times.slice( 0, lastSavedIndex + 1 );
            track.values = values.slice( 0, (lastSavedIndex + 1) * stride );
            this.updateTrack( track.clipIdx, track ); // update control variables (hover, edited, selected) 
        } 

        if(this.onOptimizeTracks && enableEvent )
            this.onOptimizeTracks(trackIdx);
    }

    optimizeTracks(onlyEqualTime = false) {

        if(!this.animationClip)
            return;

        // save all states into a single entry
        if ( this.trackStateSaveEnabler ){
            for( let i = 0; i < this.animationClip.tracks.length; ++i ) {
                this.saveState(i, i!=0);
            }
        }

        // disable state saving
        const oldStateEnabler = this.trackStateSaveEnabler;
        this.trackStateSaveEnabler = false;

        // optimize
        for( let i = 0; i < this.animationClip.tracks.length; ++i ) {
            const track = this.animationClip.tracks[i];
            this.optimizeTrack( track.clipIdx, onlyEqualTime, false );
        }

        // restore enabler status
        this.trackStateSaveEnabler = oldStateEnabler;

        // callback
        if(this.onOptimizeTracks )
            this.onOptimizeTracks(-1); // signal as "all tracks"
    }


    getNumTracks( item ) {
        if(!item || !this.animationClip.tracksPerItem)
            return 0;
        const tracks = this.animationClip.tracksPerItem[item.name];
        return tracks ? tracks.length : null;
    }


    onShowOptimizeMenu( e ) {
        
        if(this.selectedItems.length == 0)
            return;

        let tracks = [];
        for(let i = 0; i < this.selectedItems.length; i++) {
            tracks = [...tracks, ...this.animationClip.tracksPerItem[this.selectedItems[i]]];
        }
        if(!tracks.length) return;

        LX.addContextMenu("Optimize", e, m => {
            for( let t of tracks ) {
                m.add( t.name + (t.type ? "@" + t.type : ""), () => { 
                    this.optimizeTrack( t.clipIdx, false);
                })
            }
        });
    }

    /**
     * @param {Number} trackIdx index of track in the animation (not local index) 
     * @param {Bool} combineWithPrevious whether to create a new entry or unify changes into a single undo entry
     */
    saveState( trackIdx, combineWithPrevious = false ) {
        if ( !this.trackStateSaveEnabler ){ return; }

        const trackInfo = this.animationClip.tracks[trackIdx];

        const undoStep = {
                trackIdx: trackIdx,
                t: trackInfo.times.slice(),
                v: trackInfo.values.slice(),
                edited: trackInfo.edited.slice(0, trackInfo.times.length)
        };

        if ( combineWithPrevious && this.trackStateUndo.length ){
            this.trackStateUndo[ this.trackStateUndo.length - 1 ].push( undoStep );
        }
        else{
            this.trackStateUndo.push( [undoStep] );
        }

        if ( this.trackStateUndo.length > this.trackStateMaxSteps ){ this.trackStateUndo.shift(); } // remove first (oldest) element 
        this.trackStateRedo = [];
    }

    #undoRedo(isUndo = true){

        let toBeShown = isUndo ? this.trackStateUndo : this.trackStateRedo;
        let toBeStored = isUndo ? this.trackStateRedo : this.trackStateUndo;

        if (!toBeShown.length){ return false; }

        this.unSelectAllKeyFrames();
        this.unHoverAll();
        
        const combinedState = toBeShown.pop();
        const combinedStateToStore = [];

        for( let i = 0; i < combinedState.length; ++i ){
            const state = combinedState[i];
            const track = this.animationClip.tracks[state.trackIdx];

            // same as savestate
            combinedStateToStore.push({ 
                trackIdx: state.trackIdx,
                t: track.times,
                v: track.values,
                edited: track.edited
            });

            track.times = state.t;
            track.values = state.v;
            track.edited = state.edited;
            if ( track.selected.length < track.times.length ){ track.selected.length = track.times.length; }
            if ( track.hovered.length < track.times.length ){ track.hovered.length = track.times.length; }
            track.selected.fill(false);
            track.hovered.fill(false);

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( state.trackIdx );
        }

        toBeStored.push(combinedStateToStore);

        return true;
    }
    
    undo() { return this.#undoRedo(true); }
    redo() { return this.#undoRedo(false); }

    /**
    * 
    * @param {*} track 
    * @param {Number} srcIdx keyFrame index
    * @param {Number} trgIdx keyFrame index  
    */
    swapKeyFrames(track, srcIdx, trgIdx){
        let times = track.times;
        let values = track.values;

        let tmp = times[srcIdx];
        times[srcIdx] = times[trgIdx];
        times[trgIdx] = tmp;

        tmp = track.hovered[srcIdx];
        track.hovered[srcIdx] = track.hovered[trgIdx];
        track.hovered[trgIdx] = tmp;

        tmp = track.edited[srcIdx];
        track.edited[srcIdx] = track.edited[trgIdx];
        track.edited[trgIdx] = tmp;

        tmp = track.selected[srcIdx];
        track.selected[srcIdx] = track.selected[trgIdx];
        track.selected[trgIdx] = tmp;

        let src = srcIdx * track.dim;
        let end = src + track.dim;
        let trg = trgIdx * track.dim;
        for( ; src < end; ++src ){
            tmp = values[ src ];
            values[ src ] = values[ trg ];
            values[ trg ] = tmp;
            ++trg;
        }
    }

    copySelectedContent() {
        if (!this.lastKeyFramesSelected.length){ 
            return; 
        }

        if(!this.clipboard)
            this.clipboard = {};

        this.clipboard.keyframes = {}; // reset clipboard
        
        // sort keyframes selected by track
        let toCopy = {};
        const tracksPerItem = this.animationClip.tracksPerItem;
        for(let i = 0; i < this.lastKeyFramesSelected.length; i++){
            let [id, localTrackIdx, keyIdx] = this.lastKeyFramesSelected[i];
            let track = tracksPerItem[id][localTrackIdx];
            let trackIdx = track.clipIdx;

            if(toCopy[trackIdx]) {
                toCopy[trackIdx].idxs.push(keyIdx);
            } else {
                toCopy[trackIdx] = {track: track, idxs : [keyIdx]};
            }
            if(i == 0) {
                this.copyKeyFrameValue(track, keyIdx);
            }
        }

        // for each track selected, copy its values
        for(let trackIdx in toCopy) {
            this.copyKeyFrames(toCopy[trackIdx].track, toCopy[trackIdx].idxs);
        }
    }

    // copies the current value of the keyframe. This value can be pasted across any track (as long as they are of the same type)
    copyKeyFrameValue( track, index ) {

        // 1 element clipboard by now
        let start = index * track.dim;
        let values = this.animationClip.tracks[ track.clipIdx ].values.slice(start, start + track.dim);

        if(!this.clipboard)
            this.clipboard = {};

        this.clipboard.value = {
            type: track.type,
            values: values
        };
    }

    // each track will have its own entry of copied keyframes. When pasting, only the apropiate track's keyframes are pasted
    copyKeyFrames( track, indices ) {

        let trackIdx = track.clipIdx;
        if(!this.clipboard)
            this.clipboard = {};
        
        indices.sort( (a,b) => a < b ? -1 : 1 ); // just in case

        let obj = { track: track, values:[], times:[] };

        for(let i = 0; i < indices.length; i++ ){
            let keyIdx = indices[i];
            let start = keyIdx * track.dim;
            let keyValues = track.values.slice(start, start + track.dim); // copy values into a new array
            obj.values.push(keyValues); // save to clipboard
            obj.times.push(track.times[keyIdx]); // save to clipboard
        };

        this.clipboard.keyframes[trackIdx] = obj;
    }

    pasteContent() {
        if(!this.clipboard)
            return false;
        
        // copy the value into the only selected keyframe
        if(this.clipboard.value && this.lastKeyFramesSelected.length == 1) {

            let [id, localTrackIdx, keyIdx] = this.lastKeyFramesSelected[0];
            this.pasteKeyFrameValue({}, this.animationClip.tracksPerItem[id][localTrackIdx], keyIdx);
        }

        // create new keyframes from the ones copied 
        if(this.clipboard.keyframes) {

            for( let trackIdx in this.clipboard.keyframes ){
                let clipboardItem = this.animationClip.tracks[trackIdx].name;
    
                // ensure all tracks are visible
                if ( this.selectedItems.findIndex( (item) => item == clipboardItem ) == -1 ){
                    return false; 
                }
            }

            this.pasteKeyFrames( this.currentTime );
        }

        return true;
    }

    canPasteKeyFrame () {
        return this.clipboard != null;
    }

    #paste( track, index ) {

        let clipboardInfo = this.clipboard.value;

        if(clipboardInfo.type != track.type){
            return;
        }

        let start = index * track.dim;
        let j = 0;
        for(let i = start; i < start + track.dim; ++i) {
            this.animationClip.tracks[ track.clipIdx ].values[i] = clipboardInfo.values[j];
            ++j;
        }

        track.edited[ index ] = true;
    }

    pasteKeyFrameValue( e, track, index ) {

        this.saveState(track.clipIdx);

        // Copy to current key
        this.#paste( track, index );
        
        if(!e || !e.multipleSelection){
            return;
        }
        
        // Don't want anything after this
        this.clearState();

        // Copy to every selected key
        for(let [name, localTrackIdx, keyIndex] of this.lastKeyFramesSelected) {
            this.#paste( this.animationClip.tracksPerItem[name][localTrackIdx], keyIndex );
        }
    }

    pasteKeyFrames( pasteTime = this.currentTime ){
        if ( !this.clipboard.keyframes ){ return false; }

        this.unHoverAll();
        this.unSelectAllKeyFrames();

        pasteTime = this.currentTime;

        let clipboardTracks = this.clipboard.keyframes;
        let globalStart = Infinity;
        for( let trackIdx in clipboardTracks ){
            if ( globalStart > clipboardTracks[trackIdx].times[0] ){
                globalStart = clipboardTracks[trackIdx].times[0];
            }
        }

        if ( globalStart == Infinity ){ return false; }

        for( let trackIdx in clipboardTracks ){
            
            const clipboardInfo = this.clipboard.keyframes[trackIdx];
            const times = clipboardInfo.times; 
            const values = clipboardInfo.values;

            this.saveState(trackIdx);
            let oldTrackStateEnabler = this.trackStateSaveEnabler;
            this.trackStateSaveEnabler = false; // do not save state while in addkeyframe

            for(let i = 0; i < clipboardInfo.times.length; i++) {
                let value = values[i];
                let time = times[i];
                if(typeof value == 'number')
                    value = [value];
                time = time - globalStart + pasteTime;
                this.addKeyFrame( this.animationClip.tracks[trackIdx], value, time );
            }
            
            this.trackStateSaveEnabler = oldTrackStateEnabler;
            
        }

        return true;

    }

    addKeyFrame( track, value = undefined, time = this.currentTime ) {

        if(!track) {
            return -1;
        }

        // Update animationClip information
        const trackIdx = track.clipIdx;
        track = this.animationClip.tracks[trackIdx];

        let newIdx = this.getNearestKeyFrame( track, time ); 
        
        // Time slot with other key?
        if( newIdx > -1 && Math.abs(track.times[newIdx] - time) < 0.001 ) {
            console.warn("There is already a keyframe [", newIdx, "] stored in time slot [", track.times[newIdx], "]");
            return -1;
        }

        this.saveState(trackIdx);

        // Find index that t[idx] > time
        if(newIdx < 0) { 
            newIdx = 0;
        }
        else if ( track.times[newIdx] < time ){ 
            newIdx++; 
        }

        // TODO allow undefined value and compute the interpolation between adjacent keyframes?

        // new arrays
        let times = new Float32Array( track.times.length + 1 );
        let values = new Float32Array( track.values.length + track.dim );

        let valueDim = track.dim;

        // copy times/values before the new index
        for( let i = 0; i < newIdx; ++i ){ 
            times[i] = track.times[i]; 
        }
        for( let i = 0; i < newIdx * valueDim; ++i ){ 
            values[i] = track.values[i]; 
        }

        // new keyframe
        times[newIdx] = time;
        for( let i = 0; i < valueDim; ++i ){ 
            values[newIdx * valueDim + i] = value[i]; 
        }

        // copy remaining keyframes
        for( let i = newIdx; i < track.times.length; ++i ){ 
            times[i+1] = track.times[i]; 
        }
        for( let i = newIdx * valueDim; i < track.values.length; ++i ){ 
            values[i + valueDim] = track.values[i]; 
        }

        // update track pointers
        track.times = times;
        track.values = values;
                    
        // Add new entry into each control array
        track.hovered.splice(newIdx, 0, false);
        track.selected.splice(newIdx, 0, false);
        track.edited.splice(newIdx, 0, true);
    
        // Update animation action interpolation info
        if(this.onUpdateTrack)
            this.onUpdateTrack( trackIdx );

        if ( time > this.duration ){
            this.setDuration(time);
        }
       
        return newIdx;
    }

    deleteSelectedContent() {
        
        this.deleteKeyFrame(null);
    }

    /**
    * Delete a keyframe given the track and the its index
    * @param {Number} trackIdx track that keyframe belongs to 
    * @param {Number} index index of the keyframe on the track
    * @returns 
    */
    #delete( trackIdx, index ) {
        
        const track = this.animationClip.tracks[trackIdx];

        // Don't remove by now the first key (and avoid impossible indices)
        if(index < 1 || index >= track.times.length ) {
            console.warn("Operation not supported! " + (index==0 ?"[removing first keyframe track]":"[removing invalid keyframe " + index + " from " + track.times.length + "]"));
            return false;
        }

        // Delete time key (TypedArrays do not have splice )
        track.times = track.times.filter( (v, i) => i != index);
        track.edited = track.edited.filter( (v, i) => i != index);
        track.selected = track.selected.filter( (v, i) => i != index);
        track.hovered = track.hovered.filter( (v, i) => i != index);

        // Delete values
        const indexDim = track.dim * index;
        const slice1 = track.values.slice(0, indexDim);
        const slice2 = track.values.slice(indexDim + track.dim);

        track.values = LX.UTILS.concatTypedArray([slice1, slice2], Float32Array);

        // Update animation action interpolation info
        if(this.onDeleteKeyFrame)
            this.onDeleteKeyFrame( trackIdx, index );
        
        return true;
    }

    /** Delete one or more keyframes given the triggered event
     * @e: event
     * @track:
     * @index: index of the keyframe on the track
    */
    deleteKeyFrame(track, index) {
        
        if(!track) {
            //*********** WARNING: RELIES ON SORTED lastKeyFramesSelected ***********
            
            // start removing from the last keyframe 
            let prevTrackRemoved = -1;
            for( let i = this.lastKeyFramesSelected.length-1; i > -1; --i ){
                let [trackName, trackLocalIdx, frameIdx, trackIdx] = this.lastKeyFramesSelected[i];
                if ( prevTrackRemoved != trackIdx ){
                    this.saveState(trackIdx, prevTrackRemoved != -1);
                    prevTrackRemoved = trackIdx;
                }
                this.#delete(trackIdx, frameIdx);
            }
            this.lastKeyFramesSelected = [];
        }
        else{
            this.saveState(track.clipIdx);
            this.#delete(track.clipIdx, index);
        }

        this.unSelectAllKeyFrames();
    }

    unSelectItems() {

        if(!this.unSelectAllKeyFrames()) {
            this.selectedItems = [];
            if(this.onItemUnselected)
                this.onItemUnselected();
        }
    }

    /**
     * @param {Array} itemsName 
     */
    setSelectedItems( itemsName ) {

        if(itemsName.constructor !== Array)
        throw("Item name has to be an array!");

        this.unSelectAllKeyFrames();
        this.unHoverAll();

        this.selectedItems = [];
        for( let i = 0; i < itemsName.length; ++i ){
            if ( this.animationClip.tracksPerItem[itemsName[i]] ){
                this.selectedItems.push(itemsName[i]);
            }
        }
        this.updateLeftPanel();
    }

    getTrack( trackInfo )  {
        const [name, localTrackIndex] = trackInfo;
        return this.animationClip.tracksPerItem[ name ][localTrackIndex];
    }

    getTrackName( uglyName ) {

        let name, type;

        // Support other versions
        if(uglyName.includes("[")) {
            const nameIndex = uglyName.indexOf('['),
                trackNameInfo = uglyName.substr(nameIndex+1).split("].");
            name = trackNameInfo[0];
            type = trackNameInfo[1];
        }else {
            const trackNameInfo = uglyName.split(".");
            name = trackNameInfo[0];
            type = trackNameInfo[1];
        }

        return [name, type];
    }


    /**
     * Binary search. Relies on track.times being a sorted array
     * @param {object} track 
     * @param {number} time 
     * @param {number} mode on of the possible values 
     *  - -1 = nearest frame with t[f] <= time 
     *  - 0 = nearest frame 
     *  - 1 = nearest frame with t[f] >= time
     * @returns a zero/positive value if successful. On failure returnes -1 meaning either there are no frames (0), no frame-time is lower (-1) or no frame-time is higher (1)
     */
    getNearestKeyFrame( track, time, mode = 0 ) {

        if(!track || !track.times || !track.times.length)
            return -1;

        //binary search
        const times = track.times;
        let min = 0, max = times.length - 1;
        
        // edge cases
        if ( times[min] > time ){
            return mode == -1 ? -1 : 0;
        }
        if ( times[max] < time ){
            return mode == 1 ? -1 : max;
        }
        
        // time is between first and last frame
        let half = Math.floor( ( min + max ) / 2 );
        while ( min < half && half < max ){
            if ( time < times[half] ){ max = half; }
            else{ min = half; }
            half = Math.floor( ( min + max ) / 2 );
        }

        if (mode == 0 ){
            return Math.abs( time - times[min] ) < Math.abs( time - times[max] ) ? min : max;
        }
        else if ( mode == -1 ){
            return times[max] == time ? max : min;
        }
        return times[min] == time ? min : max;
    }

    /**
     * get the nearest keyframe to "time" given a maximum threshold. 
     * @param {object} track 
     * @param {number} time 
     * @param {number} threshold must be positive value
     * @returns returns a postive/zero value if there is a frame inside the threshold range. Otherwise, -1
     */
    getCurrentKeyFrame( track, time, threshold = 0.0 ) {

        if(!track || !track.times.length)
            return -1;

        let frame = this.getNearestKeyFrame( track, time );
        if ( frame > -1 ){
            frame = Math.abs(track.times[frame] - time) > threshold ? -1 : frame;
        }

        return frame;
    }

    /**
     * Returns the interval of frames between minTime and maxTime (both included)
     * @param {object} track 
     * @param {number} minTime 
     * @param {number} maxTime 
     * @param {number} threshold must be positive value 
     * @returns an array with two values [ minFrame, maxFrame ]. Otherwise null 
     */
    getKeyFramesInRange( track, minTime, maxTime, threshold = 0.0 ) {

        if(!track || !track.times.length)
            return null;

        // Manage negative selection
        if(minTime > maxTime) {
            let aux = minTime;
            minTime = maxTime;
            maxTime = aux;
        }

        const minFrame = this.getNearestKeyFrame( track, minTime - threshold, 1 );
        const maxFrame = this.getNearestKeyFrame( track, maxTime + threshold, -1 );

        if ( maxFrame == -1 || minFrame == -1 ){ return null; }

        return [minFrame, maxFrame];
    }

    unHoverAll(){
        if(this.lastHovered) {
            this.animationClip.tracksPerItem[ this.lastHovered[0] ][ this.lastHovered[1] ].hovered[ this.lastHovered[2] ] = false;
        }
        let h = this.lastHovered;
        this.lastHovered = null;
        return h;
    }

    unSelectAllKeyFrames() {

        for(let [name, localTrackIdx, keyIndex] of this.lastKeyFramesSelected) {
            this.animationClip.tracksPerItem[name][localTrackIdx].selected[keyIndex] = false;
        }

        // Something has been unselected
        const unselected = this.lastKeyFramesSelected.length > 0;
        this.lastKeyFramesSelected.length = 0;
        return unselected;
    }
    
    isKeyFrameSelected( track, index ) {
        return track.selected[ index ];
    }
    
    /**
     * @param {object} track track of animation clip (object not index)
     * @param {int} frameIdx frame (index) to select inside the track 
     * @param {bool} unselectPrev if true, unselects previously selected frames. Otherwise, stacks the new selection
     * @returns 
     */
    selectKeyFrame( track, frameIdx, unselectPrev = true ) {        
        if( !track || track.locked || !track.active )
            return false;

        if ( unselectPrev ){
            this.unSelectAllKeyFrames();
        }

        if ( track.selected[frameIdx] ){
            return false;
        }

        // [ track name string, track idx in item, keyframe, track idx in animation, keyframe time]
        let selection = [track.name, track.idx, frameIdx, track.clipIdx, track.times[frameIdx]];
        const trackIdx = track.clipIdx;

        // sort lastkeyframeselected ascending order (track and frame)
        let i = 0;
        for( ; i < this.lastKeyFramesSelected.length; ++i){
            let s = this.lastKeyFramesSelected[i];
            if(s[3] > trackIdx || (s[3] == trackIdx && s[2] > frameIdx)){
                break;
            }
        }
        this.lastKeyFramesSelected.splice( i, 0, selection );
        track.selected[frameIdx] = true;

        return selection;
    }

    unSelectKeyFrame( track, frameIdx ){
        if( !track || track.locked || !track.active )
            return false;
        
        if ( !track.selected[frameIdx] ){
            return false;
        }
        track.selected[frameIdx] = false;
        
        const localTrackIdx = track.idx;
        for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
            let sk = this.lastKeyFramesSelected[i];
            if ( sk[1] == localTrackIdx && sk[2] == frameIdx ){ 
                this.lastKeyFramesSelected.splice(i, 1);
                break;
            }
        }

        return true;
    }

    getNumKeyFramesSelected() {
        return this.lastKeyFramesSelected.length;
    }

    processCurrentKeyFrame( e, keyFrameIndex, track, localX, multiple ) {

        if(track.locked)
            return;

        e.multipleSelection = multiple;
        if(!multiple && e.button != 2) {
            this.unSelectAllKeyFrames();
        }

        keyFrameIndex = keyFrameIndex ?? this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );   
        if(keyFrameIndex < 0)
            return;

        const name = this.animationClip.tracksDictionary[track.fullname];
        let t = this.animationClip.tracksPerItem[ name ][track.idx];
        
        const currentSelection = this.selectKeyFrame(t, keyFrameIndex, !multiple); // changes time 

        if( !multiple ) {
            this.setTime(this.animationClip.tracks[t.clipIdx].times[ keyFrameIndex ]);
        }  
        if( this.onSelectKeyFrame && this.onSelectKeyFrame(e, currentSelection)) {
            // Event handled
            return;
        }        
          
    }

    /**
     * @method addNewTrack
     */

    addNewTrack() {

        if(!this.animationClip)
            this.animationClip = {tracks:[]};

        let trackInfo = {
            idx: this.animationClip.tracks.length,
            values: [], times: [],
            selected: [], edited: [], hovered: []
        };

        this.animationClip.tracks.push(trackInfo);
        this.updateLeftPanel();
        return trackInfo.idx;
    }

    /**
     * @method clearTrack
     */
    clearTrack(idx, defaultValue) {

        let track =  this.animationClip.tracks[idx];

        if(track.locked )
        {
            return;
        }

        this.unHoverAll();
        this.unSelectAllKeyFrames();

        this.saveState(track.clipIdx);
        const count = track.times.length;
        for(let i = count - 1; i >= 0; i--)
        {
            this.#delete(track.clipIdx, i);
        } 
        if(defaultValue != undefined) {
            if(typeof(defaultValue) == 'number')  {
                track.values[0] = defaultValue;
            }
            else {
                for(let i = 0; i < defaultValue.length; i++) {
                    track.values[i] = defaultValue[i];
                }
            }

        }
        return idx;
    }
}

LX.KeyFramesTimeline = KeyFramesTimeline;

/**
 * @class ClipsTimeline
 */

class ClipsTimeline extends Timeline {

    /**
     * @param {string} name 
     * @param {object} options = {animationClip, selectedItems, x, y, width, height, canvas, trackHeight}
     */
    constructor(name, options = {}) {

        super(name, options);
                    
        this.addNewTrack();
        this.lastClipsSelected = [];
        this.lastTrackClipsMove = 0; // vertical movement of clips, onMouseMove onMousedown
    }

    updateLeftPanel(area) {

        let scrollTop = 0;
        if(this.leftPanel){
            scrollTop = this.leftPanel.root.children[1].scrollTop;
            this.leftPanel.clear();
        }
        else {
            this.leftPanel = area.addPanel({className: 'lextimelinepanel', width: "100%", height: "100%"});
        }

        let panel = this.leftPanel;
        
        panel.sameLine(2);

        let titleWidget = panel.addTitle("Tracks");
        let title = titleWidget.root;
        if(!this.disableNewTracks) 
        {
            panel.addButton("addTrackBtn", '<i class = "fa-solid fa-plus"></i>', (value, event) => {
                this.addNewTrack();
            }, { hideName: true, title: "Add Track" });
        }
        panel.endLine();
        const styles = window.getComputedStyle(title);
        const titleHeight = title.clientHeight + parseFloat(styles['marginTop']) + parseFloat(styles['marginBottom']);
        let p = new LX.Panel({height: "calc(100% - " + titleHeight + "px)"});

        let treeTracks = [];
        if(this.animationClip)  {

            for(let i = 0; i < this.animationClip.tracks.length; i++ ) {
                let track = this.animationClip.tracks[i];
                treeTracks.push( {
                    'id': track.name ?? "Track_" + track.idx.toString(),
                    'name': track.name,
                    'skipVisibility': this.skipVisibility,     
                    'visible': track.active,  
                    // 'selected' : track.isSelected                
                } );
                              
            }

        }
        this.leftPanelTrackTreeWidget = p.addTree(null, treeTracks, {filter: false, rename: false, draggable: false, onevent: (e) => {
            switch(e.type) {
                case LX.TreeEvent.NODE_SELECTED:
                    this.selectTrack( parseInt( e.node.id.split("Track_")[1] ) );
                    break;
                case LX.TreeEvent.NODE_VISIBILITY:    
                    this.changeTrackVisibility(parseInt( e.node.id.split("Track_")[1] ), e.value);
                    break;
                case LX.TreeEvent.NODE_CARETCHANGED:
                    this.changeTrackDisplay(parseInt( e.node.id.split("Track_")[1] ), e.node.closed);
                    break;
            }
        }});
        panel.attach(p.root)
        p.root.style.overflowY = "scroll";
        p.root.addEventListener("scroll", (e) => {
            if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight){
                this.currentScroll = e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
            }
            else{
                this.currentScroll = 0;
            }
        })
       
        this.leftPanel.root.children[1].scrollTop = scrollTop;

        if(this.leftPanel.parent.root.classList.contains("hidden") || !this.root.root.parent)
            return;
        this.resizeCanvas([ this.root.root.clientWidth - this.leftPanel.root.clientWidth  - 8, this.size[1]]);
    }

    unSelectAllTracks() {
        
        for(let t = 0; t < this.animationClip.tracks.length; t++) {
            this.animationClip.tracks[t].isSelected = false;
        }    
    }

    unHoverAll(){
        if(this.lastHovered){
            this.animationClip.tracks[ this.lastHovered[0] ].hovered[ this.lastHovered[1] ] = false;
        }
        let h = this.lastHovered;
        this.lastHovered = null;
        return h;
    }

    onMouseUp( e ) {
        
        let track = e.track;
        let localX = e.localX;
        let discard = e.discard; // true when too much time has passed between Down and Up

        if(e.shiftKey) {

            // Manual Multiple selection
            if(!discard) {
                if ( track ){
                    let clipIndex = this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                    if ( clipIndex > -1 ){
                        track.selected[clipIndex] ? 
                            this.unselectClip( track, clipIndex, null ) :
                            this.selectClip( track, clipIndex, null, false );
                    }
                }
            }
            // Box selection
            else if (this.boxSelection){
                
                let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                
                for(let t of tracks) {
                    let clipsIndices = this.getClipsInRange(t, 
                        this.xToTime( this.boxSelectionStart[0] ), 
                        this.xToTime( this.boxSelectionEnd[0] ),
                        this.pixelsToSeconds * 5);
                        
                    if(clipsIndices) {
                        for(let index of clipsIndices)
                            this.selectClip( t, index, null, false );
                    }
                }
            }

        }
        else {

            let boundingBox = this.canvas.getBoundingClientRect()
            if(e.y < boundingBox.top || e.y > boundingBox.bottom)
                return;

            // Check exact track clip
            if(!discard && track) {
                if(e.button!=2){
                    this.selectClip( track, null, localX );
                }
            } 
            
        }
        this.movingKeys = false;
    }

    onMouseDown( e, time ) {
        // function not called if shift is pressed (boxselection)
        let localX = e.localX;
        let localY = e.localY;
        let track = e.track;
        
        if(e.ctrlKey && track) { // move clips
            
            let x = e.offsetX;
            let selectedClips = [];

            // clip selection is done on MouseUP
            selectedClips = this.lastClipsSelected;

            this.canvas.style.cursor = "grab";  
            let curTrackIdx = -1;

            this.lastTrackClipsMove = Math.floor( (e.localY - this.topMargin + this.leftPanel.root.children[1].scrollTop) / this.trackHeight );

            for(let i = 0; i < selectedClips.length; i++)
            {
                this.movingKeys = false
                let [trackIndex, clipIndex] = selectedClips[i];
                const clip = this.animationClip.tracks[trackIndex].clips[clipIndex];

                let endingX = this.timeToX( clip.start + clip.duration );
            
                if(Math.abs( endingX - x ) < 5 ) {
                    this.dragClipMode = "duration";
                    this.canvas.style.cursor = "column-resize";
                }
                else {
                    this.dragClipMode = "move";
                }

                //*********** WARNING: RELIES ON SORTED lastClipsSelected ***********
                if(curTrackIdx != trackIndex){
                    this.saveState(trackIndex, curTrackIdx != -1 );
                    curTrackIdx = trackIndex;
                }
            }

        }
        else if( !track || track && this.getCurrentContent(track, time, 0.001) == -1) { // clicked on empty space
            this.unSelectAllClips();
            if(this.onSelectClip)
                this.onSelectClip(null);
        }
        else if (track && (this.dragClipMode == "duration" || this.dragClipMode == "fadein" || this.dragClipMode == "fadeout" )) { // clicked while mouse was over fadeIn, fadeOut, duration
            this.selectClip( track, null, localX ); // select current clip if any (unselect others)
            if ( this.lastClipsSelected.length ){ 
                this.saveState(track.idx);
            }
        }
    }

    onMouseMove( e, time ) {
        // function not called if shift is pressed (boxselection)

        if ( this.grabbingTimeBar || this.grabbingScroll ){
            return;
        }
        else if(this.grabbing && e.buttons != 2) {
            this.unHoverAll();

            let delta = time - this.grabTime;
            this.grabTime = time;
            if ( time < 0 && delta > 0 ){ delta = 0; }
           
            if ( this.dragClipMode != "move" && this.lastClipsSelected.length == 1 ){ // change fade and duration of clips
                this.movingKeys = true;

                const track = this.animationClip.tracks[this.lastClipsSelected[0][0]]; 
                let clip = track.clips[this.lastClipsSelected[0][1]];
                if( this.dragClipMode == "fadein" ) {
                    clip.fadein = Math.min(Math.max(clip.fadein + delta, clip.start), clip.fadeout);
                }
                else if( this.dragClipMode == "fadeout" ) {
                    clip.fadeout = Math.max(Math.min(clip.fadeout + delta, clip.start+clip.duration), clip.fadein);
                }
                else if( this.dragClipMode == "duration" ) {
                    let duration = Math.max(0, clip.duration + delta);
                    if ( this.lastClipsSelected[0][1] < track.clips.length-1 ){ // max next clip's start
                        duration = Math.min( track.clips[this.lastClipsSelected[0][1] + 1].start - clip.start - 0.0001, duration );
                    }
                    clip.duration = duration;
                    clip.fadeout = Math.max(Math.min((clip.fadeout ?? (clip.start+clip.duration)) + delta, clip.start+clip.duration), clip.start);
                    clip.fadein = Math.max(Math.min((clip.fadein ?? (clip.start+clip.duration)), (clip.fadeout ?? (clip.start+clip.duration))), clip.start);
                    if(this.duration < clip.start + clip.duration){
                        this.setDuration(clip.start + clip.duration);
                    }
                }
                if(this.onContentMoved) { // content changed
                    this.onContentMoved(clip, 0);
                }
            } 
            else if ( this.dragClipMode == "move" && this.lastClipsSelected.length ) { // move clips
                //*********** WARNING: RELIES ON SORTED lastClipsSelected ***********

                this.movingKeys = true;

                let newTrackClipsMove = Math.floor( (e.localY - this.topMargin + this.leftPanel.root.children[1].scrollTop) / this.trackHeight );

                // move clips vertically
                if ( e.altKey ){  
                    let deltaTracks = newTrackClipsMove - this.lastTrackClipsMove;

                    if ( this.lastClipsSelected[0][0] + deltaTracks < 0 ){
                        deltaTracks = -this.lastClipsSelected[0][0];
                    }

                    // if no movement of tracks, do not check
                    if ( deltaTracks != 0 ){ 

                        // check if ALL selected clips can move track
                        for( let i = 0; i < this.lastClipsSelected.length; ++i ){
                            const track = this.animationClip.tracks[ this.lastClipsSelected[i][0] ];
                            const newTrack = this.animationClip.tracks[ this.lastClipsSelected[i][0] + deltaTracks ];
                            const clip = track.clips[ this.lastClipsSelected[i][1] ];

                            const clipsInRange = this.getClipsInRange(newTrack, clip.start, clip.start+clip.duration, 0.0001) 
                            if ( clipsInRange ){
                                for( let c = 0; c < clipsInRange.length; ++c ){
                                    if ( !newTrack.selected[clipsInRange[c]] ){ 
                                        // at least one clip cannot move, abort
                                        c = clipsInRange.length;
                                        i = this.lastClipsSelected.length;
                                        deltaTracks = 0; 
                                        newTrackClipsMove = this.lastTrackClipsMove;
                                    }
                                }
                            }
                        }

                        // if movement was not canceled
                        if ( deltaTracks != 0 ){                        
                            let oldStateEnabler = this.trackStateSaveEnabler;
                            this.trackStateSaveEnabler = false;

                            const selectedClips = this.lastClipsSelected;
                            this.lastClipsSelected = []; // avoid delete and addclips index reassignment loop (not necessary because of order of operations in for)

                            for( let i = selectedClips[selectedClips.length-1][0] + deltaTracks - this.animationClip.tracks.length + 1; i > 0; --i ){
                                this.addNewTrack(i == 1);
                            }

                            // selected clips MUST be ordered (ascendently) 
                            let startSel = deltaTracks > 0 ? selectedClips.length - 1 : 0;                        
                            let endSel = startSel;
                            let currTrack = selectedClips[startSel][0];

                            // i <= length; to update last track. Otherwise a check outside of for would be needed
                            for( let i = 1; i <= selectedClips.length; ++i ){ 

                                let idx = deltaTracks > 0 ? (selectedClips.length -1 - i) : i;                            
                                if( i == selectedClips.length || selectedClips[idx][0] != currTrack ){

                                    const newTrackIdx = currTrack + deltaTracks;
                                    const newTrack = this.animationClip.tracks[ newTrackIdx ];
                                    const track = this.animationClip.tracks[currTrack ];
                                    
                                    // save track state if necessary
                                    const undoState = this.trackStateUndo[this.trackStateUndo.length-1];
                                    let state = 0
                                    for( ; state < undoState.length; ++state ){
                                        if ( newTrackIdx == undoState[state].trackIdx ){ break; }
                                    }
                                    if ( state == undoState.length ){ 
                                        this.trackStateSaveEnabler = true;
                                        this.saveState(newTrackIdx, true);
                                        this.trackStateSaveEnabler = false;
                                    }
                                    
                                    // add clips of a track, from first to last
                                    for( let c = startSel; c <= endSel; ++c ){
                                        let newClipIdx = this.addClip(track.clips[ selectedClips[c][1] ], newTrackIdx, 0);
                                        selectedClips[c][0] = newClipIdx; // temporarily store new clip index in trackIndex (HACK START)
                                        newTrack.selected[newClipIdx] = true;
                                    }

                                    // delete clips of a track, from last to first 
                                    for( let c = endSel; c >=startSel ; --c ){
                                        this.#delete(currTrack, selectedClips[c][1]);
                                        selectedClips[c][1] = selectedClips[c][0]; // put new clip index (HACK)
                                        selectedClips[c][0] = newTrackIdx; // put new track index (HACK FIX)
                                    }

                                    currTrack = i < selectedClips.length ? selectedClips[idx][0] : -1;
                                    startSel = idx;
                                    endSel = idx;
                                    continue;
                                }
                                
                                deltaTracks > 0 ? startSel = idx : endSel = idx;
                            }

                            this.lastClipsSelected = selectedClips;
                            this.trackStateSaveEnabler = oldStateEnabler;
                        }
                    }
                }
                this.lastTrackClipsMove = newTrackClipsMove;

                // move clips horizontally

                let leastDelta = delta;
                let moveAccepted = true;

                // find if all clips can move and/or how much they can move
                for( let i = 0; i < this.lastClipsSelected.length; ++i ){
                    let trackIdx = this.lastClipsSelected[i][0];
                    let clipIdx = this.lastClipsSelected[i][1];
                    const track = this.animationClip.tracks[trackIdx];
                    const trackClips = track.clips;
                    const clip = track.clips[clipIdx];

                    if ( delta >= 0 ){
                        if ( trackClips.length-1 == clipIdx ){ continue; } // all alowed
                        if ( !track.selected[clipIdx+1] ){ // if next is selected, force AllOrNothing and let next clip manage the leastDelta
                            if( trackClips[clipIdx + 1].start >= (clip.start+clip.duration+delta) ){ continue; } //has not reached next clip. Enough space. All allowed
                            const nextClip = trackClips[clipIdx + 1];
                            leastDelta = Math.max( 0, Math.min( leastDelta,  nextClip.start - clip.start - clip.duration ) );
                        }
                    }
                    else if ( delta < 0 ){
                        if ( clipIdx > 0 && (trackClips[clipIdx - 1].start + trackClips[clipIdx - 1].duration) <= (clip.start+delta) ){ continue; } // has not reached previous clip. Enough space
                        if( clipIdx > 0 ){
                            const prevClip = trackClips[clipIdx - 1];
                            leastDelta = Math.min( 0, Math.max( leastDelta,  prevClip.start + prevClip.duration - clip.start ) ); // delta is a negative value, that is why the leastDelta is the max
                        }
                        if ( clip.start + delta < 0 ){ 
                            leastDelta = Math.max(leastDelta, -clip.start);
                            moveAccepted = false; // force it to be a leastDelta move only. No jumps
                        }
                    }

                    if( !moveAccepted ){ continue; }
                    let clipsInRange = this.getClipsInRange(track, clip.start + delta, clip.start + clip.duration + delta, 0.01); 
                    if ( clipsInRange && (clipsInRange[0] != clipIdx || clipsInRange[clipsInRange.length-1] != clipIdx)){
                        for( let c = 0; c < clipsInRange.length; ++c ){
                            if ( !track.selected[clipsInRange[c]] ){ moveAccepted = false; break; }
                        }
                    }
                }

                // if moveAccepted -> use full delta
                // if !moveAccepted -> use leastDelta
                if ( moveAccepted ){ leastDelta = delta; }
                this.grabTime = time - delta + leastDelta;


                //*********** WARNING: RELIES ON SORTED lastClipsSelected ***********
                // move all selected clips using the computed delta. 
                for( let i = 0; i < this.lastClipsSelected.length; ++i ){
                    const lcs = this.lastClipsSelected[ delta > 0 ? (this.lastClipsSelected.length - 1 - i) : i]; //delta > 0, move last-to-first; delta < 0, move first-to-last
                    const track = this.animationClip.tracks[lcs[0]];
                    const trackClips = track.clips;
                    let clipIdx = lcs[1];
                    const clip = track.clips[clipIdx];
                    clip.start += leastDelta;
                    clip.fadein += leastDelta;
                    clip.fadeout += leastDelta;

                    // prepare swap
                    const editedFlag = track.edited[clipIdx]; 
                    const selectedFlag = track.selected[clipIdx]; 
                    const hoveredFlag = track.hovered[clipIdx]; 

                    // move other clips
                    if ( delta > 0 ){
                        while( clipIdx < trackClips.length-1 ){
                            if ( trackClips[clipIdx+1].start >= clip.start ){
                                break;
                            }
                            trackClips[clipIdx] = trackClips[clipIdx+1];
                            track.selected[clipIdx] = track.selected[clipIdx+1];
                            track.edited[clipIdx] = track.edited[clipIdx+1];
                            track.hovered[clipIdx] = track.hovered[clipIdx+1];
                            clipIdx++;
                        }
                    }else{
                        while( clipIdx > 0 ){
                            if ( trackClips[clipIdx-1].start <= clip.start ){
                                break;
                            }
                            trackClips[clipIdx] = trackClips[clipIdx-1];
                            track.selected[clipIdx] = track.selected[clipIdx-1];
                            track.edited[clipIdx] = track.edited[clipIdx-1];
                            track.hovered[clipIdx] = track.hovered[clipIdx-1];
                            clipIdx--;
                        }
                    }    
                    // commit swap
                    trackClips[clipIdx] = clip;
                    track.edited[clipIdx] = editedFlag; 
                    track.selected[clipIdx] = selectedFlag; 
                    track.hovered[clipIdx] = hoveredFlag; 

                    // update selected clip index
                    lcs[1] = clipIdx;

                    if ( clip.start + clip.duration > this.duration ){
                        this.setDuration( clip.start + clip.duration );
                    }
                    if(this.onContentMoved) {
                        this.onContentMoved(clip, leastDelta);
                    }
                }
            }
            
            return true;
        } 
        else if(e.track && e.buttons == 0) { // mouse not dragging, just hovering

            this.unHoverAll();
            let clips = this.getClipsInRange(e.track, time, time, 0.1)
            if(!e.track.locked && clips) {
                                
                this.lastHovered = [e.track.idx, clips[0]];
                e.track.hovered[clips[0]] = true;

                let clip = e.track.clips[clips[0]];
                if(!clip) {
                    return;
                }
                
                const durationX = this.timeToX(clip.start + clip.duration);
                const fadeinX = this.timeToX(clip.fadein);
                const fadeoutX = this.timeToX(clip.fadeout);
                if(Math.abs(e.localX - durationX) < 8) {
                    this.canvas.style.cursor = "col-resize";
                    this.dragClipMode = "duration";
                }
                else if(Math.abs(e.localX - fadeinX) < 8) {
                    this.canvas.style.cursor = "e-resize";
                    this.dragClipMode = "fadein";
                }
                else if(Math.abs(e.localX - fadeoutX) < 8) {
                    this.canvas.style.cursor = "e-resize";
                    this.dragClipMode = "fadeout";
                }
                else {
                    this.dragClipMode = "";
                }
            }
        }
        else {
            this.unHoverAll(); 
        }

    }

    onDblClick( e ) {
        
        let track = e.track;
        let localX = e.localX;

        this.selectClip(track, null, localX); // unselect and try to select clip in localX, if any
    }

    showContextMenu( e ) {

        e.preventDefault();
        e.stopPropagation();

        let actions = [];
        if(this.lastClipsSelected.length) {
            actions.push(
                {
                    title: "Copy",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                    callback: () => { this.copySelectedContent();}
                }
            )
            actions.push(
                {
                    title: "Delete",// + " <i class='bi bi-trash float-right'></i>",
                    callback: () => {
                        this.deleteSelectedContent({});
                        // this.optimizeTracks();
                    }
                }
            )
        }
        else{
            
            if(this.clipboard)
            {
                actions.push(
                    {
                        title: "Paste",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {
                            this.pasteContent();
                        }
                    }
                )
            }
        }
        
        LX.addContextMenu("Options", e, (m) => {
            for(let i = 0; i < actions.length; i++) {
                m.add(actions[i].title,  actions[i].callback )
            }
        });

    }

    drawContent( ctx )  {

        if(!this.animationClip || !this.animationClip.tracks)  
            return;
        
        const tracks = this.animationClip.tracks;          
        const trackHeight = this.trackHeight;
        const scrollY = - this.currentScrollInPixels;
        
        ctx.save();
        for(let i = 0; i < tracks.length; i++) {
            let track = tracks[i];
            this.drawTrackWithBoxes(ctx, i * trackHeight + scrollY, trackHeight, track.name || "", track);
        }
        
        ctx.restore();
      
    }

    // Creates a map for each item -> tracks
    processTracks(animation) {

        this.animationClip = {
            name: (animation && animation.name) ? animation.name : "animationClip",
            duration: animation ? animation.duration : 0,
            speed: (animation && animation.speed ) ? animation.speed : this.speed,
            tracks: []
        };

        if (animation && animation.tracks){
            for( let i = 0; i < animation.tracks.length; ++i ) {
    
                let track = animation.tracks[i];
                let arr = [];
                arr.length = track.clips.length;
                arr.fill( false );

                let trackInfo = {
                    idx: this.animationClip.tracks.length,
                    clips: track.clips,
                    selected: arr.slice(), edited: arr.slice(), hovered: arr, 
                    active: true,
                    isSelected: false,
                    // locked: false,
                };    
                this.animationClip.tracks.push(trackInfo);
            }
        }
        else {
            this.addNewTrack();
        }
    }

    /**
     * @method optimizeTrack
     */
    optimizeTrack(trackIdx) {	
    }

    /**
     * @method optimizeTracks
     */
    optimizeTracks() {
    }

   /**
    * 
    * @param {obj} clip  clip to be added
    * @param {int} trackIdx (optional) track where to put the clip. -1 will find the first free slot. ***WARNING*** Must call getClipsInRange, before calling this function with a valid trackdIdx
    * @param {float} offsetTime (optional) offset time of current time
    * @returns  a zero/positive value if successful. Otherwise, -1
    */
    addClip( clip, trackIdx = -1, offsetTime = 0 ) {
        if ( !this.animationClip ){ return -1; }

        // Update clip information
        let newStart = clip.start + offsetTime;
        if(clip.fadein != undefined)
            clip.fadein += (newStart - clip.start);
        if(clip.fadeout != undefined)
            clip.fadeout += (newStart - clip.start);
        clip.start = newStart;

        // find appropriate track
        if ( trackIdx >= this.animationClip.tracks.length ){ // new track ad the end
            trackIdx = this.addNewTrack();
        }
        else if ( trackIdx < 0 ){ // find first free track slot
            for(let i = 0; i < this.animationClip.tracks.length; i++) {
                let clipInCurrentSlot = this.animationClip.tracks[i].clips.find( t => { 
                    return LX.UTILS.compareThresholdRange(newStart, clip.start + clip.duration, t.start, t.start+t.duration);                
                });
    
                if(!clipInCurrentSlot){
                    trackIdx = i;
                    break;
                }
                console.warn("There is already a clip stored in time slot ", clipInCurrentSlot)
            }
            if(trackIdx < 0){
                trackIdx = this.addNewTrack();
            }
        }else{ // check specific track slot
            // commented to avoid double checks with "addclips" fn
            // let clipsInRange = this.getClipsInRange(this.animationClip.tracks[trackIdx], clip.start, clip.start+clip.duration, 0.0001);
            // if ( clipsInRange ){
            //     return -1;
            // }
        }

        const track = this.animationClip.tracks[trackIdx];

        // Find new index
        let newIdx = track.clips.findIndex( t => t.start > newStart );

        // Add as last index
        if(newIdx < 0) {
            newIdx = track.clips.length;
        }
        
        //Save track state before add the new clip
        this.saveState(trackIdx);

        // Add clip
        track.clips.splice(newIdx, 0, clip); //insert clip into newIdx (or push at the end)

        // Reset this clip's properties
        track.hovered.splice(newIdx, 0, false);
        track.selected.splice(newIdx, 0, false);
        track.edited.splice(newIdx, 0, false);

        if( !this.animationClip.duration || (clip.start + clip.duration) > this.duration ){
            this.setDuration(clip.start + clip.duration);
        }

        // Update animation action interpolation info
        if(this.onUpdateTrack){
            this.onUpdateTrack( trackIdx );
        }

        return newIdx;
    }


    /** Add an array of clips to the timeline in the first free track at the current time
     * @clips: clips to be added
     * @offsetTime: (optional) offset time of current time
    */

    addClips( clips, offsetTime = 0 ){
        if( !this.animationClip || !clips.length ){ return false; }

        let clipTrackIdxs = new Int16Array( clips.length );
        let baseTrackIdx = -1;
        let currTrackIdx = -1;
        const tracks = this.animationClip.tracks;
        const lastTrackLength = tracks.length;
        let c = 0;
        for( ; c < clips.length; ++c ){
            const clip = clips[c];
            const clipStart = clip.start + offsetTime;
            const clipEnd = clipStart + clip.duration;
            if ( c == 0 ){ // last search failed, move one track down and check again
                ++baseTrackIdx; 
                currTrackIdx = baseTrackIdx;
                if ( currTrackIdx >= tracks.length ){ this.addNewTrack(false); }
                let clipsInCurrentSlot = tracks[baseTrackIdx].clips.find( t => { return LX.UTILS.compareThresholdRange(clipStart, clipEnd, t.start, t.start+t.duration); });
                
                // reset search
                if (clipsInCurrentSlot){ 
                    c = -1;
                    continue;
                }

                // success
                clipTrackIdxs[c] = baseTrackIdx;
            }else{

                // check if it fits in current track
                let clipsInCurrentSlot = tracks[currTrackIdx].clips.find( t => { return LX.UTILS.compareThresholdRange(clipStart, clipEnd, t.start, t.start+t.duration); });
                
                // check no previous added clips are in the way
                for( let i = c-1; i > -1; --i ){
                    if ( clipTrackIdxs[i] != currTrackIdx || clipsInCurrentSlot ){ break; }
                    clipsInCurrentSlot = LX.UTILS.compareThresholdRange(clipStart, clipEnd, clips[i].start + offsetTime, clips[i].start + offsetTime + clips[i].duration);
                }

                // check if it fits in the next track
                if ( clipsInCurrentSlot ){
                    ++currTrackIdx;
                    if ( currTrackIdx >= tracks.length ){ this.addNewTrack(false); }
                    clipsInCurrentSlot = tracks[currTrackIdx].clips.find( t => { return LX.UTILS.compareThresholdRange(clipStart, clipEnd, t.start, t.start+t.duration); });
                }
                
                // reset search
                if ( clipsInCurrentSlot ){ 
                    c = -1; 
                    continue; 
                }

                // success
                clipTrackIdxs[c] = currTrackIdx;
            }
        }

        // avoid updating panel on each new track. Instead just once at the end
        if ( lastTrackLength != tracks.length ){
            this.updateLeftPanel();
        }

        // save state for all to-be-modified tracks
        for( let i = baseTrackIdx; i <= currTrackIdx; ++i ){
            this.saveState( i, i != baseTrackIdx );
        }

        // disable trackState
        let oldStateEnabler = this.trackStateSaveEnabler;
        this.trackStateSaveEnabler = false;

        for( c = 0; c < clips.length; ++c ){
            this.addClip(clips[c], clipTrackIdxs[c], offsetTime);
        } 

        // recover old state of enabler
        this.trackStateSaveEnabler = oldStateEnabler;
        
        return true;
    }


    deleteSelectedContent() {
        this.deleteClip();
    }

    /** Delete clip from the timeline
     * @param {[trackIdx, clipIdx]} clip to be deleted
    */
    deleteClip( clip = null ) {
            
        if(!clip) {
            //*********** WARNING: RELIES ON SORTED lastClipsSelected ***********

            // delete selected clips from last to first. lastClipsSelected is sorted
            let selected = this.lastClipsSelected;
            this.lastClipsSelected = []; // so this.#delete does not check clipsselected on each loop (all will be destroyed)
            let prevTrack = -1;
            for( let i = selected.length-1; i > -1; --i ){
                let s = selected[i];
                if ( s[0] != prevTrack){
                    this.saveState(s[0], prevTrack != -1 );
                    prevTrack = s[0];
                }
                this.#delete(s[0], s[1]);
            }
        } 
        else {
            const [trackIdx, clipIdx] = clip;

            this.saveState(trackIdx);
            this.#delete(trackIdx, clipIdx);
        }
    }

    #delete(trackIdx, clipIdx) {

        const track = this.animationClip.tracks[trackIdx]; 
        if(clipIdx >= 0)
        {
            
            track.clips.splice(clipIdx, 1);
            track.hovered.splice(clipIdx,1);
            track.selected.splice(clipIdx,1);
            track.edited.splice(clipIdx,1);

            // remove from selected clips
            for(let i = 0; i < this.lastClipsSelected.length; i++) {
                let [selectedTrackIdx, selectedClipIdx] = this.lastClipsSelected[i];
                if(selectedTrackIdx == trackIdx){
                    if (selectedClipIdx == clipIdx){ // remove self
                        this.lastClipsSelected.splice(i--,1);
                    }else if (selectedClipIdx > clipIdx){ // move upper clips to the left
                        this.lastClipsSelected[i][1]--; 
                    }
                }
                else if( trackIdx < selectedTrackIdx ){ 
                    break; 
                }
            }
            
            if ( this.hovered && this.hovered[0] == trackIdx ){ 
                if ( this.hovered[1] == clipIdx ){ this.unHoverAll(); }
                else if( this.hovered[1] > clipIdx ){ this.hovered[1]--; }
            }

        }
        return true;
    }


    /**
     * User defined. Used when copying and pasting
     * @param {Array of clips} clipsToClone array of original clips. Do not modify clips in this array
     * @param {float} timeOffset Value of time that should be added (or subtracted) from the timing attributes 
     * @returns {Array of clips}
     */
    cloneClips( clipsToClone, timeOffset ){
        let clipsToReturn = JSON.parse(JSON.stringify(clipsToClone))
        for(let i = 0; i < clipsToReturn.length; ++i){
            let clip = clipsToReturn[i];
            clip.start -= timeOffset;
            if ( clip.fadein != undefined ){ clip.fadein += timeOffset; } 
            if ( clip.fadeout != undefined ){ clip.fadeout += timeOffset; } 
        }
        return clipsToReturn;
    }

    /**
     * Overwrite the "cloneClips" function to provide a custom cloning of clips. Otherwise, JSON serialization is used
     */
    copySelectedContent() {

        if ( this.lastClipsSelected.length == 0 ){
            // this.clipboard = null;
            return;
        }

        let clipsToCopy = [];
        const lastClipsSelected = this.lastClipsSelected;
        const tracks = this.animationClip.tracks;
        let globalStart = Infinity;
        for(let i = 0; i < lastClipsSelected.length; ++i){
            let clip = tracks[ lastClipsSelected[i][0] ].clips[ lastClipsSelected[i][1] ];
            clipsToCopy.push( clip );
            if ( globalStart > clip.start ){ globalStart = clip.start; }
        }

        globalStart = Math.max(0, globalStart);
        this.clipboard = this.cloneClips( clipsToCopy, -globalStart );
    }

    pasteContent( time = this.currentTime ) {
        this.unSelectAllClips();

        if(!this.clipboard)
            return;

        time = Math.max(0, time);

        let clipsToAdd = this.cloneClips( this.clipboard, time );
        this.addClips(clipsToAdd, 0);
    }

    /**
     * @method addNewTrack
     */

    addNewTrack( updatePanel = true ) {

        if(!this.animationClip)
            this.animationClip = {duration:0, tracks:[]};

        let trackInfo = {
            idx: this.animationClip.tracks.length,
            clips: [],
            selected: [], edited: [], hovered: [],
            active: true,
            isSelected: false,
            // locked: false
        }; 

        this.animationClip.tracks.push(trackInfo);
        if ( updatePanel ){ 
            this.updateLeftPanel(); 
        }
        return trackInfo.idx;
    }

    /**
     * @method clearTrack
     */

    clearTrack(trackIdx) {

        if (!this.animationClip) {
            this.animationClip = {tracks:[]};
            return;
        }
        this.saveState(trackIdx);
        
        if (this.animationClip.tracks[trackIdx].locked ) {
            return;
        }

        const track = this.animationClip.tracks[trackIdx];
        track.selected = [];
        track.edited = [];
        track.hovered = [];
        track.clips = [];
        
        // remove from selected clips
        for(let i = 0; i < this.lastClipsSelected.length; i++) {
            let [selectedTrackIdx, selectedClipIdx] = this.lastClipsSelected[i];
            if(selectedTrackIdx == trackIdx){
                this.lastClipsSelected.splice(i--,1);
            }
            else if( trackIdx < selectedTrackIdx ){ 
                break; 
            }
        }

        if ( this.hovered && this.hovered[0] == trackIdx ){ this.unHoverAll(); }

        return;
    }

    saveState( trackIdx, combineWithPrevious = false ) {
        if ( !this.trackStateSaveEnabler ){ return; }

        const track = this.animationClip.tracks[trackIdx];
        let clips = this.cloneClips(track.clips, 0);
        // storing as array so multiple tracks can be in a same "undo" step

        const undoStep = { 
            trackIdx: trackIdx,
            clips: clips,
            edited: track.edited.slice(0,track.clips.length)
        };

        if ( combineWithPrevious && this.trackStateUndo.length ){
            this.trackStateUndo[ this.trackStateUndo.length-1 ].push( undoStep );            
        }
        else{
            this.trackStateUndo.push( [ undoStep ] );
        }

        if ( this.trackStateUndo.length > this.trackStateMaxSteps ){ this.trackStateUndo.shift(); } // remove first (oldest) element 

        this.trackStateRedo = [];
    }

    // TODO
    #undoRedo(isUndo = true) {
        
        let toBeShown = isUndo ? this.trackStateUndo : this.trackStateRedo;
        let toBeStored = isUndo ? this.trackStateRedo : this.trackStateUndo;
        
        if (!toBeShown.length){ return false; }
        
        this.unSelectAllClips();
        this.unHoverAll();
        
        const combinedState = toBeShown.pop();
        const combinedStateToStore = [];

        for( let i = 0; i < combinedState.length; ++i ){
            const state = combinedState[i];
            const track = this.animationClip.tracks[state.trackIdx];

            // same as savestate
            combinedStateToStore.push( {
                trackIdx: state.trackIdx,
                clips: track.clips,
                edited: track.edited
            });
            
            track.clips = state.clips;
            track.edited = state.edited;
            if ( track.selected.length < track.clips.length ){ track.selected.length = track.clips.length; }
            if ( track.hovered.length < track.clips.length ){ track.hovered.length = track.clips.length; }
            track.selected.fill(false);
            track.hovered.fill(false);
    
            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( state.trackIdx );
        }

        toBeStored.push(combinedStateToStore);

        return true;
    }

    undo() { return this.#undoRedo(true); }
    redo() { return this.#undoRedo(false); }
    
    getCurrentClip( track, time, threshold ) {

        if(!track || !track.clips.length)
        return -1;

        // Avoid iterating through all timestamps
        if((time + threshold) < track.clips[0].start)
        return -1;

        for(let i = 0; i < track.clips.length; ++i) {
            let t = track.clips[i];
            if(t.start + t.duration >= (time - threshold) && 
                t.start <= (time + threshold)) {
                return i;
            }
        }

        return -1;
    };

    unSelectAllClips() {

        for(let [ idx, keyIndex] of this.lastClipsSelected) {
            this.animationClip.tracks[idx].selected[keyIndex]= false;
        }
        // Something has been unselected
        const unselected = this.lastClipsSelected.length > 0;
        this.lastClipsSelected.length = 0;
        return unselected;
    }

    selectAll( ) {

        this.unSelectAllClips();
        for(let idx = 0; idx < this.animationClip.tracks.length; idx++) {
            for(let clipIdx = 0; clipIdx < this.animationClip.tracks[idx].clips.length; clipIdx++) {
                this.animationClip.tracks[idx].selected[clipIdx] = true;
                this.lastClipsSelected.push( [idx, clipIdx] ); // already sorted
            }
        }
        if(this.onSelectClip)
            this.onSelectClip();
    }

    selectClip( track, clipIndex = null, localX = null, unselect = true, skipCallback = false ) {

        clipIndex = clipIndex ?? this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );

        if(unselect){
            this.unSelectAllClips();
        }
                        
        if(clipIndex < 0)
            return -1;

        if(track.selected[clipIndex])
            return clipIndex;

        // Select if not handled

        // push selection sorted by track index and clip index
        let i = 0;
        for( ; i < this.lastClipsSelected.length; ++i){
            let t = this.lastClipsSelected[i];
            if ( t[0] < track.idx ){ continue; }
            if ( t[0] > track.idx || t[1] > clipIndex ){ break;}
        }
        this.lastClipsSelected.splice(i,0, [track.idx, clipIndex] ); //
        track.selected[clipIndex] = true;

        if( !skipCallback && this.onSelectClip ){
            this.onSelectClip(track.clips[ clipIndex ]);
            // Event handled
        }
        return clipIndex;
    }

    unselectClip( track, clipIndex, localX = null ){
        clipIndex = clipIndex ?? this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                        
        if(clipIndex == -1)
            return -1;

        if(!track.selected[clipIndex])
            return -1;

        track.selected[clipIndex] = false;

        // unselect 
        let trackIdx = track.idx;
        for( let i = 0; i < this.lastClipsSelected.length; ++i){
            let t = this.lastClipsSelected[i];
            if ( t[0] == trackIdx && t[1] == clipIndex ){
                this.lastClipsSelected.splice(i,1);
                break;
            }
        }

        return clipIndex;
    }

    getClipsInRange( track, minTime, maxTime, threshold = 0 ) {

        if(!track || !track.clips.length)
        return null;

        // Manage negative selection
        if(minTime > maxTime) {
            let aux = minTime;
            minTime = maxTime;
            maxTime = aux;
        }

        minTime -= threshold;
        maxTime += threshold;

        // Avoid iterating through all timestamps
        minTime -= threshold;
        maxTime += threshold;
        
        const clips = track.clips; 
        if(maxTime < clips[0].start || minTime > (clips[clips.length-1].start + clips[clips.length-1].duration) )
            return null;

        let indices = [];

        for(let i = 0; i < clips.length; ++i) {
            const c = clips[i];
            if ( c.start+c.duration < minTime ){ continue; }
            if ( c.start > maxTime ){ break; }
            indices.push(i);
        }
        return indices.length ? indices : null;
    }

    validateDuration(t) {
        for(let i = 0; i < this.animationClip.tracks.length; i++) {
            const track = this.animationClip.tracks[i];
            const clipsIdxs = this.getClipsInRange( track, t , this.animationClip.duration, 0 );
            if(!clipsIdxs)
                continue;
            const clip = track.clips[clipsIdxs[clipsIdxs.length - 1]];
            t = Math.max(t, clip.start + clip.duration);
        }
        return t;
    }
}

LX.ClipsTimeline = ClipsTimeline;


/**
 * @class CurvesTimeline
 */

class CurvesTimeline extends Timeline {       

    /**
     * @param {string} name 
     * @param {object} options = {animationClip, selectedItems, x, y, width, height, canvas, trackHeight, range}
     */
    constructor(name, options = {}) {

        super(name, options);
               
        this.keyValuePerPixel = 1/200; // used onMouseMove, vertical move
        this.range = options.range || [0, 1];

        if(this.animationClip && this.animationClip.tracks.length)
            this.processTracks(this.animationClip);
    }

    onMouseUp( e, time )  {

        let track = e.track;
        let localX = e.localX;
        let discard = e.discard; // true when too much time has passed between Down and Up
        
        if(e.shiftKey) {
            e.multipleSelection = true;
            // Manual multiple selection
            if(!discard && track) {
                const keyFrameIdx = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );   
                if ( keyFrameIdx > -1 ){
                    track.selected[keyFrameIdx] ?
                    this.unSelectKeyFrame(track, keyFrameIdx) :
                    this.processCurrentKeyFrame( e, keyFrameIdx, track, null, true ); 
                }
            }
            // Box selection
            else if(this.boxSelection) {                
                let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                
                for(let t of tracks) {
                    let keyFrameIndices = this.getKeyFramesInRange(t, 
                        this.xToTime( this.boxSelectionStart[0] ), 
                        this.xToTime( this.boxSelectionEnd[0] ),
                        this.pixelsToSeconds * 5);
                        
                    if(keyFrameIndices) {
                        for(let index = keyFrameIndices[0]; index <= keyFrameIndices[1]; ++index){
                            this.processCurrentKeyFrame( e, index, t, null, true );
                        }
                    }
                }
            }
        }
        else if( !this.movingKeys && !discard ){ // if not moving timeline and not adding keyframes through e.shiftkey (just a click)

            if ( this.lastKeyFramesSelected.length ){
                if (this.onUnselectKeyFrames){
                    this.onUnselectKeyFrames( this.lastKeyFramesSelected );
                }
                this.unSelectAllKeyFrames();         
            }
            if (track){
                const keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                if( keyFrameIndex > -1 ) {
                    this.processCurrentKeyFrame( e, keyFrameIndex, track, null, e.multipleSelection ); // Settings this as multiple so time is not being set
                }  
            }
        }

        this.canvas.classList.remove('grabbing');
    }

    onMouseDown( e, time ) {
        // function not called if shift is pressed (boxselection)

        let localX = e.localX;
        let localY = e.localY;
        let track = e.track;

        if( (e.ctrlKey || e.altKey) && this.lastKeyFramesSelected.length) { // move keyframes
            this.movingKeys = true;
            this.canvas.style.cursor = "grab";  
            this.canvas.classList.add('grabbing');

            // Set pre-move state
            this.moveKeyMinTime = Infinity;
            const tracksPerItem = this.animationClip.tracksPerItem;
            for(let selectedKey of this.lastKeyFramesSelected) {
                let [name, localTrackIdx, keyIndex, trackIdx, keyTime] = selectedKey;
                const track = tracksPerItem[name][localTrackIdx];
                                
                // save track states only once
                if (this.moveKeyMinTime < Infinity){
                    let state = this.trackStateUndo[this.trackStateUndo.length-1];
                    let s = 0;
                    for( s = 0; s < state.length; ++s){
                        if ( state[s].trackIdx == track.clipIdx ){ break; }
                    }
                    if( s == state.length ){
                        this.saveState(track.clipIdx, true);
                    }
                }else{
                    this.saveState(track.clipIdx, false);               
                }

                selectedKey[4] = track.times[ keyIndex ]; // update original time just in case 
                this.moveKeyMinTime = Math.min( this.moveKeyMinTime, selectedKey[4] );
            }
            
            this.timeBeforeMove = this.xToTime( localX );
        }
    }

    onMouseMove( e, time ) {
        // function not called if shift is pressed (boxselection)

        let localX = e.localX;
        let localY = e.localY;
        let track = e.track;

        if(this.movingKeys) { // move keyframes

            // update where is mouse
            let newTime = this.xToTime( localX );
            let deltaTime = newTime - this.timeBeforeMove;
            if ( deltaTime + this.moveKeyMinTime < 0 ){
                deltaTime = -this.moveKeyMinTime;
            }
            this.timeBeforeMove = this.timeBeforeMove + deltaTime;

            // move keyframes horizontally (change time)
            if ( e.ctrlKey ){
                this.moveKeyMinTime += deltaTime;
                const tracksPerItem = this.animationClip.tracksPerItem;
                for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                    let idx = i;
                    if ( deltaTime > 0 ){
                        idx = this.lastKeyFramesSelected.length - 1 - i;
                    }
                    
                    const [name, localTrackIdx, keyIndex, trackIdx, originalKeyTime] = this.lastKeyFramesSelected[idx];
                    track = tracksPerItem[name][localTrackIdx];
                    if(track && track.locked)
                        continue;

                    this.canvas.style.cursor = "grabbing";

                    const times = this.animationClip.tracks[ track.clipIdx ].times;
                    times[ keyIndex ] = Math.max(0,times[keyIndex] + deltaTime);
                    if (times[ keyIndex ] > this.duration){ 
                        this.setDuration(times[ keyIndex ]); 
                    }

                    // sort keyframe
                    let k = keyIndex;
                    if ( deltaTime > 0 ){
                        for( ; k < times.length-1; ++k ){
                            if ( times[k] < times[k+1] ){ 
                                break; 
                            }
                            this.swapKeyFrames(track, k+1, k);
                        }
                    }else{
                        for( ; k > 0; --k ){
                            if ( times[k-1] < times[k] ){ 
                                break; 
                            }
                            this.swapKeyFrames(track, k-1, k);
                        }
                    }
                    this.lastKeyFramesSelected[idx][2] = k; // update keyframe index
                    this.lastKeyFramesSelected[idx][4] = times[k]; // update keyframe time
                }
                
                if ( this.onContentMoved ){
                    for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                        const [name, localTrackIdx, keyIndex, trackIdx, originalKeyTime] = this.lastKeyFramesSelected[i];
                        track = this.animationClip.tracks[trackIdx];
                        if(track && track.locked)
                            continue;
                        this.onContentMoved(trackIdx, keyIndex);
                    }
                }
            }

            // move keyframes vertically (change values instead of time) 
            if ( e.altKey ){
                for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                    const [name, localTrackIdx, keyIndex, trackIdx, originalKeyTime] = this.lastKeyFramesSelected[i];
                    track = this.animationClip.tracks[trackIdx];
                    if(track && track.locked)
                        continue;
                    let value = track.values[keyIndex];
                    let delta = e.deltay * this.keyValuePerPixel * (this.range[1]-this.range[0]); 
                    track.values[keyIndex] = Math.max(this.range[0], Math.min(this.range[1], value - delta)); // invert delta because of screen y
                    track.edited[keyIndex] = true;

                    if ( this.onUpdateTrack ){
                        this.onUpdateTrack( track.clipIdx );
                    }
                }
            }
            
            return;
        }

        if( this.grabbing && e.button != 2) {

        }
        else if(track) {

            this.unHoverAll();
            let keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
            if(keyFrameIndex > -1 ) {
                
                const name = this.animationClip.tracksDictionary[track.fullname]; 
                let t = this.animationClip.tracksPerItem[ name ][track.idx];
                if(t && t.locked)
                    return;
                
                this.lastHovered = [name, track.idx, keyFrameIndex];
                t.hovered[keyFrameIndex] = true;   
            }
        }
        else {
            this.unHoverAll();
        }
    }

    showContextMenu( e ) {

        e.preventDefault();
        e.stopPropagation();

        let actions = [];
        //let track = this.NMFtimeline.clip.tracks[0];
        if(this.lastKeyFramesSelected && this.lastKeyFramesSelected.length) {
            if(this.lastKeyFramesSelected.length == 1 && this.clipboard && this.clipboard.value)
            {
                actions.push(
                    {
                        title: "Paste",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {
                            this.pasteContent();
                        }
                    }
                )
            }
            actions.push(
                {
                    title: "Copy",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                    callback: () => {
                        this.copySelectedContent();
                    }
                }
            )
            actions.push(
                {
                    title: "Delete",// + " <i class='bi bi-trash float-right'></i>",
                    callback: () => {
                        this.deleteSelectedContent({});
                        
                    }
                }
            )
        }
        else{
            
            actions.push(
                {
                    title: "Add",
                    callback: () => this.addKeyFrame( e.track, 0 )
                }
            )

            if(this.clipboard && this.clipboard.keyframes)
            {
                actions.push(
                    {
                        title: "Paste",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {
                            this.pasteContent();
                        }
                    }
                )
            }
        }
        
        LX.addContextMenu("Options", e, (m) => {
            for(let i = 0; i < actions.length; i++) {
                m.add(actions[i].title,  actions[i].callback )
            }
        });

    }

    drawContent( ctx ) {
    
        if(!this.animationClip || !this.animationClip.tracksPerItem) 
            return;

        ctx.save();
        
        const trackHeight = this.trackHeight;
        const tracksPerItem = this.animationClip.tracksPerItem;
        const scrollY = - this.currentScrollInPixels;
        const treeOffset = this.leftPanelTrackTreeWidget.innerTree.domEl.offsetTop - this.canvas.offsetTop;

        let offset = scrollY;
        ctx.translate(0, offset);

        for(let t = 0; t < this.selectedItems.length; t++) {
            let tracks = tracksPerItem[this.selectedItems[t]];
            if(!tracks) continue;
            
            offset += trackHeight;
            ctx.translate(0, trackHeight);

            for(let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                if(track.hide) {
                    continue;
                }
               
                this.drawTrackWithCurves(ctx, trackHeight, track);
                this.tracksDrawn.push([track, offset + treeOffset, trackHeight]);
                
                offset += trackHeight;
                ctx.translate(0, trackHeight);
            }
        }
        ctx.restore();

    };

    drawTrackWithCurves (ctx, trackHeight, track) {
        const keyframes = track.times;
        const values = track.values;

        if(keyframes) {
            if(track.isSelected){
                ctx.globalAlpha = 0.2 * this.opacity;
                ctx.fillStyle = Timeline.TRACK_SELECTED_LIGHT;
                ctx.fillRect(0, 0, ctx.canvas.width, trackHeight );      
            }
                
            ctx.globalAlpha = this.opacity;

            const defaultPointSize = 5;
            const hoverPointSize = 7;
            const valueRange = this.range; //[min, max]
            const displayRange = trackHeight - defaultPointSize * 2;
            //draw lines
            ctx.strokeStyle = "white";
            ctx.beginPath();
            for(let j = 0; j < keyframes.length; ++j){

                let time = keyframes[j];
                let keyframePosX = this.timeToX( time );
                let value = values[j];                
                value = ((value - valueRange[0]) / (valueRange[1] - valueRange[0])) * (-displayRange) + (trackHeight - defaultPointSize); // normalize and offset

                if( time < this.startTime ){
                    ctx.moveTo( keyframePosX, value ); 
                    continue;
                }
                                
                //convert to timeline track range
                ctx.lineTo( keyframePosX, value );  
                
                if ( time > this.endTime ){
                    break; //end loop, but print line
                }
            }
            ctx.stroke();

            //draw points
            ctx.fillStyle = Timeline.COLOR;
            for(let j = 0; j < keyframes.length; ++j)
            {
                let time = keyframes[j];
                if( time < this.startTime || time > this.endTime )
                    continue;

                let size = defaultPointSize;
                let keyframePosX = this.timeToX( time );
                    
                if(!this.active || !track.active)
                    ctx.fillStyle = Timeline.COLOR_INACTIVE;
                else if(track.locked)
                    ctx.fillStyle = Timeline.COLOR_LOCK;
                else if(track.hovered[j]) {
                    size = hoverPointSize;
                    ctx.fillStyle = Timeline.COLOR_HOVERED;
                }
                else if(track.selected[j])
                    ctx.fillStyle = Timeline.COLOR_SELECTED;
                else if(track.edited[j])
                    ctx.fillStyle = Timeline.COLOR_EDITED;
                else 
                    ctx.fillStyle = Timeline.COLOR
                
                let value = values[j];
                value = ((value - this.range[0]) / (this.range[1] - this.range[0])) *(-displayRange) + (trackHeight - defaultPointSize); // normalize and offset

                ctx.beginPath();
                ctx.arc( keyframePosX, value, size, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            }
        }
    }

    // Creates a map for each item -> tracks
    processTracks(animation) {

        this.animationClip = {
            name: (animation && animation.name) ? animation.name : "animationClip",
            duration: animation ? animation.duration : 0,
            speed: (animation && animation.speed ) ? animation.speed : this.speed,
            tracks: [],
            tracksPerItem: {},
            tracksDictionary: {}
        };

        if (animation && animation.tracks) { // THREEJS animation
            let tracksPerItem = {};
            let tracksDictionary = {};
            for( let i = 0; i < animation.tracks.length; ++i ) {
                
                let track = animation.tracks[i];
                
                const [name, type] = this.getTrackName(track.name); // threejs stores tracks as "name.type" --> "hips.quaternion"

                let valueDim = track.dim;
                if ( !valueDim || valueDim < 0 ){
                    if ( track.times.length && track.values.length ){ valueDim = track.values.length/track.times.length; }
                    else{ valueDim = 1; }
                }

                let leftOver = track.values.length % valueDim; // just in case values has an incorrect length
                let amounEntries = Math.min( track.times.length, track.values.length - leftOver );
                let times = track.times.slice(0, amounEntries); 
                let values = track.values.slice(0, amounEntries * valueDim);
                let boolArray = (new Array(amounEntries)).fill(false);

                let trackInfo = {
                    fullname: track.name,
                    name: name, type: type,
                    active: true,
                    locked: false,
                    dim: valueDim,
                    selected: boolArray.slice(), edited: boolArray.slice(), hovered: boolArray.slice(), 
                    times: times,
                    values: values
                };
                
                if(!tracksPerItem[name]) {
                    tracksPerItem[name] = [trackInfo];
                }else {
                    tracksPerItem[name].push( trackInfo );
                }
                
                
                const trackIndex = tracksPerItem[name].length - 1;
                trackInfo.idx = trackIndex; // index of track in "name"
                trackInfo.clipIdx = i; // index of track in the entire animation
                
                // Save index also in original track
                track.idx = trackIndex;
                tracksDictionary[track.name] = name;
                this.animationClip.tracks.push(trackInfo);
                
            }
            this.animationClip.tracksPerItem = tracksPerItem;
            this.animationClip.tracksDictionary = tracksDictionary;
        }
    }

    /**
     * updates an existing track with new values and times.
     * @param {Integer} trackIdx index of track in the animationClip 
     * @param {*} newTrack object with two arrays: values and times. These will be set to the selected track
     * @returns 
    */
    updateTrack(trackIdx, newTrack) {
        if(!this.animationClip)
            return false;

        this.animationClip.tracks[trackIdx].values = newTrack.values;
        this.animationClip.tracks[trackIdx].times = newTrack.times;

        let track = this.animationClip.tracks[trackIdx];
        track.selected = (new Array(track.times.length)).fill(false);
        track.hovered = track.selected.slice();
        track.edited = track.selected.slice();
        return true;
    }

    /**
     * removes equivalent sequential keys either because of equal times or values
     * (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
     * @param {Int} trackIdx index of track in the animation
     * @param {Bool} onlyEqualTime if true, removes only keyframes with equal times. Otherwise, values are ALSO compared through the class threshold
     * @param {Bool} enableEvent if true, triggers "onOptimizeTracks" after optimizing
     */
    optimizeTrack(trackIdx, onlyEqualTime = false, enableEvent = true ) {
        if ( !this.animationClip ){ return; }

        const track = this.animationClip.tracks[trackIdx],
            times = track.times,
            values = track.values,
            stride = track.dim,
            threshold = this.optimizeThreshold;
        let cmpFunction = (v, p, n, t) => { return Math.abs(v - p) >= t || Math.abs(v - n) >= t };
        let lastSavedIndex = 0;
        const lastIndex = times.length-1;

        for ( let i = 1; i < lastIndex; ++ i ) {

            let keep = false;
            const time = times[ i ];
            const timePrev = times[ lastSavedIndex ];

            // remove adjacent keyframes scheduled at the same time
            if ( time !== timePrev ) {
                if ( ! onlyEqualTime ) {
                    // remove unnecessary keyframes same as their neighbors
                    const offset = i * stride,
                        offsetP = lastSavedIndex * stride,
                        offsetN = offset + stride;

                    for ( let j = 0; j !== stride; ++ j ) {
                        if( cmpFunction(
                            values[ offset + j ], 
                            values[ offsetP + j ], 
                            values[ offsetN + j ],
                            threshold))
                        {
                            keep = true;
                            break;
                        }
                    }
                } else {
                    keep = true;
                }
            }

            // in-place compaction
            if ( keep ) {
                ++lastSavedIndex;
                if ( i !== lastSavedIndex ) {
                    times[ lastSavedIndex ] = times[ i ];
                    const readOffset = i * stride,
                        writeOffset = lastSavedIndex * stride;
                    for ( let j = 0; j !== stride; ++ j ) {
                        values[ writeOffset + j ] = values[ readOffset + j ];
                    }
                }
            }
        }

        // add last frame. first and last keyframes should be always kept
        if ( times.length > 1 ) {
            ++lastSavedIndex;
            times[ lastSavedIndex ] = times[ times.length - 1 ];
            const readOffset = values.length - stride,
                writeOffset = lastSavedIndex * stride;
            for ( let j = 0; j !== stride; ++j ) {
                values[ writeOffset + j ] = values[ readOffset + j ];
            }
        }
        
        // commit changes
        if ( lastSavedIndex < times.length-1 ) {   
            track.times = times.slice( 0, lastSavedIndex + 1 );
            track.values = values.slice( 0, (lastSavedIndex + 1) * stride );
            this.updateTrack( track.clipIdx, track ); // update control variables (hover, edited, selected) 
        } 

        if(this.onOptimizeTracks && enableEvent)
            this.onOptimizeTracks(trackIdx);
    }

    optimizeTracks(onlyEqualTime = false) {

        if(!this.animationClip)
            return;

        for( let i = 0; i < this.animationClip.tracks.length; ++i ) {
            const track = this.animationClip.tracks[i];
            this.optimizeTrack( track.clipIdx, onlyEqualTime, false );
        }

        if(this.onOptimizeTracks)
            this.onOptimizeTracks(-1); // signal as all tracks
    }
    

    getNumTracks( item ) {
        if(!item || !this.animationClip.tracksPerItem)
            return;
        const tracks = this.animationClip.tracksPerItem[item.name];
        return tracks ? tracks.length : null;
    }


    onShowOptimizeMenu( e) {
        
        if(this.selectedItems.length == 0)
            return;

        let tracks = [];
        for(let i = 0; i < this.selectedItems.length; i++) {
            tracks = [...tracks, ...this.animationClip.tracksPerItem[this.selectedItems[i]]];
        }
        if(!tracks.length) return;

        LX.addContextMenu("Optimize", e, m => {
            for( let t of tracks ) {
                m.add( t.name + (t.type ? "@" + t.type : ""), () => { 
                    this.optimizeTrack( t.clipIdx, false );
                })
            }
        });
    }

    /**
     * @param {Number} trackIdx index of track in the animation (not local index) 
     * @param {Bool} combineWithPrevious whether to create a new entry or unify changes into a single undo entry
     */
    saveState( trackIdx, combineWithPrevious = false ) {
        if ( !this.trackStateSaveEnabler ){ return; }

        const trackInfo = this.animationClip.tracks[trackIdx];

        const undoStep = {
                trackIdx: trackIdx,
                t: trackInfo.times.slice(),
                v: trackInfo.values.slice(),
                edited: trackInfo.edited.slice(0, trackInfo.times.length)
        };

        if ( combineWithPrevious && this.trackStateUndo.length ){
            this.trackStateUndo[ this.trackStateUndo.length - 1 ].push( undoStep );
        }
        else{
            this.trackStateUndo.push( [undoStep] );
        }

        if ( this.trackStateUndo.length > this.trackStateMaxSteps ){ this.trackStateUndo.shift(); } // remove first (oldest) element 

        this.trackStateRedo = [];
    }

    #undoRedo(isUndo = true){

        let toBeShown = isUndo ? this.trackStateUndo : this.trackStateRedo;
        let toBeStored = isUndo ? this.trackStateRedo : this.trackStateUndo;

        if (!toBeShown.length){ return false; }

        this.unSelectAllKeyFrames();
        this.unHoverAll();
        
        const combinedState = toBeShown.pop();
        const combinedStateToStore = [];

        for( let i = 0; i < combinedState.length; ++i ){
            const state = combinedState[i];
            const track = this.animationClip.tracks[state.trackIdx];

            // same as savestate
            combinedStateToStore.push({ 
                trackIdx: state.trackIdx,
                t: track.times,
                v: track.values,
                edited: track.edited
            });

            track.times = state.t;
            track.values = state.v;
            track.edited = state.edited;
            if ( track.selected.length < track.times.length ){ track.selected.length = track.times.length; }
            if ( track.hovered.length < track.times.length ){ track.hovered.length = track.times.length; }
            track.selected.fill(false);
            track.hovered.fill(false);

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( state.trackIdx );
        }

        toBeStored.push(combinedStateToStore);

        return true;
    }

    undo() { return this.#undoRedo(true); }
    redo() { return this.#undoRedo(false); }

    /**
    * 
    * @param {*} track 
    * @param {Number} srcIdx keyFrame index
    * @param {Number} trgIdx keyFrame index  
    */
    swapKeyFrames(track, srcIdx, trgIdx){
        let times = track.times;
        let values = track.values;

        let tmp = times[srcIdx];
        times[srcIdx] = times[trgIdx];
        times[trgIdx] = tmp;

        tmp = track.hovered[srcIdx];
        track.hovered[srcIdx] = track.hovered[trgIdx];
        track.hovered[trgIdx] = tmp;

        tmp = track.edited[srcIdx];
        track.edited[srcIdx] = track.edited[trgIdx];
        track.edited[trgIdx] = tmp;

        tmp = track.selected[srcIdx];
        track.selected[srcIdx] = track.selected[trgIdx];
        track.selected[trgIdx] = tmp;

        let src = srcIdx * track.dim;
        let end = src + track.dim;
        let trg = trgIdx * track.dim;
        for( ; src < end; ++src ){
            tmp = values[ src ];
            values[ src ] = values[ trg ];
            values[ trg ] = tmp;
            ++trg;
        }
    }

    copySelectedContent() {
        if (!this.lastKeyFramesSelected.length){ 
            return; 
        }

        if(!this.clipboard)
            this.clipboard = {};

        this.clipboard.keyframes = {}; // reset clipboard
        
        // sort keyframes selected by track
        let toCopy = {};
        for(let i = 0; i < this.lastKeyFramesSelected.length; i++){
            let [id, localTrackIdx, keyIdx] = this.lastKeyFramesSelected[i];
            let track = this.animationClip.tracksPerItem[id][localTrackIdx];
            let trackIdx = track.clipIdx;

            if(toCopy[trackIdx]) {
                toCopy[trackIdx].idxs.push(keyIdx);
            } else {
                toCopy[trackIdx] = {track: track, idxs : [keyIdx]};
            }
            if(i == 0) {
                this.copyKeyFrameValue(track, keyIdx);
            }
        }

        // for each track selected, copy its values
        for(let trackIdx in toCopy) {
            this.copyKeyFrames(toCopy[trackIdx].track, toCopy[trackIdx].idxs);
        }
    }
  
    // copies the current value of the keyframe. This value can be pasted across any track (as long as they are of the same type)  
    copyKeyFrameValue( track, index ) {

        // 1 element clipboard by now

        let start = index * track.dim;
        let values = this.animationClip.tracks[ track.clipIdx ].values.slice(start, start + track.dim);

        if(!this.clipboard)
            this.clipboard = {};

        this.clipboard.value = {
            type: track.type,
            values: values
        };
    }

    // each track will have its own entry of copied keyframes. When pasting, only the apropiate track's keyframes are pasted
    copyKeyFrames( track, indices ) {

        let trackIdx = track.clipIdx;
        if(!this.clipboard)
            this.clipboard = {};
        
        indices.sort( (a,b) => a - b ); // just in case

        let obj = { track: track, values:[], times:[] };

        for(let i = 0; i < indices.length; i++ ){
            let keyIdx = indices[i];
            let start = keyIdx * track.dim;
            let keyValues = track.values.slice(start, start + track.dim); // copy values into a new array
            obj.values.push(keyValues); // save to clipboard
            obj.times.push(track.times[keyIdx]); // save to clipboard
        };

        this.clipboard.keyframes[trackIdx] = obj;
    }

    pasteContent() {
        if(!this.clipboard)
            return false;
        
        // copy the value into the only selected keyframe
        if(this.clipboard.value && this.lastKeyFramesSelected.length == 1) {

            let [id, localTrackIdx, keyIdx] = this.lastKeyFramesSelected[0];
            this.pasteKeyFrameValue({}, this.animationClip.tracksPerItem[id][localTrackIdx], keyIdx);
        }

        // create new keyframes from the ones copied 
        if(this.clipboard.keyframes) {

            for( let trackIdx in this.clipboard.keyframes ){
                let clipboardItem = this.animationClip.tracks[trackIdx].name;
    
                // ensure all tracks are visible
                if ( this.selectedItems.findIndex( (item) => item == clipboardItem ) == -1 ){
                    return false; 
                }
            }

            this.pasteKeyFrames( this.currentTime );
        }

        return true;
    }

    canPasteKeyFrame () {
        return this.clipboard != null;
    }


    #paste( track, index ) {

        let clipboardInfo = this.clipboard.value;

        if(clipboardInfo.type != track.type){
            return;
        }

        let start = index * track.dim;
        let j = 0;
        for(let i = start; i < start + track.dim; ++i) {
            this.animationClip.tracks[ track.clipIdx ].values[i] = clipboardInfo.values[j];
            ++j;
        }

        track.edited[ index ] = true;
    }

    pasteKeyFrameValue( e, track, index ) {

        this.saveState(track.clipIdx);

        // Copy to current key
        this.#paste( track, index );
        
        if(!e.multipleSelection)
        return;
        
        // Don't want anything after this
        this.clearState();

        // Copy to every selected key
        for(let [name, idx, keyIndex] of this.lastKeyFramesSelected) {
            this.#paste( this.animationClip.tracksPerItem[name][idx], keyIndex );
        }
    }

    pasteKeyFrames( pasteTime = this.currentTime ){
        if ( !this.clipboard.keyframes ){ return false; }

        this.unHoverAll();
        this.unSelectAllKeyFrames();

        pasteTime = this.currentTime;

        let clipboardTracks = this.clipboard.keyframes;
        let globalStart = Infinity;
        for( let trackIdx in clipboardTracks ){
            if ( globalStart > clipboardTracks[trackIdx].times[0] ){
                globalStart = clipboardTracks[trackIdx].times[0];
            }
        }

        if ( globalStart == Infinity ){ return false; }

        for( let trackIdx in clipboardTracks ){
            
            const clipboardInfo = this.clipboard.keyframes[trackIdx];
            const times = clipboardInfo.times; 
            const values = clipboardInfo.values;

            this.saveState(trackIdx);
            let oldTrackStateEnabler = this.trackStateSaveEnabler;
            this.trackStateSaveEnabler = false; // do not save state while in addkeyframe

            for(let i = 0; i < clipboardInfo.times.length; i++) {
                let value = values[i];
                let time = times[i];
                if(typeof value == 'number')
                    value = [value];
                time = time - globalStart + pasteTime;
                this.addKeyFrame( this.animationClip.tracks[trackIdx], value, time );
            }
            
            this.trackStateSaveEnabler = oldTrackStateEnabler;
            
        }

        return true;

    }

    addKeyFrame( track, value = undefined, time = this.currentTime ) {
       
        if(!track) {
            return -1;
        }
        
        // Update animationClip information
        const trackIdx = track.clipIdx;
        track = this.animationClip.tracks[trackIdx];

        let newIdx = this.getNearestKeyFrame( track, time ); 
        
        // Time slot with other key?
        if( newIdx > -1 && Math.abs(track.times[newIdx] - time) < 0.001 ) {
            console.warn("There is already a keyframe [", newIdx, "] stored in time slot [", track.times[newIdx], "]");
            return -1;
        }

        this.saveState(trackIdx);

        // Find index that t[idx] > time
        if(newIdx < 0) { 
            newIdx = 0;
        }
        else if ( track.times[newIdx] < time ){ 
            newIdx++; 
        }

        // Get mid values
        value = value != undefined ? [value] : this.onGetSelectedItem();

        // new arrays. WARNING assuming keyframes are always dim=1
        let times = new Float32Array( track.times.length + 1 );
        let values = new Float32Array( track.values.length + 1 );

        // copy times/values before the new index (valueDim == 1)
        for( let i = 0; i < newIdx; ++i ){ 
            times[i] = track.times[i]; 
            values[i] = track.values[i];
        }

        times[newIdx] = time;
        values[newIdx] = value;

        // copy remaining times/values
        for( let i = newIdx; i < track.times.length; ++i ){ 
            times[i+1] = track.times[i]; 
            values[i+1] = track.values[i];
        }

        track.times = times;
        track.values = values;
            
        // Add new entry into each control array
        track.hovered.splice(newIdx, 0, false);
        track.selected.splice(newIdx, 0, false);
        track.edited.splice(newIdx, 0, true);
       
        // Update animation action interpolation info
        if(this.onUpdateTrack)
            this.onUpdateTrack( trackIdx );

        if ( time > this.duration ){
            this.setDuration(time);
        }

        return newIdx;
    }

    deleteSelectedContent() {
        
        this.deleteKeyFrame(null);
    }

   /**
    * Delete a keyframe given the track and the its index
    * @param {Number} trackIdx track that keyframe belongs to 
    * @param {Number} index index of the keyframe on the track
    * @returns 
    */
    #delete( trackIdx, index ) {

        const track = this.animationClip.tracks[trackIdx];
        
        // Don't remove by now the first key (and avoid impossible indices)
        if(index < 1 || index >= track.times.length ) {
            console.warn("Operation not supported! " + (index==0 ?"[removing first keyframe track]":"[removing invalid keyframe " + index + " from " + track.times.length + "]"));
            return false;
        }

        // Delete time key (TypedArrays do not have splice )
        track.times = track.times.filter( (v, i) => i != index);        
        track.edited = track.edited.filter( (v, i) => i != index);
        track.selected = track.selected.filter( (v, i) => i != index);
        track.hovered = track.hovered.filter( (v, i) => i != index);

        // Delete values
        const indexDim = track.dim * index;
        const slice1 = track.values.slice(0, indexDim);
        const slice2 = track.values.slice(indexDim + track.dim);

        track.values = LX.UTILS.concatTypedArray([slice1, slice2], Float32Array);

        // Update animation action interpolation info
        if(this.onDeleteKeyFrame)
            this.onDeleteKeyFrame( trackIdx, index );
        
        return true;
    }
    
    /** Delete one or more keyframes given the triggered event
     * @e: event
     * @track:
     * @index: index of the keyframe on the track
    */
    deleteKeyFrame(track, index) {
        
        if(!track) {
            //*********** WARNING: RELIES ON SORTED lastKeyFramesSelected ***********
            
            // start removing from the last keyframe 
            let prevTrackRemoved = -1;
            for( let i = this.lastKeyFramesSelected.length-1; i > -1; --i ){
                let [trackName, trackLocalIdx, frameIdx, trackIdx] = this.lastKeyFramesSelected[i];
                if ( prevTrackRemoved != trackIdx ){
                    this.saveState(trackIdx, prevTrackRemoved != -1);
                    prevTrackRemoved = trackIdx;
                }
                this.#delete(trackIdx, frameIdx);
            }
            this.lastKeyFramesSelected = [];
        }
        else{
            this.saveState(track.clipIdx);
            this.#delete(track.clipIdx, index);
        }

        this.unSelectAllKeyFrames();
    }

    unSelectItems() {

        if(!this.unSelectAllKeyFrames()) {
            this.selectedItems = [];
            if(this.onItemUnselected)
                this.onItemUnselected();
        }
    }

    /**
     * @param {Array} itemsName 
     */
    setSelectedItems( itemsName ) {

        if(itemsName.constructor !== Array)
        throw("Item name has to be an array!");

        this.unSelectAllKeyFrames();
        this.unHoverAll();

        this.selectedItems = [];
        for( let i = 0; i < itemsName.length; ++i ){
            if ( this.animationClip.tracksPerItem[itemsName[i]] ){
                this.selectedItems.push(itemsName[i]);
            }
        }
        this.updateLeftPanel();
    }

    getTrack( trackInfo )  {
        const [name, localTrackIndex] = trackInfo;
        return this.animationClip.tracksPerItem[ name ][localTrackIndex];
    }

    getTrackName( uglyName ) {

        let name, type;

        // Support other versions
        if(uglyName.includes("[")) {
            const nameIndex = uglyName.indexOf('['),
                trackNameInfo = uglyName.substr(nameIndex+1).split("].");
            name = trackNameInfo[0].replaceAll(/[\[\]]/g,"");
            name = name.replaceAll("_", " ");
            type = trackNameInfo[1];
        }else {
            const trackNameInfo = uglyName.split(".");
            name = trackNameInfo[0].replaceAll(/[\[\]]/g,"");
            name = name.replaceAll("_", " ");
            type = trackNameInfo[1];
        }

        return [name, type];
    }

    /**
     * Binary search. Relies on track.times being a sorted array
     * @param {object} track 
     * @param {number} time 
     * @param {number} mode on of the possible values 
     *  - -1 = nearest frame with t[f] <= time 
     *  - 0 = nearest frame 
     *  - 1 = nearest frame with t[f] >= time
     * @returns a zero/positive value if successful. On failure returnes -1 meaning either there are no frames (0), no frame-time is lower (-1) or no frame-time is higher (1)
     */
    getNearestKeyFrame( track, time, mode = 0 ) {

        if(!track || !track.times || !track.times.length)
            return -1;

        //binary search
        const times = track.times;
        let min = 0, max = times.length - 1;
        
        // edge cases
        if ( times[min] > time ){
            return mode == -1 ? -1 : 0;
        }
        if ( times[max] < time ){
            return mode == 1 ? -1 : max;
        }
        
        // time is between first and last frame
        let half = Math.floor( ( min + max ) / 2 );
        while ( min < half && half < max ){
            if ( time < times[half] ){ max = half; }
            else{ min = half; }
            half = Math.floor( ( min + max ) / 2 );
        }

        if (mode == 0 ){
            return Math.abs( time - times[min] ) < Math.abs( time - times[max] ) ? min : max;
        }
        else if ( mode == -1 ){
            return times[max] == time ? max : min;
        }
        return times[min] == time ? min : max;
    }

    /**
     * get the nearest keyframe to "time" given a maximum threshold. 
     * @param {object} track 
     * @param {number} time 
     * @param {number} threshold must be positive value
     * @returns returns a postive/zero value if there is a frame inside the threshold range. Otherwise, -1
     */
    getCurrentKeyFrame( track, time, threshold = 0.0 ) {

        if(!track || !track.times.length)
            return -1;

        let frame = this.getNearestKeyFrame( track, time );
        if ( frame > -1 ){
            frame = Math.abs(track.times[frame] - time) > threshold ? -1 : frame;
        }

        return frame;
    }

    /**
     * Returns the interval of frames between minTime and maxTime (both included)
     * @param {object} track 
     * @param {number} minTime 
     * @param {number} maxTime 
     * @param {number} threshold must be positive value 
     * @returns an array with two values [ minFrame, maxFrame ]. Otherwise null 
     */
    getKeyFramesInRange( track, minTime, maxTime, threshold = 0.0 ) {

        if(!track || !track.times.length)
            return null;

        // Manage negative selection
        if(minTime > maxTime) {
            let aux = minTime;
            minTime = maxTime;
            maxTime = aux;
        }

        const minFrame = this.getNearestKeyFrame( track, minTime - threshold, 1 );
        const maxFrame = this.getNearestKeyFrame( track, maxTime + threshold, -1 );

        if ( maxFrame == -1 || minFrame == -1 ){ return null; }

        return [minFrame, maxFrame];
    }

    unHoverAll() {
        if(this.lastHovered) {
            this.animationClip.tracksPerItem[ this.lastHovered[0] ][ this.lastHovered[1] ].hovered[ this.lastHovered[2] ] = false;
        }
        let h = this.lastHovered;
        this.lastHovered = null;
        return h;
    }

    unSelectAllKeyFrames() {

        for(let [name, localTrackIdx, keyIndex] of this.lastKeyFramesSelected) {
            this.animationClip.tracksPerItem[name][localTrackIdx].selected[keyIndex] = false;
        }

        // Something has been unselected
        const unselected = this.lastKeyFramesSelected.length > 0;
        this.lastKeyFramesSelected.length = 0;
        return unselected;
    }

    isKeyFrameSelected( track, index ) {
        return track.selected[ index ];
    }
    
    /** 
     * @param {object} track track of animation clip (object not index)
     * @param {int} frameIdx frame (index) to select inside the track 
     * @param {bool} unselectPrev if true, unselects previously selected frames. Otherwise, stacks the new selection
     * @returns 
     */
    selectKeyFrame( track, frameIdx, unselectPrev = true ) {        
        if( !track || track.locked || !track.active )
            return false;

        if ( unselectPrev ){
            this.unSelectAllKeyFrames();
        }

        if ( track.selected[frameIdx] ){
            return false;
        }

        // [ track name string, track idx in item, keyframe, track idx in animation, keyframe time]
        let selection = [track.name, track.idx, frameIdx, track.clipIdx, track.times[frameIdx]];
        const trackIdx = track.clipIdx;

        // sort lastkeyframeselected ascending order
        let i = 0;
        for( ; i < this.lastKeyFramesSelected.length; ++i){
            let s = this.lastKeyFramesSelected[i];
            if(s[3] > trackIdx || (s[3] == trackIdx && s[2] > frameIdx)){
                break;
            }
        }
        this.lastKeyFramesSelected.splice( i, 0, selection );
        track.selected[frameIdx] = true;

        return selection;
    }

    unSelectKeyFrame( track, frameIdx ){
        if( !track || track.locked || !track.active )
            return false;
        
        if ( !track.selected[frameIdx] ){
            return false;
        }
        track.selected[frameIdx] = false;
        
        const localTrackIdx = track.idx;
        for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
            let sk = this.lastKeyFramesSelected[i];
            if ( sk[1] == localTrackIdx && sk[2] == frameIdx ){ 
                this.lastKeyFramesSelected.splice(i, 1);
                break;
            }
        }

        return true;
    }

    getNumKeyFramesSelected() {
        return this.lastKeyFramesSelected.length;
    }

    processCurrentKeyFrame( e, keyFrameIndex, track, localX, multiple ) {

        if(track.locked)
            return;
    
        e.multipleSelection = multiple;
        if(!multiple && e.button != 2) {
            this.unSelectAllKeyFrames();
        }
        
        keyFrameIndex = keyFrameIndex ?? this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
        if (keyFrameIndex < 0)
            return;
                        
        const name = this.animationClip.tracksDictionary[track.fullname];
        const t = this.animationClip.tracksPerItem[ name ][track.idx];
        
        const currentSelection = this.selectKeyFrame(t, keyFrameIndex, !multiple, multiple); // changes time on the first keyframe selected

        if (!multiple){
            this.setTime(this.animationClip.tracks[t.clipIdx].times[ keyFrameIndex ]);
        }

        if( this.onSelectKeyFrame && this.onSelectKeyFrame(e, currentSelection)) {
            // Event handled
            return;
        }
    }

    /**
     * @method addNewTrack
     */

    addNewTrack() {

        if(!this.animationClip)
            this.animationClip = {tracks:[]};

        let trackInfo = {
            idx: this.animationClip.tracks.length,
            values: [], times: [],
            selected: [], edited: [], hovered: []
        };

        this.animationClip.tracks.push(trackInfo);
        this.updateLeftPanel();
        return trackInfo.idx;
    }

    /**
    * @method clearTrack
    */
    clearTrack(idx, defaultValue) {

        let track =  this.animationClip.tracks[idx];

        if(track.locked )
        {
            return;
        }
        
        this.unHoverAll();
        this.unSelectAllKeyFrames();
        
        this.saveState(track.clipIdx);
        const count = track.times.length;
        for(let i = count - 1; i >= 0; i--)
        {
            this.#delete(track.clipIdx, i );
        } 
        if(defaultValue != undefined) {
            if(typeof(defaultValue) == 'number')  {
                track.values[0] = defaultValue;
            }
            else {
                for(let i = 0; i < defaultValue.length; i++) {
                    track.values[i] = defaultValue[i];
                }
            }

        }
        return idx;
    }
}

LX.CurvesTimeline = CurvesTimeline;

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */

CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius = 5, fill = false, stroke = false) {
    
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    
    this.beginPath();
    this.moveTo(x + radius.tl, y);
    this.lineTo(x + width - radius.tr, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    this.lineTo(x + width, y + height - radius.br);
    this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    this.lineTo(x + radius.bl, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    this.lineTo(x, y + radius.tl);
    this.quadraticCurveTo(x, y, x + radius.tl, y);
    this.closePath();
    
    if (fill) {
        this.fill();
    }
    if (stroke) {
     this.stroke();
    }
}

LX.UTILS.HexToRgb = (hex) => {
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255];
    }
    throw new Error('Bad Hex');
}

LX.UTILS.concatTypedArray = (arrays, ArrayType) => {
    let size = arrays.reduce((acc,arr) => acc + arr.length, 0);
    let result = new ArrayType( size ); // generate just one array
    let offset = 0;
    for( let i = 0; i < arrays.length; ++i ){
        result.set(arrays[i], offset ); // copy values
        offset += arrays[i].length;
    }
    return result;
}

export { Timeline, KeyFramesTimeline, ClipsTimeline, CurvesTimeline };