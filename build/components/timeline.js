import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'Timeline' );

/**
 * @class Timeline
 * @description Agnostic timeline, do not impose any timeline content. Renders to a canvas
 */

class Timeline {

    /**
     * @param {string} name = string unique id
     * @param {object} options = {skipLock, skipVisibility}
     */
    constructor( id, options = {} ) {

        this.uniqueID = id ?? '';
        this.currentTime = 0;
        this.visualTimeRange = [0,0]; // [start time, end time] - visible range of time. 0 <= time <= duration
        this.visualOriginTime = 0; // time visible at pixel 0. -infinity < time < infinity
        this.topMargin = 40;
        this.clickDiscardTimeout = 200; // ms
        this.lastMouse = [0,0];
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

        // required before updateHeader
        this.onCreateBeforeTopBar = options.onCreateBeforeTopBar;
        this.onCreateAfterTopBar = options.onCreateAfterTopBar;
        this.onCreateControlsButtons = options.onCreateControlsButtons;
        this.onCreateSettingsButtons = options.onCreateSettingsButtons;
        this.onChangeLoopMode = options.onChangeLoopMode;
        this.onShowConfiguration = options.onShowConfiguration;
        this.onBeforeDrawContent = options.onBeforeDrawContent;
        
        this.playing = false;
        this.loop = options.loop ?? true;

        this.canvas = document.createElement('canvas');
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";


        this.duration = 1;
        this.size = [0.000001, 0.000001];
        
        this.currentScroll = 0; //in percentage
        this.currentScrollInPixels = 0; //in pixels
       
        this.pixelsPerSecond = 300;
        this.secondsPerPixel = 1 / this.pixelsPerSecond;
        this.animationClip = this.instantiateAnimationClip();
        this.trackHeight = 25;
        this.timeSeparators = [0.01, 0.1, 0.5, 1, 5];

        this.boxSelection = false;
        this.boxSelectionStart = [0,0];
        this.boxSelectionEnd = [0,0];

        this.active = true;
        this.skipVisibility = options.skipVisibility ?? false;
        this.skipLock = options.skipLock ?? false;
        this.disableNewTracks = options.disableNewTracks ?? false;

        this.optimizeThreshold = 0.01;

        this.header_offset = 48;

        // main area -- root
        this.mainArea = new LX.Area({className : 'lextimeline'});
        this.root = this.mainArea.root;
        this.mainArea.split({ type: "vertical", sizes: [this.header_offset, "auto"],  resize: false});

        // header
        this.header = new LX.Panel( { id: 'lextimelineheader'} );
        this.mainArea.sections[0].attach( this.header );
        this.updateHeader();
        
        // content area
        const contentArea = this.mainArea.sections[1];
        contentArea.root.id = "bottom-timeline-area";
        contentArea.split({ type: "horizontal", sizes: ["15%", "85%"] });
        let [ left, right ] = contentArea.sections;
        
        right.attach( this.canvas );
        this.canvasArea = right;
        this.canvasArea.root.classList.add("lextimelinearea");

        this.selectedItems = []; // [trackInfo, "groupId"], contains the visible items (tracks or groups) of the timeline
        this.leftPanel = left.addPanel( { className: 'lextimelinepanel', width: "100%", height: "100%" } );
        this.trackTreesPanel = null;
        this.trackTreesWidget = null;
        this.lastTrackTreesWidgetOffset = 0; // this.trackTreesWidget.innerTree.domEl.offsetTop - canvas.offsetTop. Check draw() 
        this.updateLeftPanel();

        if(this.uniqueID != '') {
            this.root.id = this.uniqueID;
            this.canvas.id = this.uniqueID + '-canvas';
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

        this.canvasArea.onresize = bounding => {
            if(!(bounding.width && bounding.height)) 
                return;
            this.resizeCanvas();
        }
        this.resize(this.size);

        // update color theme
        this.updateTheme();
        LX.addSignal( "@on_new_color_scheme", (el, value) => {
            // Retrieve again the color using LX.getThemeColor, which checks the applied theme
            this.updateTheme();
        } );
    }

    /**
     * @method updateHeader
     * @param {*}  
     */

    updateHeader() {
        this.header.clear();

        const header = this.header;
        header.sameLine();

        if( this.uniqueID )
        {
            header.addTitle(this.uniqueID, { style: { background: "none", fontSize: "18px", fontStyle: "bold", alignItems: "center" } } );
        }

        const buttonContainer = LX.makeContainer( ["auto", "100%"], "flex flex-row gap-1" );

        header.queue( buttonContainer );

        const playbtn = header.addButton("playBtn", '', (value, event) => {
           this.changeState();
        }, { buttonClass: "accept", title: "Play", hideName: true, icon: "Play@solid", swap: "Pause@solid" });
        playbtn.root.setState(this.playing, true);

        header.addButton("stopBtn", '', (value, event) => {
            this.setState(false, true); // skip callback of set state
            if ( this.onStateStop ){
                this.onStateStop();
            }
        }, { buttonClass: "accept", title: "Stop", hideName: true, icon: "Stop@solid" });

        header.addButton("loopBtn", '', ( value, event ) => {
            this.setLoopMode(!this.loop);
        }, { selectable: true, selected: this.loop, title: 'Loop', hideName: true, icon: "RefreshCw" });
        
        if( this.onCreateControlsButtons ){
            this.onCreateControlsButtons( header );
        }
        
        header.clearQueue( buttonContainer );
        header.addContent( "header-buttons", buttonContainer );

        // time number inputs - duration, current time, etc

        if( this.onCreateBeforeTopBar )
        {
            this.onCreateBeforeTopBar( header );
        }

        header.addNumber("Current Time", this.currentTime, (value, event) => {
            this.setTime(value)
        }, {
            units: "s",
            signal: "@on_set_time_" + this.uniqueID,
            step: 0.01, min: 0, precision: 3,
            skipSlider: true,
            nameWidth: "auto"
        });

        header.addNumber("Duration", + this.duration.toFixed(3), (value, event) => {
            this.setDuration(value, false, false);
        }, {
            units: "s",
            step: 0.01, min: 0,
            signal: "@on_set_duration_" + this.uniqueID,
            nameWidth: "auto"
        });
           
        if( this.onCreateAfterTopBar )
        {
            this.onCreateAfterTopBar( header );      
        }
        
        // settings buttons - optimize, settings, etc

        const buttonContainerEnd = LX.makeContainer( ["auto", "100%"], "flex flex-row gap-1" );
        header.queue( buttonContainerEnd );

        if( this.onCreateSettingsButtons ){
            this.onCreateSettingsButtons( header );
        }

        if( this.onShowOptimizeMenu )
        {
            header.addButton(null, "", (value, event) => {this.onShowOptimizeMenu(event)}, { tooltip: true, title: "Optimize", icon:"Filter" });
        }

        if( this.onShowConfiguration )
        {
            header.addButton(null, "", (value, event) => {
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
            }, { title: "Settings", icon: "Settings", tooltip: true })
        }

        header.clearQueue( buttonContainerEnd );
        header.addContent( "header-buttons-end", buttonContainerEnd );

        header.endLine( "justify-between" );
    }

    /**
    * @method updateLeftPanel
    * 
    */
    updateLeftPanel( ) {

        const scrollTop = this.trackTreesPanel ? this.trackTreesPanel.root.scrollTop : 0;
        this.leftPanel.clear();

        const panel = this.leftPanel;
        
        panel.sameLine( 2 );
        let titleWidget = panel.addTitle( "Tracks", { style: { background: "none"}, className: "fg-secondary text-lg px-4"} );
        let title = titleWidget.root;
        
        if( !this.disableNewTracks ) 
        {
            panel.addButton("addTrackBtn", '', (value, event) => {
                if ( this.onAddNewTrackButton ){
                    this.onAddNewTrackButton();
                }else{
                    const trackIdx = this.addNewTrack();
                    this.changeSelectedItems( [trackIdx] );
                }
            }, { hideName: true, title: "Add Track", icon: "Plus" });
        }
        panel.endLine();

        const styles = window.getComputedStyle( title );
        const titleHeight = title.clientHeight + parseFloat(styles['marginTop']) + parseFloat(styles['marginBottom']);
        
        let p = new LX.Panel({height: "calc(100% - " + titleHeight + "px)"});

        let treeTracks = [];
        if( this.animationClip && this.selectedItems.length )
        {
            treeTracks = this.generateSelectedItemsTreeData();
        }
        this.trackTreesWidget = p.addTree(null, treeTracks, {filter: false, rename: false, draggable: false, onevent: (e) => {
            switch(e.type) {
                case LX.TreeEvent.NODE_SELECTED:
                    if (e.node.trackData){
                        this.selectTrack(e.node.trackData.trackIdx);
                    }
                    break;
                case LX.TreeEvent.NODE_VISIBILITY:   
                    if (e.node.trackData){
                        this.setTrackState( e.node.trackData.trackIdx, e.value );
                    } 
                    break;
                case LX.TreeEvent.NODE_CARETCHANGED:
                    break;
            }
        }});
        // setting a name in the addTree function adds an undesired node
        this.trackTreesWidget.name = "tracksTrees";
        p.widgets[this.trackTreesWidget.name] = this.trackTreesWidget;

        this.trackTreesPanel = p;
        panel.attach( p.root );
        p.root.addEventListener("scroll", e => {
            if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight){
                this.currentScroll = e.currentTarget.scrollTop / (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
                this.currentScrollInPixels = e.currentTarget.scrollTop;
            }
            else{
                this.currentScroll = 0;
                this.currentScrollInPixels = 0;
            }
        });

        this.trackTreesPanel.root.scrollTop = scrollTop;

        if( this.leftPanel.parent.root.classList.contains("hidden") || !this.root.parentElement ){
            return;
        }

        this.resizeCanvas();
    }

    /**
     * @param {object} options options for the new track 
     *  { id: string, active: bool, locked: bool, } 
     * @returns 
     */
    addNewTrack( options = {}, skipCallback = false ) {

        const trackInfo = this.instantiateTrack(options);
        trackInfo.trackIdx = this.animationClip.tracks.length;
        this.animationClip.tracks.push( trackInfo );
        
        if ( this.onAddNewTrack && !skipCallback ){
            this.onAddNewTrack( trackInfo, options );
        }
        return trackInfo.trackIdx;
    }

    /**
     * Finds tracks (wholy and partially) inside the range minY maxY.
     * (Full) Canvas local coordinates.
     * @param {number} minY 
     * @param {number} maxY 
     * @returns array of trackDatas
     */
    getTracksInRange( minY, maxY ) {

        let tracks = [];

        // Manage negative selection
        if( minY > maxY )
        {
            let aux = minY;
            minY = maxY;
            maxY = aux;
        }

        const elements = this.trackTreesWidget.innerTree.domEl.children[0].children; // children of 'ul'
        if ( elements.length < 1 ){
            return [];
        }

        const startY = minY - this.lastTrackTreesWidgetOffset + this.currentScrollInPixels;
        const endY = maxY - this.lastTrackTreesWidgetOffset + this.currentScrollInPixels;

        const startIdx = Math.max( 0, Math.floor( startY / this.trackHeight ) );
        const endIdx = Math.min( elements.length-1, Math.floor( endY / this.trackHeight ) ) + 1;

        for(let i = startIdx; i < endIdx; ++i)
        {
            const e = elements[i];
            if ( e.treeData && e.treeData.trackData ){
                tracks.push(e.treeData.trackData);               
            }
        }

        return tracks;
    }

    /**
     * @method setAnimationClip
     * @param {*} animation 
     * @param {boolean} needsToProcess
     * @param {obj} processOptions 
     * [KeyFrameTimeline] - each track should contain an attribute "dim" to indicate the value dimension (e.g. vector3 -> dim=3). Otherwise dimensions will be infered from track's values and times. Default is 1
     */
    setAnimationClip( animation, needsToProcess = true ) {

        if ( this.unSelectAllKeyFrames ){
            this.unSelectAllKeyFrames();    
        }
        if ( this.unHoverAll ){
            this.unHoverAll();
        }
        this.unSelectAllTracks();
        this.selectedItems = [];

        this.clearState();

        if( !animation || !animation.tracks || needsToProcess )
        { 
            this.animationClip = this.processTracks( animation ); // generate default animationclip or process the user's one
        }
        else
        {
            this.animationClip = animation;
        }
       
        this.setDuration(this.animationClip.duration, true, true);

        this.updateLeftPanel();

        this.resize();

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
        ctx.fillRect( 0, 0, this.canvas.width, h );
        ctx.strokeStyle = Timeline.FONT_COLOR_PRIMARY;

        // set tick and sub tick times
        let tickTime = 4;
        if ( this.pixelsPerSecond > 900 ) { tickTime = 1; }
        else if ( this.pixelsPerSecond > 100 ) { tickTime = 2; }
        else if ( this.pixelsPerSecond > 50 ) { tickTime = 3; }

        let subtickTime = this.timeSeparators[tickTime - 1];
        tickTime = this.timeSeparators[tickTime];

        const startTime = this.visualTimeRange[0];
        const endTime = this.visualTimeRange[1];
        // Transform times into pixel coords
        let tickX = this.timeToX( startTime + tickTime ) - this.timeToX( startTime );
        let subtickX = subtickTime * tickX / tickTime; 

        let startx = this.timeToX( Math.floor( startTime / tickTime) * tickTime ); // floor because might need to draw previous subticks
        startx += 0.0000001; // slight offset to avoid "-0.0"
        let endx = this.timeToX( endTime ); // draw up to endTime

        // Begin drawing
        ctx.beginPath();
        ctx.fillStyle = Timeline.FONT_COLOR_PRIMARY;
        ctx.globalAlpha = 1;

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
        ctx.globalAlpha = 1;

        // Content
        const topMargin = this.topMargin; 
        const treeOffset = this.lastTrackTreesWidgetOffset;
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
        if(pos < 0)
            pos = 0;
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
        ctx.globalAlpha = 1;

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        const scrollableHeight = this.trackTreesWidget.root.scrollHeight;
        // tree has gaps of 0.25rem (4px) inbetween entries but not in the beginning nor ending. Move half gap upwards.
        const treeOffset = this.lastTrackTreesWidgetOffset = this.trackTreesWidget.innerTree.domEl.offsetTop - this.canvas.offsetTop -2;

        if ( this.trackTreesPanel.root.scrollHeight > 0 ){
            const ul = this.trackTreesWidget.innerTree.domEl.children[0];
            this.trackHeight = ul.children.length < 1 ? 25 : ((ul.offsetHeight+4) / ul.children.length);
        }
        
        //zoom
        let startTime = this.visualOriginTime; //seconds
        startTime = Math.min( this.duration, Math.max( 0, startTime ) );
        let endTime = this.visualOriginTime + w * this.secondsPerPixel; //seconds
        endTime = Math.max( startTime, Math.min( this.duration, endTime ) );
        this.visualTimeRange[0] = startTime;
        this.visualTimeRange[1] = endTime;
        
        // Background
        ctx.globalAlpha = 1;
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
        if( (h-this.topMargin) < scrollableHeight ){
            ctx.fillStyle = "#222";
            ctx.fillRect( w - 10, 0, 10, h );

            ctx.fillStyle = this.grabbingScroll ? Timeline.FONT_COLOR_TERTIARY : Timeline.FONT_COLOR_QUATERNARY;
           
            let scrollBarHeight = Math.max( 10, (h-this.topMargin)* (h-this.topMargin)/ this.trackTreesPanel.root.scrollHeight);
            let scrollLoc = this.currentScroll * ( h - this.topMargin - scrollBarHeight ) + this.topMargin;
            ctx.roundRect( w - 10, scrollLoc, 10, scrollBarHeight, 5, true );
        }

        this.drawTimeInfo(w);

        // Current time marker vertical line
        let posx = Math.round( this.timeToX( this.currentTime ) );
        let posy = this.topMargin * 0.4;
        if(posx >= 0)
        {
            ctx.strokeStyle = ctx.fillStyle = Timeline.TIME_MARKER_COLOR;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(posx, posy * 0.6); ctx.lineTo(posx, this.canvas.height);//line
            ctx.stroke();
            ctx.closePath();
            ctx.shadowBlur = 8;
            ctx.shadowColor = Timeline.TIME_MARKER_COLOR;
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
        ctx.fillStyle = Timeline.TIME_MARKER_COLOR_TEXT;
        ctx.fillText( (Math.floor(this.currentTime*10)*0.1).toFixed(1), posx, this.topMargin * 0.6 );

        // Selections
        ctx.strokeStyle = ctx.fillStyle = Timeline.FONT_COLOR_PRIMARY;
        if(this.boxSelection) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = Timeline.BOX_SELECTION_COLOR;
            ctx.strokeRect( this.boxSelectionStart[0], this.boxSelectionStart[1], this.boxSelectionEnd[0] - this.boxSelectionStart[0], this.boxSelectionEnd[1] - this.boxSelectionStart[1]);
            ctx.fillRect( this.boxSelectionStart[0], this.boxSelectionStart[1], this.boxSelectionEnd[0] - this.boxSelectionStart[0], this.boxSelectionEnd[1] - this.boxSelectionStart[1]);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

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
            if (marker.time < this.visualTimeRange[0] - this.secondsPerPixel * 100 ||
                marker.time > this.visualTimeRange[1])
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

    setDuration( t, skipCallback = false, updateHeader = true ) {
        let v = Math.max(0,t);
        this.duration = this.animationClip.duration = v; 

        if(updateHeader) {
            LX.emit( "@on_set_duration_" + this.uniqueID, + this.duration.toFixed(2)); // skipcallback = true
        }

        if( this.onSetDuration && !skipCallback ) 
            this.onSetDuration( this.duration );	 
    }

    setTime(time, skipCallback = false ){
        this.currentTime = Math.max(0,Math.min(time,this.duration));
        LX.emit( "@on_set_time_" + this.uniqueID, +this.currentTime.toFixed(2)); // skipcallback = true

        if(this.onSetTime && !skipCallback)
            this.onSetTime(this.currentTime);
    }

    // Converts distance in pixels to time
    xToTime( x ) {
        return x * this.secondsPerPixel + this.visualOriginTime;
    }

    // Converts time to disance in pixels
    timeToX( t ) {
        return (t - this.visualOriginTime) * this.pixelsPerSecond;
    }
    
    /**
     * @method setScale
     * @param {*} pixelsPerSecond >0.  totalVisiblePixels / totalVisibleSeconds.  
     */

    setScale( pixelsPerSecond ) {
        const xCurrentTime = this.timeToX(this.currentTime);
        this.pixelsPerSecond = pixelsPerSecond;
        this.pixelsPerSecond = Math.max( 0.00001, this.pixelsPerSecond );

        this.secondsPerPixel = 1 / this.pixelsPerSecond;
        this.visualOriginTime += this.currentTime - this.xToTime(xCurrentTime);
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
        let isHoveringTimeBar = localY < this.topMargin && 
                                localX > (timeX - 6) && localX < (timeX + 6);

        const time = this.xToTime(x, true);

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
                if ( e.wheelDelta ){
                    let mouseTime = this.xToTime(localX);
                    this.setScale( this.pixelsPerSecond * (e.wheelDelta < 0 ? 0.95 : 1.05) );
                    this.visualOriginTime = mouseTime - localX * this.secondsPerPixel;
                }

            }
            else if( (h-this.topMargin) < this.trackTreesWidget.root.scrollHeight)
            {              
                this.trackTreesPanel.root.scrollTop += e.deltaY; // wheel deltaY
            }
            
            if ( this.onMouse ){
                this.onMouse(e, time);
            }
            return;
        }

        const is_inside = x >= 0 && x <= this.size[0] &&
                        y >= 0 && y <= this.size[1];

        let track = this.getTracksInRange(localY, localY);
        track = track.length ? track[0] : null;

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
            // e.preventDefault();
            
            this.clickTime = LX.UTILS.getTime();

            if(e.shiftKey && this.active) {
                this.boxSelection = true;
                this.boxSelectionEnd[0] = this.boxSelectionStart[0] = localX; 
                this.boxSelectionEnd[1] = this.boxSelectionStart[1] = localY;
                return; // Handled
            }
            else if( e.localY < this.topMargin ){
                this.grabbing = true;
                this.grabbingTimeBar = true;
                this.setTime(time);
            }
            else if( (h-this.topMargin) < this.trackTreesWidget.root.scrollHeight && x > w - 10 ) { // grabbing scroll bar
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
                this.boxSelectionEnd[1] = localY;
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
                    // will automatically call scroll event
                    if ( y < this.topMargin ){
                        this.trackTreesPanel.root.scrollTop = 0;
                    }
                    else{
                        this.trackTreesPanel.root.scrollTop += this.trackTreesPanel.root.scrollHeight * e.deltay / (h-this.topMargin);
                    }
                }
                else
                {
                    // Move timeline in X (independent of current time)
                    var old = this.xToTime( this.lastMouse[0] );
                    var now = this.xToTime( e.offsetX );
                    this.visualOriginTime += (old - now);

                    this.trackTreesPanel.root.scrollTop -= e.deltay; // will automatically call scroll event

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
            this.onMouse( e, time );

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
     * @param {bool} skipCallback defaults false
     * @description change play/pause state
     **/
    changeState(skipCallback = false) {
        this.setState(!this.playing, skipCallback);
    }
    /**
     * @method setState
     * @param {bool} state
     * @param {bool} skipCallback defaults false
     * @description change play/pause state
     **/
    setState(state, skipCallback = false) {
        this.playing = state;

        this.header.widgets.playBtn.root.setState(this.playing, true);

        if(this.onStateChange && !skipCallback) {
            this.onStateChange(this.playing);
        }
    }

    /**
     * @method setLoopMode
     * @param {bool} loopState 
     * @param {bool} skipCallback defaults false
     * @description change loop mode of the timeline
     */
    setLoopMode(loopState, skipCallback = false){
        this.loop = loopState;
        if ( this.loop ){
            this.header.widgets.loopBtn.root.children[0].classList.add("selected");
        }else{
            this.header.widgets.loopBtn.root.children[0].classList.remove("selected")
        }
        if( this.onChangeLoopMode && !skipCallback ){
            this.onChangeLoopMode( this.loop );
        }
    }


    /**
     * [ trackIdx ]
     * @param {Array} itemsName array of numbers identifying tracks
     */
    setSelectedItems( items ) {
        this.selectedItems = [];      
        this.changeSelectedItems( items, null );
    }

    /**
     * @param {*} itemsToAdd [ trackIdx ], array of numbers identifying tracks by their index
     * @param {*} itemsToRemove [ trackIdx ], array of numbers identifying tracks by their index
     */
    changeSelectedItems( itemsToAdd = null, itemsToRemove = null, skipCallback = false ) {

        const tracks = this.animationClip.tracks;

        if ( itemsToRemove ){
            for( let i = 0; i < itemsToRemove.length; ++i){
                const compareObj = itemsToRemove[i];
                for( let s = 0; s < this.selectedItems.length; ++s){
                    if (this.selectedItems[s] === compareObj){
                        this.selectedItems.splice(s, 1);
                        break;
                    }
                }
            }
        }

        if ( itemsToAdd ){
            for( let i = 0; i < itemsToAdd.length; ++i ){
                const v = itemsToAdd[i];
                if ( tracks[v] ) {
                    this.selectedItems.push( tracks[v] );
                }
            }
        }

        
        this.updateLeftPanel();

        if(this.onItemSelected && !skipCallback){
            this.onItemSelected(this.selectedItems, itemsToAdd, itemsToAdd);
        }
    }

    /**
     * It will find the first occurrence of trackId in animationClip.tracks
     * @param {string} trackId 
     * @returns 
     */
    getTrack( trackId ){
        const tracks = this.animationClip.tracks;
        for( let i = 0; i < tracks.length; ++i){
            if ( tracks[i].id == trackId ){
                return tracks[i];
            }
        }
        return null;
    }

    /**
     * Only affects render visualisation
    * @method selectTrack
    * @param {int} trackIdx
    * // NOTE: to select a track from outside of the timeline, a this.trackTreesWidget.innerTree.select(item) needs to be called.
    */
    selectTrack( trackIdx ) {

        if( !this.animationClip ){
            return;
        }

        this.unSelectAllTracks();
        
        let track = this.animationClip.tracks[ trackIdx ];
        track.isSelected = true;
        
        if( this.onSelectTrack ){
            this.onSelectTrack(track);
        }
    }

    // Only affects render visualisation
    unSelectAllTracks() {

        if( !this.animationClip ){
            return;
        }

        const tracks = this.animationClip.tracks;
        for(let i = 0; i < tracks.length; i++){
            tracks[ i ].isSelected = false;
        }
    }
// --------------------------------------------------
    /**
    * @method setTrackState
    * @param {int} trackIdx 
    * @param {boolean} isEnbaled
    */
    setTrackState(trackIdx, isEnbaled = true) {
        const track = this.animationClip.tracks[trackIdx];
            
        const oldState = track.active;
        track.active = isEnbaled;

        if(this.onSetTrackState)
            this.onSetTrackState(track, oldState);
    }

    /**
     * @method resize
     * @param {*} size
     */
    resize( size = [this.root.parentElement.clientWidth, this.root.parentElement.clientHeight]) {

        this.size[0] = size[0]; 
        this.size[1] = size[1]; 
        //this.content_area.setSize([size[0], size[1] - this.header_offset]);
        this.mainArea.sections[1].root.style.height = "calc(100% - "+ this.header_offset + "px)";

        let w = size[0] - this.leftPanel.root.clientWidth - 8;
        this.mainArea.sections[1]._update(); // update area's this.size attribute

        this.resizeCanvas();     
    }

    resizeCanvas( ) {
        this.canvas.width = this.canvasArea.root.clientWidth;
        this.canvas.height = this.canvasArea.root.clientHeight;
    }

    /**
    * @method hide
    * Hide timeline area
    */
    hide() {
        this.mainArea.hide();
    }

    /**
    * @method show
    * Show timeline area if it is hidden
    */
    show() {
        this.mainArea.show();
        this.resize();        
        this.updateLeftPanel();
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
        Timeline.FONT_COLOR_TERTIARY = LX.getThemeColor("global-text-tertiary");
        Timeline.FONT_COLOR_QUATERNARY = LX.getThemeColor("global-text-quaternary");
        
        Timeline.KEYFRAME_COLOR = LX.getThemeColor("lxTimeline-keyframe");
        Timeline.KEYFRAME_COLOR_SELECTED = Timeline.KEYFRAME_COLOR_HOVERED = LX.getThemeColor("lxTimeline-keyframe-selected");
        Timeline.KEYFRAME_COLOR_LOCK = LX.getThemeColor("lxTimeline-keyframe-locked");
        Timeline.KEYFRAME_COLOR_EDITED = LX.getThemeColor("lxTimeline-keyframe-edited");
        Timeline.KEYFRAME_COLOR_INACTIVE =LX.getThemeColor("lxTimeline-keyframe-inactive");
    }


    // ----- BASE FUNCTIONS -----
    /**
        These functions might be overriden by child classes. Nonetheless, they must have the same attributes, at least.
        Usually call a super.whateverFunction to generate its base form, and expand it with extra attributes
    */

    /**
     * This functions uses the selectedItems and generates the data that will feed the LX.Tree widget.
     * This function is used by updateLeftPanel. Some timelines might allow grouping of tracks. Such timelines may overwrite this function
     * WARNING: track entries MUST have an attribute of 'trackData' with the track info
     * @returns lexgui tree data as expecte for the creation of a tree
     */
    generateSelectedItemsTreeData(){
        const treeTracks = [];
        for( let i = 0; i < this.selectedItems.length; i++ ){
            const track = this.selectedItems[ i ];
            treeTracks.push({'trackData': track, 'id': track.id, 'skipVisibility': this.skipVisibility, visible: track.active, 'children':[], actions : this.skipLock ? null : [{
                'name':'Lock edition',
                'icon': (track.locked ? 'Lock' : 'LockOpen'),
                'swap': (track.locked ? 'LockOpen' : 'Lock'),
                'callback': (node, el) => {
                    let value = el.classList.contains('Lock');
                    
                    if(value) {
                        el.title = 'Lock edition';
                        el.classList.remove('Lock');
                        el.classList.add('LockOpen');    
                    }
                    else {
                        el.title = 'Unlock edition';
                        el.classList.remove('LockOpen');
                        el.classList.add('Lock');                                 
                    }

                    node.trackData.locked = !value;
                    if(this.onLockTrack){
                        this.onLockTrack(el, node.trackData, node)
                    }
                }
            }]});
        }
        return treeTracks;
    }


    /**
     * 
     * @param {obj} options set some values for the track instance (groups and trackIdx not included)
     * @returns 
     */
    instantiateTrack(options = {}) { 
        return {
            isTrack: true,
            id: options.id ?? ( Math.floor(performance.now().toString()) + "_" + Math.floor(Math.random() * 0xffff) ), //must be unique, at least inside a group
            active: options.active ?? true,
            locked: options.locked ?? false,
            isSelected: false, // render only        
            trackIdx: -1,
            data: options.data ?? null// user defined data
        }
    }

    /**
     * @param {obj} options sets some attributes. Tracks and tracksPerGroup are directly assigned, not sliced 
     * @returns 
     */
    instantiateAnimationClip(options) {
        options = options ?? {};
        return {
            name: options.name ?? "animationClip",
            duration: options.duration ?? 0,
            tracks: [],
            tracksPerGroup: options.tracksPerGroup ?? {},
            data: options.data ?? null,
        };
    }
    // ----- END OF BASE FUNCTIONS -----
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
Timeline.FONT_COLOR_TERTIARY = LX.getThemeColor("global-text-tertiary");
Timeline.FONT_COLOR_QUATERNARY = LX.getThemeColor("global-text-quaternary");
Timeline.TIME_MARKER_COLOR = LX.getThemeColor("global-color-accent");
Timeline.TIME_MARKER_COLOR_TEXT = "#ffffff";

LX.setThemeColor("lxTimeline-keyframe", "light-dark(#2d69da,#2d69da)");
LX.setThemeColor("lxTimeline-keyframe-selected", "light-dark(#f5c700,#fafa14)");
LX.setThemeColor("lxTimeline-keyframe-hovered", "light-dark(#f5c700,#fafa14)");
LX.setThemeColor("lxTimeline-keyframe-locked", "light-dark(#c62e2e,#ff7d7d)");
LX.setThemeColor("lxTimeline-keyframe-edited", "light-dark(#00d000,#00d000)");
LX.setThemeColor("lxTimeline-keyframe-inactive", "light-dark(#706b6b,#706b6b)");
Timeline.KEYFRAME_COLOR = LX.getThemeColor("lxTimeline-keyframe");
Timeline.KEYFRAME_COLOR_SELECTED = Timeline.KEYFRAME_COLOR_HOVERED = LX.getThemeColor("lxTimeline-keyframe-selected");
Timeline.KEYFRAME_COLOR_LOCK = LX.getThemeColor("lxTimeline-keyframe-locked");
Timeline.KEYFRAME_COLOR_EDITED = LX.getThemeColor("lxTimeline-keyframe-edited");
Timeline.KEYFRAME_COLOR_INACTIVE =LX.getThemeColor("lxTimeline-keyframe-inactive");
Timeline.BOX_SELECTION_COLOR = "#AAA";
LX.Timeline = Timeline;

/**
 * @class KeyFramesTimeline
 */

class KeyFramesTimeline extends Timeline {       

    static ADDKEY_VALUEARRAYS = 0x01;
    /**
     * @param {string} name unique string
     * @param {object} options = {animationClip, selectedItems, x, y, width, height, canvas, trackHeight}
     */
    constructor(name, options = {}) {

        super(name, options);
        
        this.lastKeyFramesSelected = [];

        // curves --- track.dim == 1
        this.keyValuePerPixel = 1/this.trackHeight; // used onMouseMove, vertical move only for dim==1. Normalized value movement / pixels
        this.defaultCurves = true; // whn a track with dim == 1 has no curves attribute, defaultCurves will be used instead. If true, track is rendered using curves

        if(this.animationClip) {
            this.setAnimationClip(this.animationClip);
        }
    }

    
    /**
     * @param {object} options options for the new track 
     *  { id: string, active: bool, locked: bool, } 
     * @returns 
     */
    addNewTrack( options = {}, skipCallback = false ) {

        const trackInfo = this.instantiateTrack(options);
        trackInfo.trackIdx = this.animationClip.tracks.length;
        this.animationClip.tracks.push( trackInfo );
        
        if ( this.onAddNewTrack && !skipCallback ){
            this.onAddNewTrack( trackInfo, options ); // if user wants it on a group, they should use these callback 
        }

        return trackInfo.trackIdx;
    }

    // OVERRIDE
    generateSelectedItemsTreeData(){
        const treeTracks = [];
        const tracksPerGroup = this.animationClip.tracksPerGroup;
        for( let i = 0; i < this.selectedItems.length; i++ ){
            const item = this.selectedItems[ i ];
            const isGroup = !item.isTrack;
            const itemTracks = isGroup ? tracksPerGroup[item] : [item];  
            const nodes = [];

            for( let j = 0; j < itemTracks.length; j++ ){
                const track = itemTracks[j];
                nodes.push({'trackData': track, 'id': track.id, 'skipVisibility': this.skipVisibility, visible: track.active, 'children':[], actions : this.skipLock ? null : [{
                    'name':'Lock edition',
                    'icon': (track.locked ? 'Lock' : 'LockOpen'),
                    'swap': (track.locked ? 'LockOpen' : 'Lock'),
                    'callback': (node, el) => {
                        let value = el.classList.contains('Lock');
                     
                        if(value) {
                            el.title = 'Lock edition';
                            el.classList.remove('Lock');
                            el.classList.add('LockOpen');    
                        }
                        else {
                            el.title = 'Unlock edition';
                            el.classList.remove('LockOpen');
                            el.classList.add('Lock');                                 
                        }

                        node.trackData.locked = !value;
                        if(this.onLockTrack){
                            this.onLockTrack(el, node.trackData, node)
                        }
                    }
                }]});
            }
            if ( isGroup ){
                const t = { 
                    'id': item, 
                    'skipVisibility': true, 
                    'children': nodes 
                };
                treeTracks.push( t );
            }else{
                treeTracks.push( nodes[0] );
            }
        }
        return treeTracks;
    }

    /**
     * OVERRIDE
     * @param {obj} options track information that wants to be set to the new track
     *  id, dim, values, times, selected, edited, hovered
     * @returns 
     */
    instantiateTrack(options ={}){
        const track = super.instantiateTrack(options);
        track.dim = Math.max(1,options.dim ?? 1); // >= 1
        track.groupId = null,
        track.groupTrackIdx = -1, // track Idx inside group only if in group

        track.values = new Float32Array(0); 
        track.times = new Float32Array(0);
        track.selected = [];
        track.edited = [];
        track.hovered = [];

        if ( options.values && options.times ){
            track.values = options.values;
            track.times = options.times;
            
            const numFrames = track.times.length;
            if ( options.selected && options.selected.length == numFrames ){
                track.selected = options.selected;
            }else{ 
                track.selected = (new Array(numFrames)).fill(false);
            }
            if ( options.edited && options.edited.length == numFrames ){
                track.edited = options.edited;
            }else{ 
                track.edited = (new Array(numFrames)).fill(false);
            }
            if ( options.hovered && options.hovered.length == numFrames ){
                track.hovered = options.hovered;
            }else{ 
                track.hovered = (new Array(numFrames)).fill(false);
            }
        }

        track.curves = options.curves ?? this.defaultCurves; // only works if dim == 1
        track.curvesRange = options.curvesRange ?? [0,1];
        return track;
    }

    /**
     * OVERRIDE
     * @param {*} itemsToAdd [ trackIdx, "groupId" ], array of strings and/or number identifying groups and/or tracks
     * @param {*} itemsToRemove [ trackIdx, "groupId" ], array of strings and/or number identifying groups and/or tracks
     */
    changeSelectedItems( itemsToAdd = null, itemsToRemove = null, skipCallback = false ) {

        // TODO: maybe make this un-functions more general
        this.unSelectAllKeyFrames();
        this.unHoverAll();
        
        const tracks = this.animationClip.tracks;
        const tracksPerGroup = this.animationClip.tracksPerGroup;

        if ( itemsToRemove ){
            for( let i = 0; i < itemsToRemove.length; ++i){
                const isGroup = isNaN(itemsToRemove[i]);
                let compareObj = isGroup ? itemsToRemove[i] : tracks[itemsToRemove[i]]; // trackData or groupId
                for( let s = 0; s < this.selectedItems.length; ++s){
                    if (this.selectedItems[s] === compareObj){
                        const size = isGroup ? tracksPerGroup[ compareObj ].length : 1;
                        this.selectedItems.splice(s, size);
                        break;
                    }
                }
            }
        }

        if ( itemsToAdd ){
            for( let i = 0; i < itemsToAdd.length; ++i ){
                const v = itemsToAdd[i];
                if ( isNaN(v) ){ // assuming it is a string
                    if ( tracksPerGroup[ v ] ){  
                        this.selectedItems.push( v );
                    }
                }else if ( tracks[v] ) {
                    this.selectedItems.push( tracks[v] );
                }
            }
        }

        
        this.updateLeftPanel();

        if(this.onItemSelected && !skipCallback){
            this.onItemSelected(this.selectedItems, itemsToAdd, itemsToAdd);
        }
    }

    /**
     * @param {string} groupId unique identifier
     * @param {array} groupTracks [ "trackID", trackIdx ] array of strings and/or numbers of the existing tracks to include in this group. A track can only be part of 1 group
     *  if groupTracks == null, groupId is removed from the list
     */
    setTracksGroup( groupId, groupTracks = null ){
        const tracks = this.animationClip.tracks;
        const tracksPerGroup = this.animationClip.tracksPerGroup;
        const result = [];

        let selectedItemsCounter = -1;

        if ( tracksPerGroup[groupId] ){
            // if group exists, ungroup tracks.
            tracksPerGroup[groupId].forEach(t => {
                t.groupId = null;
                t.groupTrackIdx = -1;
            });

            // modify groups cannot appear more than once
            for( let i = 0; i < this.selectedItems.length; ++i ){                
                if (this.selectedItems[i] === groupId){
                    selectedItemsCounter = i;
                    break;
                }
            }
        }

        if ( !groupTracks ){
            delete tracksPerGroup.groupId;
            // remove entry from selectedItems
            if( selectedItemsCounter > -1 ){
                this.selectedItems.splice(selectedItemsCounter, 1); 
            }
            return;
        }

        // find tracks and group them
        for (let i = 0; i < groupTracks.length; ++i){
            const v = groupTracks[i];
            let track = null;
            if ( isNaN(v) ){
                // v is an id  (string)
                for( let t = 0; t < tracks.length; ++t ){ 
                    if (tracks[t].id == v){
                        track = tracks[t];
                        break;
                    }
                }
            }
            else if( tracks[v] ) {
                track = tracks[v];
            }

            if ( track ){
                track.groupId = groupId;
                track.groupTrackIdx = result.length;
                result.push( track );
            }
        }

        tracksPerGroup[ groupId ] = result;

        // if group is currently visible
        if ( selectedItemsCounter > -1){
            this.updateLeftPanel();
        }
    }

    /**
     * @param {string} groupId
     * @returns array of tracks or null 
     */
    getTracksGroup( groupId ){
        return this.animationClip.tracksPerGroup[ groupId ] ?? null;
    }

    /**
     * OVERRIDE
     * @param {string} trackId 
     * @param {string} groupId optionl. If not set, it will find the first occurrence of trackId in animationClip.tracks
     * @returns 
     */
    getTrack( trackId, groupId = null ){
        let tracks = this.animationClip.tracks;
        if (groupId){
            tracks = this.animationClip.tracksPerGroup[ groupId ] ?? [];
        }
        for( let i = 0; i < tracks.length; ++i){
            if ( tracks[i].id == trackId ){ 
                return tracks[i];
            }
        }
        return null;
    }

    onMouseUp( e, time )  {

        let track = e.track;
        let localX = e.localX;
        let discard = e.discard; // true when too much time has passed between Down and Up
        
        if(e.shiftKey) {
            e.multipleSelection = true;
            // Manual multiple selection
            if(!discard && track) {
                const keyFrameIdx = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.secondsPerPixel * 5 );   
                if ( keyFrameIdx > -1 ){
                    track.selected[keyFrameIdx] ?
                    this.unSelectKeyFrame(track, keyFrameIdx) :
                    this.processCurrentKeyFrame( e, keyFrameIdx, track, null, true ); 
                }
            }
            // Box selection
            else if(this.boxSelection) {                
                let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1]);
                
                for(let t of tracks) {
                    let keyFrameIndices = this.getKeyFramesInRange(t, 
                        this.xToTime( this.boxSelectionStart[0] ), 
                        this.xToTime( this.boxSelectionEnd[0] ),
                        this.secondsPerPixel * 5);
                        
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
                const keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.secondsPerPixel * 5 );
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
            const tracks = this.animationClip.tracks;
            for(let selectedKey of this.lastKeyFramesSelected) {
                let [trackIdx, keyIndex, keyTime] = selectedKey;
                const track = tracks[trackIdx];
                
                // save track states only once
                if (this.moveKeyMinTime < Infinity){
                    let state = this.trackStateUndo[this.trackStateUndo.length-1];
                    let s = 0;
                    for( s = 0; s < state.length; ++s){
                        if ( state[s].trackIdx == track.trackIdx ){ break; }
                    }
                    if( s == state.length ){
                        this.saveState(track.trackIdx, true);
                    }
                }else{
                    this.saveState(track.trackIdx, false);               
                }

                selectedKey[2] = track.times[keyIndex]; // update original time just in case 
                this.moveKeyMinTime = Math.min( this.moveKeyMinTime, selectedKey[2] );
            }
            
            this.timeBeforeMove = this.xToTime( localX );
        }
        else if( e.altKey ){ // if only altkey, do not grab timeline
            this.grabbing = false;
            this.grabbingTimeBar = false;
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

            if ( e.ctrlKey ){
                this.moveKeyMinTime += deltaTime;
                const tracks = this.animationClip.tracks;
                for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                    let idx = i;
                    if ( deltaTime > 0 ){
                        idx = this.lastKeyFramesSelected.length - 1 - i;
                    }
                    
                    const [trackIdx, keyIndex, originalKeyTime] = this.lastKeyFramesSelected[idx];
                    track = tracks[trackIdx];
                    if(track && track.locked)
                        continue;

                    this.canvas.style.cursor = "grabbing";

                    const times = this.animationClip.tracks[ track.trackIdx ].times;
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
                    this.lastKeyFramesSelected[idx][1] = k; // update keyframe index
                    this.lastKeyFramesSelected[idx][2] = times[k]; // update keyframe time
                }

                if ( this.onContentMoved ){
                    for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                        const [trackIdx, keyIndex, originalKeyTime] = this.lastKeyFramesSelected[i];
                        track = this.animationClip.tracks[trackIdx];
                        if(track && track.locked)
                            continue;
                        this.onContentMoved(trackIdx, keyIndex);
                    }
                }
            }
            if ( !e.altKey || !(e.buttons & 0x01) ){
                return;
            }
        }

        // Track.dim == 1:  move keyframes vertically (change values instead of time) 
        // RELIES ON SORTED ARRAY OF lastKeyFramesSelected
        if ( e.altKey && e.buttons & 0x01 ){
            const tracks = this.animationClip.tracks;
            let lastTrackChanged = -1;
            for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
                const [trackIdx, keyIndex, originalKeyTime] = this.lastKeyFramesSelected[i];
                track = tracks[trackIdx];
                if(track.locked || track.dim != 1 || !track.curves){
                    continue;
                }

                let value = track.values[keyIndex];
                let delta = e.deltay * this.keyValuePerPixel * (track.curvesRange[1]-track.curvesRange[0]); 
                track.values[keyIndex] = Math.max(track.curvesRange[0], Math.min(track.curvesRange[1], value - delta)); // invert delta because of screen y
                track.edited[keyIndex] = true;

                if ( this.onUpdateTrack && track.trackIdx != lastTrackChanged && lastTrackChanged > -1){ // do it only once all keyframes of the same track have been modified
                    this.onUpdateTrack( [track.trackIdx] );
                }
                lastTrackChanged = track.trackIdx;
            }
            if( this.onUpdateTrack && lastTrackChanged > -1 ){ // do the last update, once the last track has been processed
                this.onUpdateTrack( [track.trackIdx] );
            }
            return;
        }

        if( this.grabbing && e.button != 2) {

        }
        else if(track) {

            this.unHoverAll();
            let keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.secondsPerPixel * 5 );
            if(keyFrameIndex > -1 ) {
                if(track && track.locked)
                    return;
                
                this.lastHovered = [track.trackIdx, keyFrameIndex];
                track.hovered[keyFrameIndex] = true;   
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
        if(this.lastKeyFramesSelected && this.lastKeyFramesSelected.length) {
            actions.push(
                {
                    title: "Copy",
                    callback: () => {
                        this.copySelectedContent();
                    }
                }
            );
            actions.push(
                {
                    title: "Delete",
                    callback: () => {
                        this.deleteSelectedContent({});
                    }
                }
            );
            if(this.lastKeyFramesSelected.length == 1 && this.clipboard && this.clipboard.value)
            {
                actions.push(
                    {
                        title: "Paste Value",
                        callback: () => {
                            this.pasteContentValue();
                        }
                    }
                );
            }
        }
        else{
            
            actions.push(
                {
                    title: "Add Here",
                    callback: () => {
                        if ( !e.track ){ return; }
                        const arr = new Float32Array( e.track.dim );
                        arr.fill(0);
                        this.addKeyFrames( e.track.trackIdx, arr, [this.xToTime(e.localX)] );
                    }
                }
            );
            actions.push(
                {
                    title: "Add",
                    callback: () => {
                        if ( !e.track ){ return; }
                        const arr = new Float32Array( e.track.dim );
                        arr.fill(0);
                        this.addKeyFrames( e.track, arr, [this.currentTime] );
                    }
                }
            );

        }

        if(this.clipboard && this.clipboard.keyframes)
        {
            actions.push(
                {
                    title: "Paste Here",
                    callback: () => {
                        this.pasteContent( this.xToTime(e.localX) );
                    }
                }
            );
            actions.push(
                {
                    title: "Paste",
                    callback: () => {
                        this.pasteContent( this.currentTime );
                    }
                }
            );
        }
        
        LX.addContextMenu("Options", e, (m) => {
            for(let i = 0; i < actions.length; i++) {
                m.add(actions[i].title,  actions[i].callback )
            }
        });

    }

    drawContent( ctx ) {
    
        if(!this.animationClip) 
            return;
        
        ctx.save();

        const trackHeight = this.trackHeight;
        const scrollY = - this.currentScrollInPixels;

        // elements from "ul" should match the visible tracks (and groups) as if this.selectedItems was flattened
        const visibleElements = this.trackTreesWidget.innerTree.domEl.children[0].children; 

        let offset = scrollY;
        ctx.translate(0, offset);

        for(let t = 0; t < visibleElements.length; t++) {
            const track = visibleElements[t].treeData.trackData;
            
            if (track){ 
                if (track.dim == 1 && track.curves){
                    this.drawTrackWithCurves(ctx, trackHeight, track);
                }else{
                    this.drawTrackWithKeyframes(ctx, trackHeight, track);
                }
            }
            
            offset += trackHeight;
            ctx.translate(0, trackHeight);
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

        if(track.isSelected) {
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = Timeline.TRACK_SELECTED;
            ctx.fillRect(0, 0, ctx.canvas.width, trackHeight );
        }

        ctx.fillStyle = Timeline.KEYFRAME_COLOR;
        ctx.globalAlpha = 1;

        const keyframes = track.times;         
        const startTime = this.visualTimeRange[0];
        const endTime = this.visualTimeRange[1];

        for(let j = 0; j < keyframes.length; ++j)
        {
            let time = keyframes[j];
            if( time < startTime || time > endTime ) {
                continue;
            }

            let keyframePosX = this.timeToX( time );
            let size = trackHeight * 0.3;
            
            if(!this.active || track.active == false) {
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_INACTIVE;
            }
            else if(track.locked) {
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_LOCK;
            }
            else if(track.hovered[j]) {
                size = trackHeight * 0.45;
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_HOVERED;
            }
            else if(track.selected[j]) {
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_SELECTED;
            }
            else if(track.edited[j]) {
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_EDITED;
            }
            else {
                ctx.fillStyle = Timeline.KEYFRAME_COLOR;
            }
            
            ctx.save();
            ctx.translate(keyframePosX, trackHeight * 0.5);
            ctx.rotate(45 * Math.PI / 180);		
            ctx.fillRect( -size*0.5, -size*0.5, size, size);
            ctx.restore();
        }

        ctx.globalAlpha = 1;
    }

    drawTrackWithCurves (ctx, trackHeight, track) {
        if(track.isSelected){
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = Timeline.TRACK_SELECTED_LIGHT;
            ctx.fillRect(0, 0, ctx.canvas.width, trackHeight );      
        }

        ctx.globalAlpha = 1;
        const keyframes = track.times;
        const values = track.values;
        const defaultPointSize = 5;
        const hoverPointSize = 7;
        const valueRange = track.curvesRange; //[min, max]
        const displayRange = trackHeight - defaultPointSize * 2;
        const startTime = this.visualTimeRange[0];
        const endTime = this.visualTimeRange[1];
        //draw lines
        ctx.strokeStyle = "white";
        ctx.beginPath();
        for(let j = 0; j < keyframes.length; ++j){

            let time = keyframes[j];
            let keyframePosX = this.timeToX( time );
            let value = values[j];                
            value = ((value - valueRange[0]) / (valueRange[1] - valueRange[0])) * (-displayRange) + (trackHeight - defaultPointSize); // normalize and offset

            if( time < startTime ){
                ctx.moveTo( keyframePosX, value ); 
                continue;
            }

            //convert to timeline track range
            ctx.lineTo( keyframePosX, value );  
            
            if ( time > endTime ){
                break; //end loop, but print line
            }
        }
        ctx.stroke();

        //draw points
        ctx.fillStyle = Timeline.KEYFRAME_COLOR;
        for(let j = 0; j < keyframes.length; ++j)
        {
            let time = keyframes[j];
            if( time < startTime || time > endTime )
                continue;

            let size = defaultPointSize;
            let keyframePosX = this.timeToX( time );
                
            if(!this.active || !track.active)
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_INACTIVE;
            else if(track.locked)
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_LOCK;
            else if(track.hovered[j]) {
                size = hoverPointSize;
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_HOVERED;
            }
            else if(track.selected[j])
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_SELECTED;
            else if(track.edited[j])
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_EDITED;
            else 
                ctx.fillStyle = Timeline.KEYFRAME_COLOR
            
            let value = values[j];
            value = ((value - valueRange[0]) / (valueRange[1] - valueRange[0])) *(-displayRange) + (trackHeight - defaultPointSize); // normalize and offset

            ctx.beginPath();
            ctx.arc( keyframePosX, value, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
        }
    }

    // Creates a map for each item -> tracks
    processTracks(animation) {

        const animationClip = this.instantiateAnimationClip(animation);

        if (animation && animation.tracks) {
            const tracksPerGroup = {};
            let duration = 0;
            for( let i = 0; i < animation.tracks.length; ++i ) {
                
                let track = animation.tracks[i];
                let times = track.times ?? [];
                let values = track.values ?? [];
                
                let valueDim = track.dim;
                if ( !valueDim || valueDim < 0 ){
                    if ( times.length && values.length ){ valueDim = Math.round(values.length/times.length); }
                    else{ valueDim = 1; }
                }

                let leftOver = values.length % valueDim; // just in case values have an incorrect length
                let amounEntries = Math.min( times.length, values.length - leftOver );
                times = times.slice(0, amounEntries); 
                values = values.slice(0, amounEntries * valueDim);

                let baseName = track.id ?? track.name;
                const [groupId, trackId] = baseName ? this._getValidTrackName(baseName) : [null, null];

                const toInstantiate = Object.assign({}, track);
                toInstantiate.id = trackId;
                toInstantiate.dim = valueDim;
                const trackInfo = this.instantiateTrack(toInstantiate);
                
                // manual group insertion
                if ( groupId ){
                    if(!tracksPerGroup[groupId]) {
                        tracksPerGroup[groupId] = [trackInfo];
                    }else {
                        tracksPerGroup[groupId].push( trackInfo );
                    }
                    
                    trackInfo.groupId = groupId;
                    trackInfo.groupTrackIdx = tracksPerGroup[groupId].length - 1; // index of track in group
                }

                trackInfo.trackIdx = i; // index of track in the entire animation
                                
                animationClip.tracks.push(trackInfo);

                if ( times.length ){ duration = Math.max( duration, times[times.length-1]); }
            }

            animationClip.tracksPerGroup = tracksPerGroup;
            if ( !animation || !animation.duration ){
                animationClip.duration = duration;
            }
        }

        return animationClip;
    }
    
    _getValidTrackName( uglyName ) {

        let groupId = null;
        let trackId = null;
        let trackNameInfo;
        // Support other versions
        if(uglyName.includes("[")) {
            const nameIndex = uglyName.indexOf('[');
            trackNameInfo = uglyName.substr(nameIndex+1).split("].");
        }else {
            trackNameInfo = uglyName.split(".");
        }

        if ( trackNameInfo.length > 1 ){
            groupId = trackNameInfo[0];
            trackId = trackNameInfo[1];
        }else{
            trackId = trackNameInfo[0];
        }

        return [groupId, trackId];
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

        track.selected = newTrack.selected ?? (new Array(track.times.length)).fill(false);
        track.hovered = newTrack.hovered ?? (new Array(track.times.length)).fill(false);
        track.edited = newTrack.edited ?? (new Array(track.times.length)).fill(false);
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

        this.saveState(track.trackIdx);

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
            this.updateTrack( track.trackIdx, track ); // update control variables (hover, edited, selected) 
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
            this.optimizeTrack( track.trackIdx, onlyEqualTime, false );
        }

        // restore old enabler status
        this.trackStateSaveEnabler = oldStateEnabler;

        // callback
        if(this.onOptimizeTracks )
            this.onOptimizeTracks(-1); // signal as "all tracks"
    }

    onShowOptimizeMenu( e ) {
        
        if(this.selectedItems.length == 0)
            return;

        LX.addContextMenu("Optimize", e, m => {
            this.selectedItems.forEach( item => {
                if (item.isTrack){
                    m.add( (item.groupId ? item.groupId : "" ) + "@" + item.id, () => {
                        this.optimizeTrack( item.trackIdx, false);
                    });
                }else{
                    const tracks = this.animationClip.tracksPerGroup[ item ];
                    for( let i = 0; i < tracks.length; ++i ){
                        const t = tracks[i];
                        m.add( (t.groupId ? t.groupId : "" ) + "@" + t.id, () => {
                            this.optimizeTrack( t.trackIdx, false);
                        }); 
                    }
                }
            })
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

            if(this.onUpdateTrack)
                this.onUpdateTrack( [state.trackIdx] );
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
        const times = track.times;
        const values = track.values;

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
        const tracks = this.animationClip.tracks;
        for(let i = 0; i < this.lastKeyFramesSelected.length; i++){
            let [trackIdx, keyIdx] = this.lastKeyFramesSelected[i];
            const track = tracks[trackIdx];

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
        const start = index * track.dim;
        const values = this.animationClip.tracks[ track.trackIdx ].values.slice(start, start + track.dim);

        if(!this.clipboard)
            this.clipboard = {};

        this.clipboard.value = {
            type: track.type,
            values: values
        };
    }

    // each track will have its own entry of copied keyframes. When pasting, only the apropiate track's keyframes are pasted
    copyKeyFrames( track, indices ) {

        let trackIdx = track.trackIdx;
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

    canPasteKeyFrame () {
        return this.clipboard != null;
    }

    // raw paste of values
    #paste( track, index, values ) {
        const start = index * track.dim;
        let j = 0;
        for(let i = start; i < start + track.dim; ++i) {
            track.values[i] = values[j];
            ++j;
        }

        track.edited[ index ] = true;
    }

    // paste value on selected content (only one keyframe can be selected)
    pasteContentValue(){
        if(!this.clipboard)
        return false;
    
        // copy the value into the only selected keyframe
        if(this.clipboard.value && this.lastKeyFramesSelected.length == 1) {

            let [trackIdx, keyIdx] = this.lastKeyFramesSelected[0];
            this.pasteKeyFrameValue({}, this.animationClip.tracks[trackIdx], keyIdx);
            return true;
        }
        return false;
    }

    // paste copied keyframes. New keyframes are created and overlapping ones are overwritten
    pasteContent( time = this.currentTime ) {
        if(!this.clipboard)
            return false;

        // create new keyframes from the ones copied 
        if(this.clipboard.keyframes) {

            for( let trackIdx in this.clipboard.keyframes ){
                const clipboardItem = this.animationClip.tracks[trackIdx];
    
                // ensure all tracks are visible
                const idx = this.selectedItems.findIndex( (item) => 
                    { 
                        if ( item.isTrack ){ return ( item === clipboardItem ) } 
                        return item === clipboardItem.groupId;
                    } );

                if ( idx == -1 ){
                    return false; 
                }
            }

            this.pasteKeyFrames( time );
        }

        return true;
    }

    pasteKeyFrameValue( e, track, index ) {

        if(this.clipboard.value.type != track.type){
            return;
        }

        this.saveState(track.trackIdx);

        // Copy to current key
        this.#paste( track, index, this.clipboard.value.values );

        if(this.onUpdateTrack){
            this.onUpdateTrack( [track.trackIdx] );
        }
        
        if(!e || !e.multipleSelection)
        return;
        
        // Don't want anything after this
        this.clearState();

        // Copy to every selected key
        for(let [trackIdx, keyIndex] of this.lastKeyFramesSelected) {
            this.#paste( this.animationClip.tracks[trackIdx], keyIndex, this.clipboard.value.values );
        }
    }

    pasteKeyFrames( pasteTime = this.currentTime ){
        if ( !this.clipboard.keyframes ){ return false; }

        this.unHoverAll();
        this.unSelectAllKeyFrames();

        let clipboardTracks = this.clipboard.keyframes;
        let globalStart = Infinity;
        for( let trackIdx in clipboardTracks ){
            if ( globalStart > clipboardTracks[trackIdx].times[0] ){
                globalStart = clipboardTracks[trackIdx].times[0];
            }
        }

        if ( globalStart == Infinity ){ return false; }

        const onUpdateTrack = this.onUpdateTrack;
        this.onUpdateTrack = null;

        for( let trackIdx in clipboardTracks ){
            
            const clipboardInfo = this.clipboard.keyframes[trackIdx];
            const times = clipboardInfo.times; 
            const values = clipboardInfo.values;
            const track = this.animationClip.tracks[trackIdx];
            
            this.addKeyFrames( track.trackIdx, values, times, -globalStart + pasteTime  );
                       
        }
        
        // do only one update
        if(onUpdateTrack){
            this.onUpdateTrack = onUpdateTrack;
            this.onUpdateTrack( Object.keys( clipboardTracks ) );
        }

        return true;
    }

    /**
     * 
     * @param {int} trackIdx 
     * @param {array} newValues array of values for each keyframe. It should be a flat array of size track.dim*numKeyframes. Check ADDKEY_VALUESINARRAYS flag
     * @param {array of numbers} newTimes 
     * @param {number} timeOffset 
     * @param {int} flags     
     *      KeyFramesTimeline.ADDKEY_VALUESINARRAYS: if set, newValues is an array of arrays, one for each entry [ [1,2,3], [5,6,7] ]. Times is still a flat array of values [ 0, 0.2 ]
 
     * @returns 
     */
    addKeyFrames( trackIdx, newValues, newTimes, timeOffset = 0, flags = 0x00 ){
        const track = this.animationClip.tracks[trackIdx];

        if ( !newTimes.length ){ return; }

        const valueDim = track.dim;
        const trackTimes = track.times;
        const trackValues = track.values;
        const times = new Float32Array( trackTimes.length + newTimes.length );
        const values = new Float32Array( trackValues.length + newTimes.length * valueDim );

        // let newIdx = this.getNearestKeyFrame( track, newTimes[newTimes.length-1], -1 ); 
        this.saveState(trackIdx);

        let newIdx = newTimes.length-1;
        let oldIdx = trackTimes.length-1;

        let t1 = performance.now();
        if ( KeyFramesTimeline.ADDKEY_VALUEARRAYS & flags ){
            
            for( let i = times.length-1; i > -1; --i ){
                // copy new value in this place if needed
                if ( oldIdx<0 || (newIdx>-1 && trackTimes[oldIdx] < (newTimes[newIdx]+timeOffset)) ){
                    const vals = newValues[newIdx];
                    for( let v = 0; v < valueDim; ++v ){
                        values[i * valueDim + v] = vals[v];
                    }
                    times[i] = newTimes[newIdx--]+timeOffset;
                    // Add new entry into each control array
                    track.hovered.splice(oldIdx+1, 0, false);
                    track.selected.splice(oldIdx+1, 0, false);
                    track.edited.splice(oldIdx+1, 0, true);
                    continue;
                }
                
                // copy old values instead
                for( let v = 0; v < valueDim; ++v ){ 
                    values[i * valueDim + v] = trackValues[oldIdx * valueDim + v]; 
                }
                times[i] = trackTimes[oldIdx--];
            }    
        } 
        else{
            for( let i = times.length-1; i > -1; --i ){
                // copy new value in this place if needed
                if ( oldIdx<0 || (newIdx>-1 && trackTimes[oldIdx] < (newTimes[newIdx]+timeOffset)) ){
                    // ----------- this is different from the 'if' -----------
                    for( let v = 0; v < valueDim; ++v ){ 
                        values[i * valueDim + v] = newValues[newIdx * valueDim + v]; 
                    }
                    times[i] = newTimes[newIdx--] + timeOffset;
                    // Add new entry into each control array
                    track.hovered.splice(oldIdx+1, 0, false);
                    track.selected.splice(oldIdx+1, 0, false);
                    track.edited.splice(oldIdx+1, 0, true);
                    continue;
                }
                
                // copy old values instead
                for( let v = 0; v < valueDim; ++v ){ 
                    values[i * valueDim + v] = trackValues[oldIdx * valueDim + v]; 
                }
                times[i] = trackTimes[oldIdx--];
            }

        }

        // update track pointers
        track.times = times;
        track.values = values;

        if ( (newTimes[newTimes.length - 1] + timeOffset) > this.duration ){
            this.setDuration(newTimes[newTimes.length - 1] + timeOffset);
        }

        if(this.onUpdateTrack)
            this.onUpdateTrack( [trackIdx] );
    }

    deleteSelectedContent() {
        
        //*********** WARNING: RELIES ON SORTED lastKeyFramesSelected ***********
            
        if (!this.lastKeyFramesSelected.length){ 
            return; 
        }

        const firstTrack = this.lastKeyFramesSelected[0][0];
        let trackToRemove = firstTrack;
        let toDelete = []; // indices to delete of the same track

        const oldSaveEnabler = this.trackStateSaveEnabler;
        
        const numSelected = this.lastKeyFramesSelected.length; 
        for( let i = 0; i < numSelected; ++i ){
            const [trackIdx, frameIdx] = this.lastKeyFramesSelected[i];
            if ( trackToRemove != trackIdx ){
                this.saveState(trackToRemove, trackToRemove != firstTrack);

                this.trackStateSaveEnabler = false;
                this.deleteKeyFrames( trackToRemove, toDelete );
                this.trackStateSaveEnabler = oldSaveEnabler;

                trackToRemove = trackIdx;
            }
 
            toDelete.push(frameIdx)
        }

        this.saveState(trackToRemove, trackToRemove != firstTrack);
        this.trackStateSaveEnabler = false;
        this.deleteKeyFrames( trackToRemove, toDelete );
        this.trackStateSaveEnabler = oldSaveEnabler;
 
        this.lastKeyFramesSelected = [];
    }

    // for typed arrays. Does not update lastSelectedKeyframes
    deleteKeyFrames( trackIdx, indices ){
        const track = this.animationClip.tracks[trackIdx];

        if ( !indices.length ){ 
            return false; 
        }

        this.saveState( trackIdx );

        const oldNumFrames = track.times.length;
        const newNumFrames = track.times.length - indices.length;
        const newTimes = track.times.slice(0, newNumFrames);
        const newValues = track.values.slice(0, newNumFrames * track.dim);
        
        let resultIdx = indices[0];
        let resultValIdx = indices[0] * track.dim;
        for(let i = 0; i < indices.length; ++i){
            track.edited.splice(resultIdx, 1);
            track.selected.splice(resultIdx, 1);
            track.hovered.splice(resultIdx, 1);
            
            const idx = indices[i];
            const endIdx = (i < (indices.length-1)) ? indices[i+1] : oldNumFrames;
            const endValIdx = endIdx * track.dim;
            for(let v = (idx+1)*track.dim; v < endValIdx; ++v ){
                newValues[resultValIdx++] = track.values[v];
            }
            for( let f = idx+1; f < endIdx; ++f){
                newTimes[resultIdx++] = track.times[f];
            }
        }

        track.times = newTimes;
        track.values = newValues;

        // Update animation action interpolation info
        if(this.onDeleteKeyFrames)
            this.onDeleteKeyFrames( trackIdx, indices );

        
        if ( (newTimes[newTimes.length - 1]) > this.duration ){
            this.setDuration(newTimes[newTimes.length - 1]);
        }

        // if(this.onUpdateTrack)
        //     this.onUpdateTrack( [trackIdx] );
        
        return true;
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
            this.animationClip.tracks[ this.lastHovered[0] ].hovered[ this.lastHovered[1] ] = false;
        }
        let h = this.lastHovered;
        this.lastHovered = null;
        return h;
    }

    unSelectAllKeyFrames() {

        for(let [trackIdx, keyIndex] of this.lastKeyFramesSelected) {
            this.animationClip.tracks[trackIdx].selected[keyIndex] = false;
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

        const trackIdx = track.trackIdx;
        // [track idx, keyframe, keyframe time]
        let selection = [track.trackIdx, frameIdx, track.times[frameIdx]];

        // sort lastkeyframeselected ascending order (track and frame)
        let i = 0;
        for( ; i < this.lastKeyFramesSelected.length; ++i){
            let s = this.lastKeyFramesSelected[i];
            if(s[0] > trackIdx || (s[0] == trackIdx && s[1] > frameIdx)){
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
        
        const trackIdx = track.trackIdx;
        for( let i = 0; i < this.lastKeyFramesSelected.length; ++i ){
            const sk = this.lastKeyFramesSelected[i];
            if ( sk[0] === trackIdx && sk[1] === frameIdx ){
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

        track = this.animationClip.tracks[ track.trackIdx ];
        if(track.locked)
            return;

        e.multipleSelection = multiple;
        if(!multiple && e.button != 2) {
            this.unSelectAllKeyFrames();
        }

        keyFrameIndex = keyFrameIndex ?? this.getCurrentKeyFrame( track, this.xToTime( localX ), this.secondsPerPixel * 5 );   
        if(keyFrameIndex < 0)
            return;
        
        const currentSelection = this.selectKeyFrame(track, keyFrameIndex, !multiple); // changes time 

        if( !multiple ) {
            this.setTime(track.times[ keyFrameIndex ]);
        }  
        if( this.onSelectKeyFrame && this.onSelectKeyFrame(e, currentSelection)) {
            // Event handled
            return;
        }        
          
    }

    /**
     * @method clearTrack
     */
    clearTrack(trackIdx) {

        const track =  this.animationClip.tracks[trackIdx];

        if(track.locked ){
            return;
        }

        this.unHoverAll();
        this.unSelectAllKeyFrames();

        this.saveState(track.trackIdx);

        track.times = track.times.slice(0,0);
        track.values = track.values.slice(0,0);
        track.edited.length = 0;
        track.hovered.length = 0;
        track.selected.length = 0;
        
        return trackIdx;
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
                    
        this.lastClipsSelected = [];
        this.lastTrackClipsMove = 0; // vertical movement of clips, onMouseMove onMousedown
        this.dragClipMode = "";

        this.setAnimationClip(this.animationClip);
    }

    // use default updateleftpanel
    // generateSelectedItemsTreeData(){}

    addNewTrack( options = {}, updateLeftPanel = true, skipCallback = false ) {

        const trackInfo = this.instantiateTrack(options ?? {});
        trackInfo.trackIdx = this.animationClip.tracks.length;
        this.animationClip.tracks.push( trackInfo );
        
        if ( this.onAddNewTrack && !skipCallback ){
            this.onAddNewTrack( trackInfo, options );
        }
        
        this.selectedItems.push(trackInfo);
        if( updateLeftPanel ){
            this.updateLeftPanel();
        }
        
        return trackInfo.trackIdx;
    }

    // OVERRIDE ITEM SELECTION - ClipsTimeline will not offer any selection. Alltracks are visible
    setAnimationClip( animation, needsToProcess ){
        super.setAnimationClip(animation, needsToProcess);
        this.changeSelectedItems();
    }

    /**
     * OVERRIDE ITEM SELECTION.
     * CLIPS WILL OFFER NO SELECTION. All tracks are visible
     */
    changeSelectedItems( ) {

        // TODO: maybe make this un-functions more general
        this.unSelectAllClips();
        this.unHoverAll();

        this.selectedItems = this.animationClip.tracks.slice();

        this.updateLeftPanel();
    }
            
    /**
     * 
     * @param {obj} options set some values for the track instance (groups and trackIdx not included)
     * @returns 
    */
    instantiateTrack(options = {}) {
        const track = super.instantiateTrack(options);

        track.trackIdx = this.animationClip.tracks.length;

        track.clips = options.clips ?? [];
        track.selected = [];
        track.edited = [];
        track.hovered = [];
        
        const numClips = track.clips.length;

        if ( options.selected && options.selected.length == numClips ){
            track.selected = options.selected;
        }else{ 
            track.selected = (new Array(numClips)).fill(false);
        }
        if ( options.edited && options.edited.length == numClips ){
            track.edited = options.edited;
        }else{ 
            track.edited = (new Array(numClips)).fill(false);
        }
        if ( options.hovered && options.hovered.length == numClips ){
            track.hovered = options.hovered;
        }else{ 
            track.hovered = (new Array(numClips)).fill(false);
        }

        return track;
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
                    let clipIndex = this.getCurrentClip( track, this.xToTime( localX ), this.secondsPerPixel * 5 );
                    if ( clipIndex > -1 ){
                        track.selected[clipIndex] ? 
                            this.unselectClip( track, clipIndex, null ) :
                            this.selectClip( track, clipIndex, null, false );
                    }
                }
            }
            // Box selection
            else if (this.boxSelection){
                
                let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1]);
                
                for(let t of tracks) {
                    let clipsIndices = this.getClipsInRange(t, 
                        this.xToTime( this.boxSelectionStart[0] ), 
                        this.xToTime( this.boxSelectionEnd[0] ),
                        0.000001);
                        
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
            // clip selection is done on MouseUP
            const selectedClips = this.lastClipsSelected;

            this.canvas.style.cursor = "grab";  
            let curTrackIdx = -1;

            this.lastTrackClipsMove = Math.floor( (e.localY - this.topMargin + this.trackTreesPanel.root.scrollTop) / this.trackHeight );

            for(let i = 0; i < selectedClips.length; i++)
            {
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

            this.movingKeys = true;
        }
        else if( !track || track && this.getCurrentClip(track, time, 0.001) == -1) { // clicked on empty space
            this.unSelectAllClips();
            if(this.onSelectClip)
                this.onSelectClip(null);
        }
        else if (track && (this.dragClipMode == "duration" || this.dragClipMode == "fadein" || this.dragClipMode == "fadeout" )) { // clicked while mouse was over fadeIn, fadeOut, duration
            this.selectClip( track, null, localX ); // select current clip if any (unselect others)
            if ( this.lastClipsSelected.length ){ 
                this.saveState(track.trackIdx);
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
                    if ( clip.fadeout != undefined ){
                        clip.fadeout = Math.max(Math.min((clip.fadeout ?? (clip.start+clip.duration)) + delta, clip.start+clip.duration), clip.start);
                    }
                    if ( clip.fadein != undefined ){
                        clip.fadein = Math.max(Math.min((clip.fadein ?? (clip.start+clip.duration)), (clip.fadeout ?? (clip.start+clip.duration))), clip.start);
                    }
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

                const treeOffset = this.lastTrackTreesWidgetOffset;
                let newTrackClipsMove = Math.floor( (e.localY - treeOffset) / this.trackHeight );

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
                                this.addNewTrack(null, i == 1);
                                if ( i == 1 ){ 
                                    this.updateLeftPanel();
                                }
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
                    if (clip.fadein != undefined ){ clip.fadein += leastDelta; }
                    if (clip.fadeout != undefined ){ clip.fadeout += leastDelta; }

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
            let clips = this.getClipsInRange(e.track, time, time, 0.00001);
            if(!e.track.locked && clips) {
                                
                this.lastHovered = [e.track.trackIdx, clips[0]];
                e.track.hovered[clips[0]] = true;

                let clip = e.track.clips[clips[0]];
                if(!clip) {
                    return;
                }
                
                if(Math.abs(e.localX - this.timeToX(clip.start + clip.duration)) < 8) { // duration
                    this.canvas.style.cursor = "col-resize";
                    this.dragClipMode = "duration";
                }
                else if(clip.fadein != undefined && Math.abs(e.localX - this.timeToX(clip.fadein)) < 8) { // fadein
                    this.canvas.style.cursor = "e-resize";
                    this.dragClipMode = "fadein";
                }
                else if(clip.fadeout != undefined && Math.abs(e.localX - this.timeToX(clip.fadeout)) < 8) { // fadeout
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
                    title: "Copy",
                    callback: () => { this.copySelectedContent();}
                }
            )
            actions.push(
                {
                    title: "Delete",
                    callback: () => {
                        this.deleteSelectedContent({});
                    }
                }
            )
        }
        else{
            
            if(this.clipboard)
            {
                actions.push(
                    {
                        title: "Paste",
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

        if(!this.animationClip)  
            return;
        
        const tracks = this.animationClip.tracks;          
        const trackHeight = this.trackHeight;
        const scrollY = - this.currentScrollInPixels;
        
        ctx.save();
        for(let i = 0; i < tracks.length; i++) {
            let track = tracks[i];
            this.drawTrackWithBoxes(ctx, i * trackHeight + scrollY, trackHeight, track.id, track);
        }
        
        ctx.restore();
      
    }

    /**
     * @method drawTrackWithBoxes
     * @param {*} ctx
     */
    drawTrackWithBoxes( ctx, y, trackHeight, title, track ) {

        // Fill track background if it's selected
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = Timeline.TRACK_SELECTED_LIGHT;
        if(track.isSelected) {
            ctx.fillRect(0, y, ctx.canvas.width, trackHeight );    
        }

        const clips = track.clips;

        // set clip box size
        const offset = (trackHeight * 0.4) * 0.5;
        trackHeight *= 0.6;
        
        let selectedClipArea = null;

        ctx.font = Math.floor( trackHeight * 0.8) + "px" + Timeline.FONT;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
    
        for(var j = 0; j < clips.length; ++j)
        {
            selectedClipArea = null;
            const clip = clips[j];
            //let selected = track.selected[j];
            var x = Math.floor( this.timeToX(clip.start) ) + 0.5;
            var x2 = Math.floor( this.timeToX( clip.start + clip.duration ) ) + 0.5;
            var w = x2-x;

            if( x2 < 0 || x > this.canvas.width )
                continue;
            
            // Overwrite clip color state depending on its state
            ctx.globalAlpha = 1;
            ctx.fillStyle = clip.clipColor || (track.hovered[j] ? Timeline.KEYFRAME_COLOR_HOVERED : (track.selected[j] ? Timeline.TRACK_SELECTED : Timeline.KEYFRAME_COLOR));
            if(!this.active || !track.active) {
                ctx.fillStyle = Timeline.KEYFRAME_COLOR_INACTIVE;
            }

            // Draw clip background
            ctx.roundRect( x, y + offset, w, trackHeight , 5, true);
                        
            if(this.active && track.active) {
                
                ctx.fillStyle = clip.fadeColor ?? "#0004";

                if ( clip.fadein != undefined ){
                    const fadeinX = this.pixelsPerSecond * (clip.fadein - clip.start);
                    ctx.roundRect(x, y + offset, fadeinX, trackHeight, {tl: 5, bl: 5, tr:0, br:0}, true);
                }
                if ( clip.fadein != undefined ){
                    const fadeoutX = this.pixelsPerSecond * (clip.start + clip.duration - (clip.fadeout));
                    ctx.roundRect( x + w - fadeoutX, y + offset, fadeoutX, trackHeight, {tl: 0, bl: 0, tr:5, br:5}, true);
                }
            }
            
            ctx.fillStyle = Timeline.TRACK_COLOR_PRIMARY;
            
            if(track.selected[j] || track.hovered[j]) {
                ctx.strokeStyle = ctx.shadowColor = clip.clipColor || Timeline.TRACK_SELECTED;
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 1.5;
                ctx.shadowOffsetY = 1.5;
                
                selectedClipArea = [x - 1, y + offset -1, x2 - x + 2, trackHeight + 2];
                ctx.roundRect(selectedClipArea[0], selectedClipArea[1], selectedClipArea[2], selectedClipArea[3], 5, false, true);

                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                ctx.font = "bold" + Math.floor( trackHeight) + "px " + Timeline.FONT;
                ctx.fillStyle = Timeline.FONT_COLOR_PRIMARY;
            }
            

            // Overwrite style with small font size if it's zoomed out
            if( this.pixelsPerSecond < 200) {
                ctx.font = this.pixelsPerSecond * 0.06  +"px" + Timeline.FONT;
            }

            const text = clip.id; //clip.id.replaceAll("_", " ").replaceAll("-", " ");
            const textInfo = ctx.measureText( text );
            
            // Draw clip name if it's readable
            if(this.pixelsPerSecond > 100) {
                ctx.fillText( text, x + (w - textInfo.width)*0.5,  y + offset + trackHeight * 0.5);
            }

            ctx.fillStyle = track.hovered[j] ? "white" : "#f5f5f5"//track.hovered[j] ? "white" : Timeline.FONT_COLOR_QUATERNARY;
            ctx.strokeStyle = "rgba(125,125,125,0.4)";
            
            // Draw resize bounding
            ctx.roundRect(x + w - 8 , y + offset , 8, trackHeight, {tl: 4, bl: 4, tr:4, br:4}, true, true);           
        }

        ctx.font = "12px" + Timeline.FONT;
    }

    // Creates a map for each item -> tracks
    processTracks(animation) {

        const animationClip = this.instantiateAnimationClip();

        if (animation && animation.tracks){
            for( let i = 0; i < animation.tracks.length; ++i ) {
    
                const trackInfo = this.instantiateTrack( animation.tracks[i] );
                trackInfo.trackIdx = animationClip.tracks.length;

                animationClip.tracks.push(trackInfo);
            }
        }
        
        return animationClip;
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
            this.onUpdateTrack( [trackIdx] );
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
                if ( currTrackIdx >= tracks.length ){ this.addNewTrack(null, false); }
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
                    if ( currTrackIdx >= tracks.length ){ this.addNewTrack(null, false); }
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
            const selected = this.lastClipsSelected;
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
            clip.start += timeOffset;
            if (clip.fadein == null || clip.fadein == undefined ){ clip.fadein = undefined; }
            else{ clip.fadein += timeOffset; }
            if (clip.fadeout == null || clip.fadeout == undefined ){ clip.fadeout = undefined; }
            else{ clip.fadeout += timeOffset; }
        }
        return clipsToReturn;
    }

    /**
     * Overwrite the "cloneClips" function to provide a custom cloning of clips. Otherwise, JSON serialization is used
     */
    copySelectedContent() {

        if ( this.lastClipsSelected.length == 0 ){
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
            const [selectedTrackIdx, selectedClipIdx] = this.lastClipsSelected[i];
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
                this.onUpdateTrack( [state.trackIdx] );
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

        for(let [idx, keyIndex] of this.lastClipsSelected) {
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

        clipIndex = clipIndex ?? this.getCurrentClip( track, this.xToTime( localX ), this.secondsPerPixel * 5 );

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
            if ( t[0] < track.trackIdx ){ continue; }
            if ( t[0] > track.trackIdx || t[1] > clipIndex ){ break;}
        }
        this.lastClipsSelected.splice(i,0, [track.trackIdx, clipIndex] ); //
        track.selected[clipIndex] = true;

        if( !skipCallback && this.onSelectClip ){
            this.onSelectClip(track.clips[ clipIndex ]);
            // Event handled
        }
        return clipIndex;
    }

    unselectClip( track, clipIndex, localX = null ){
        clipIndex = clipIndex ?? this.getCurrentClip( track, this.xToTime( localX ), this.secondsPerPixel * 5 );
                        
        if(clipIndex == -1)
            return -1;

        if(!track.selected[clipIndex])
            return -1;

        track.selected[clipIndex] = false;

        // unselect 
        let trackIdx = track.trackIdx;
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

    setDuration( t, skipCallback = false, updateHeader = true ){
        super.setDuration( this.validateDuration(t), skipCallback, updateHeader );
    }
}

LX.ClipsTimeline = ClipsTimeline;

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

export { Timeline, KeyFramesTimeline, ClipsTimeline };