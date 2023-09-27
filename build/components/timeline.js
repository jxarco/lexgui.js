(function(global){

    if(!global.LX) {
        throw("lexgui.js missing!");
    }

    LX.components.push( 'Timeline' );

    /**
     * @class Session
     * @description Store info about timeline session
     */

    class Session {

        constructor() {

            this.start_time = -0.2;
            this.left_margin = 0;
            // this.current_time = 0;
            // this.last_time = 0;
            // this.seconds_to_pixels = 50;
            // this.scroll_y = 0;
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
         * @param {string} name 
         * @param {object} options = {animationClip, selectedItems, position = [0,0], width, height, canvas, trackHeight, skipLock, skipVisibility}
         */
        constructor( name, options = {} ) {

            this.name = name ?? '';
            this.currentTime = 0;
            this.framerate = 30;
            this.opacity = options.opacity || 1;
            this.sidebarWidth = 0// 200;
            this.topMargin = 28;
            this.renderOutFrames = false;
            this.lastMouse = [];
            this.lastKeyFramesSelected = [];
            this.tracksDrawn = [];
            this.buttonsDrawn = [];
            this.trackState = [];
            this.clipboard = null;
            this.grabTime = 0;
            this.timeBeforeMove = 0;
            this.tracksPerItem = {};
            this.tracksDictionary = {};
	        this._times = [];

            this.session = new Session();

            this.canvas = options.canvas ?? document.createElement('canvas');

            this.duration = 1;
            this.position = [options.x ?? 0, options.y ?? 0];
            this.size = [ options.width ?? 400, options.height ?? 100];
            
            this.currentScroll = 0; //in percentage
            this.currentScrollInPixels = 0; //in pixels
            this.scrollableHeight = this.size[1]; //true height of the timeline content
            this.secondsToPixels = 300;
            this.pixelsToSeconds = 1 / this.secondsToPixels;
            this.selectedItems = options.selectedItems ?? null;
            this.animationClip = options.animationClip ?? null;
            this.trackHeight = options.trackHeight ?? 25;
            
            this.active = true;
            this.skipVisibility = options.skipVisibility ?? false;
            this.skipLock = options.skipLock ?? false;

            this.optimizeThreshold = 0.025;

            this.root = new LX.Area({className : 'lextimeline'});
            
            this.header_offset = 38;
            
            let width = options.width ? options.width : null;
            let height = options.height ? options.height - this.header_offset : null;

            let area = new LX.Area( {id: "bottom-timeline-area", width: width || "calc(100% - 7px)", height: height || "100%"});
            area.split({ type: "horizontal", sizes: ["20%", "80%"]});
            this.content_area = area;
            let [left, right] = area.sections;
            
            
            right.root.appendChild(this.canvas);
            this.canvasArea = right;
            this.canvasArea.root.classList.add("lextimelinearea");
            this.updateHeader();
            this.updateLeftPanel(left);
            this.root.root.appendChild(area.root);

            if(!options.canvas && this.name != '') {
                this.root.root.id = this.name;
                this.canvas.id = this.name + '-canvas';
            }

            this.canvas.addEventListener("mousedown", this.processMouse.bind(this));
            this.canvas.addEventListener("mouseup", this.processMouse.bind(this));
            this.canvas.addEventListener("mousemove", this.processMouse.bind(this));
            this.canvas.addEventListener("wheel", this.processMouse.bind(this), {passive:false});
            this.canvas.addEventListener("dblclick", this.processMouse.bind(this));
            this.canvas.addEventListener("contextmenu", this.processMouse.bind(this));

            // setTimeout( () => this.resize(), 10 );

            right.onresize = bounding => {
                this.#resizecanvas( [ bounding.width, bounding.height ] );
            }
        }

        /**
         * @method updateHeader
         * @param {*}  
         */

        updateHeader() {

            if(this.header)
                this.header.clear();
            else {
                this.header = new LX.Panel({id:'lextimelineheader', height: this.header_offset+"px"});
                this.root.root.appendChild(this.header.root);
            }

            let header = this.header;
            LX.DEFAULT_NAME_WIDTH = "50%";
            header.sameLine();
            header.addTitle(this.name, {width: "132px"});
            header.addText("Animation", this.animationClip ? this.animationClip.name : "Animation", (value, event) => { 
                if( !this.animationClip )
                    return;
                this.animationClip.name = value ;
            });        
            header.addNumber("Duration", this.duration.toFixed(3), (value, event) => this.setDuration(value), {step: 0.01, min: 0});        
            header.addNumber("Current Time", this.currentTime, (value, event) => {
                this.currentTime = value;
                if(this.onSetTime)
                    this.onSetTime(this.currentTime);
                this.draw();
            }, {signal: "@on_current_time_" + this.constructor.name, step: 0.01, min: 0, max: this.duration, precision: 3, skipSlider: true});        

            for(let i = 0; i < this.buttonsDrawn.length; i++) {
                let button = this.buttonsDrawn[i];
                this.header.addButton( null, "<a class='" + button.icon +"' title='" + button.name + "'></a>", button.callback, {width: "32px"});
            }

            if(this.onShowOptimizeMenu)
                header.addButton("", '<i class="fa-solid fa-filter"></i>', (value, event) => {this.onShowOptimizeMenu(event)}, {width: "40px"});

            header.addButton("", '<i class="fa-solid fa-gear"></i>', (value, event) => {
                let dialog = new LX.Dialog("Configuration", d => {
                    d.addNumber("Framerate", this.framerate, null, {disabled: true});
                    d.addNumber("Num items", Object.keys(this.tracksPerItem).length, null, {disabled: true});
                    d.addNumber("Num tracks", this.animationClip ? this.animationClip.tracks.length : 0, null, {disabled: true});
                    if(this.onShowOptimizeMenu)
                        d.addNumber("Optimize Threshold", this.optimizeThreshold, v => {
                            this.optimizeThreshold = v;
                        }, {min: 0, max: 0.25, step: 0.001, precision: 4});
                    
                })
            }, {width: "40px"})
            header.endLine();
            LX.DEFAULT_NAME_WIDTH = "30%";
        }

        /**
        * @method updateLeftPanel
        * 
        */
        updateLeftPanel(area) {


            if(this.leftPanel)
                this.leftPanel.clear();
            else {
                this.leftPanel = area.addPanel({className: 'lextimelinepanel', width: "100%"});
            }

            let panel = this.leftPanel;
            // panel.addBlank(25);
            panel.addTitle("Tracks", { height: "24px"});

            if(this.animationClip && this.selectedItems)  {
                let items = {'id': '', 'children': []};

                for(let i = 0; i < this.selectedItems.length; i++ ) {
                    let selected = this.selectedItems[i];
                    let t = {
                        'id': selected,
                        'skipVisibility': true,
                        'children': []
                    }
                    for(let j = 0; j < this.tracksPerItem[selected].length; j++) {
                        let track = this.tracksPerItem[selected][j];
                        let id = track.type ? track.type : track.name;

                        t.children.push({'id': id, 'skipVisibility': this.skipVisibility, visible: track.active, 'children':[], actions : this.skipLock ? null : [{
                            'name':'Lock edition',
                            'icon': 'fa-solid '+ (track.locked ? 'fa-lock' : 'fa-lock-open'),
                            'callback': (el, node) => {
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
                                let tracks = this.tracksPerItem[node.parent.id];
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
                                this.draw();
                            }
                             
                        }]})
                        // panel.addTitle(track.name + (track.type? '(' + track.type + ')' : ''));
                    }
                    items.children.push(t);
                    panel.addTree(null, t, {filter: false, rename: false, draggable: false, onevent: (e) => {
                        switch(e.type) {
                            case LX.TreeEvent.NODE_SELECTED:
                                this.selectTrack(e.node);
                                break;
                            case LX.TreeEvent.NODE_VISIBILITY:    
                                this.changeTrackVisibility(e.node, e.value);
                                break;
                            case LX.TreeEvent.NODE_CARETCHANGED:    
                                this.changeTrackDisplay(e.node, e.node.closed);
                                break;
                        }
                    }});
                }
            }

            // for(let i = 0; i < this.animationClip.tracks.length; i++) {
            //     let track = this.animationClip.tracks[i];
            //     panel.addTitle(track.name + (track.type? '(' + track.type + ')' : ''));
            // }
            if(this.leftPanel.parent.root.classList.contains("hidden"))
                return;
            this.#resizecanvas([ this.root.root.clientWidth - this.leftPanel.root.clientWidth  - 8, this.size[1]]);
        }

        /**
        * @method addButtons
        * @param buttons: array
        */

        addButtons(buttons) {
            this.buttonsDrawn = buttons || this.buttonsDrawn;
            this.updateHeader();
        }

        /**
         * @method addNewTrack
         */

        addNewTrack() {

            if(!this.animationClip)
                this.animationClip = {tracks:[]};

            let trackInfo = {
                idx: this.animationClip.tracks.length,
                clips: [],
                selected: [], edited: [], hovered: []
            };

            this.animationClip.tracks.push(trackInfo);
            return trackInfo.idx;
        }

        getTracksInRange( minY, maxY, threshold ) {

            let tracks = [];

            // Manage negative selection
            if(minY > maxY) {
                let aux = minY;
                minY = maxY;
                maxY = aux;
            }

            for(let i = this.tracksDrawn.length - 1; i >= 0; --i) {
                let t = this.tracksDrawn[i];
                let pos = t[1] - this.topMargin, size = t[2];
                if( pos + threshold >= minY && (pos + size - threshold) <= maxY ) {
                    tracks.push( t[0] );
                }
            }

            return tracks;
        }

        /**
         * @method setAnimationClip
         * @param {*} animation 
         * TODO
         */

        setAnimationClip( animation ) {
            this.animationClip = animation;
            this.duration = animation.duration;
            this.speed = animation.speed || 1;
            var w = Math.max(300, this.canvas.width);
            this.secondsToPixels = ( w - this.session.left_margin ) / this.duration;
            // if(this.secondsToPixels < 1)
            //     this.secondsToPixels = 100;
            // this.session.start_time = -50 / this.secondsToPixels;

            if(this.processTracks)
                this.processTracks(animation);
            
            this.updateHeader();
            this.updateLeftPanel();
        }

        drawTimeInfo (w, h = this.topMargin) {

            let ctx = this.canvas.getContext("2d");
            let canvas = this.canvas;
            // Draw time markers
            let startx = Math.round( this.timeToX( this.startTime ) ) + 0.5;
	        let endx = Math.round( this.timeToX( this.endTime ) ) + 0.5;
            let tick_time = this.secondsToPixels > 300 ? 0.5 : 1;
            

            ctx.save();

            ctx.fillStyle = "#111";
            ctx.fillRect( this.session.left_margin,0, canvas.width, h );

            if(this.secondsToPixels > 100 )
            {
                ctx.strokeStyle = "#AAA";
                ctx.globalAlpha = 0.5 * (1.0 - LX.UTILS.clamp( 100 / this.secondsToPixels, 0, 1));
                ctx.beginPath();
                for( let time = this.startTime; time <= this.endTime; time += 1 / this.framerate )
                {
                    let x = this.timeToX( time );
                    if(x < this.session.left_margin)
                        continue;
                    ctx.moveTo(Math.round(x) + 0.5, h * 0.75);
                    ctx.lineTo(Math.round(x) + 0.5, h - 1);
                }
                ctx.stroke();
                ctx.globalAlpha = this.opacity;
            }

            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = "#ADF";
            ctx.beginPath();
            let times = this._times;
            this._times.length = 0;
            for( let time = this.startTime; time <= this.endTime; time += tick_time)
            {
                let x = this.timeToX( time );

                if(x < this.session.left_margin)
                    continue;

                let is_tick = time % 5 == 0;
                if(is_tick ||  this.secondsToPixels > 70 ) {

                    times.push([x,time]);
                    ctx.moveTo(Math.round(x) + 0.5, h * 0.5 + (is_tick ? 0 : h * 0.25) );
                    ctx.lineTo(Math.round(x) + 0.5, h);
                }

            }

            let x = startx;
            if(x < this.session.left_margin)
                x = this.session.left_margin;
            ctx.moveTo( x, h - 0.5);
            ctx.lineTo( endx, h - 0.5);
            ctx.stroke();
            ctx.globalAlpha = this.opacity;

            //time seconds in text
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "#888";
            for(var i = 0; i < times.length; ++i)
            {
                let time = times[i][1];
                ctx.fillText( time == (time|0) ? time : time.toFixed(1), times[i][0],10);
            }

            ctx.restore();
        }

        drawTracksBackground(w, h) {

            let canvas = this.canvas;
            let ctx = canvas.getContext("2d");
            let duration = this.duration;
            ctx.globalAlpha = this.opacity;
            //content
            let margin = this.session.left_margin;
            let timeline_height = this.topMargin;
            let line_height = this.trackHeight;
        
            //fill track lines
            w = w || canvas.width;
            let max_tracks = Math.ceil( h - timeline_height / line_height );

            ctx.save();

            for(let i = 0; i < max_tracks; ++i)
            {
                ctx.fillStyle = i % 2 == 0 ? "#222A" : "#2A2A2C";
                ctx.fillRect(0, timeline_height + i * line_height, w, line_height );
            }
        
            //black bg
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = "black";
            ctx.fillRect( margin, timeline_height, canvas.width - margin, canvas.height - timeline_height );
            ctx.globalAlpha = this.opacity;
        
            //bg lines
            ctx.strokeStyle = "#444";
            ctx.beginPath();
        
            let pos = this.timeToX( 0 );
            if(pos < margin)
                pos = margin;
            ctx.moveTo( pos + 0.5, timeline_height);
            ctx.lineTo( pos + 0.5, canvas.height);
            ctx.moveTo( Math.round( this.timeToX( duration ) ) + 0.5, timeline_height);
            ctx.lineTo( Math.round( this.timeToX( duration ) ) + 0.5, canvas.height);
            ctx.stroke();

            ctx.restore();
        }

        /**
         * @method draw
         * @param {*} currentTime 
         * @param {*} rect 
         * TODO
         */

        draw( currentTime = this.currentTime, rect ) {

            let ctx = this.canvas.getContext("2d");
            if(!rect)
                rect = [0, ctx.canvas.height - ctx.canvas.height , ctx.canvas.width, ctx.canvas.height ];

            // this.canvas = ctx.canvas;
            this.position[0] = rect[0];
            this.position[1] = rect[1];
            let w = rect[2];
            let h = rect[3];
            let timelineHeight = this.size[1];
            this.currentTime = currentTime;
            // this.updateHeader();
            this.currentScrollInPixels = this.scrollableHeight <= h ? 0 : (this.currentScroll * (this.scrollableHeight - timelineHeight));

            //zoom
            if(this.duration > 0)
            {
                this.startTime = -50 / this.secondsToPixels;
                // this.startTime = Math.floor( this.session.start_time ); //seconds
                this.startTime = this.session.start_time ; //seconds
                if(this.startTime < 0)
                    this.startTime = 0;
                // this.endTime = Math.ceil( this.startTime + (w - this.session.left_margin) * this.pixelsToSeconds );
                this.endTime = this.startTime + (w - this.session.left_margin) * this.pixelsToSeconds ;
                if(this.endTime > this.duration)
                    this.endTime = this.duration;
                if(this.startTime > this.endTime) //avoids weird bug
                    this.endTime = this.startTime + 1;
            }

            this.tracksDrawn.length = 0;

            // Background
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = "black";
	        ctx.clearRect(0,0, this.canvas.width, this.canvas.height );

            this.drawTimeInfo(w);

            this.drawTracksBackground(w, h);

            // Current time marker vertical line
            let true_pos = Math.round( this.timeToX( this.currentTime ) ) + 0.5;
            let quant_current_time = Math.round( this.currentTime * this.framerate ) / this.framerate;
            let pos = Math.round( this.timeToX( quant_current_time ) ) + 0.5; //current_time is quantized
            if(pos >= this.session.left_margin)
            {
                // ctx.strokeStyle = "#ABA";
                // ctx.beginPath();
                // ctx.globalAlpha = 0.3;
                // ctx.moveTo(pos, 0); ctx.lineTo( pos, h );
                // ctx.stroke();

                ctx.strokeStyle = ctx.fillStyle = "#ADF";
                ctx.globalAlpha = this.opacity;
                ctx.beginPath();
                ctx.moveTo(true_pos, 0); ctx.lineTo(true_pos, this.canvas.height);//line
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(true_pos - 4, 0); ctx.lineTo(true_pos + 4, 0); ctx.lineTo(true_pos, 6);//triangle
                ctx.closePath();
                ctx.fill();
            }

            if(this.onDrawContent && this.animationClip) {
                
                ctx.translate( this.position[0], this.position[1] + this.topMargin ); //20 is the top margin area

                // Selections
                if(this.boxSelection && this.boxSelectionStart && this.boxSelectionEnd) {
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = "#AAA";
                    ctx.strokeRect( this.boxSelectionStart[0], this.boxSelectionStart[1], this.boxSelectionEnd[0] - this.boxSelectionStart[0], this.boxSelectionEnd[1] - this.boxSelectionStart[1]);
                    ctx.stroke();
                    ctx.globalAlpha = this.opacity;
                }

                this.onDrawContent( ctx, this.timeStart, this.timeEnd, this );

                ctx.translate( -this.position[0], -(this.position[1] + this.topMargin) ); //20 is the top margin area
            }
        }

        /**
         * @method drawMarkers
         * @param {*} ctx 
         * @param {*} markers 
         * TODO
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
            this.trackState = [];
        }

        /**
         * @method setDuration
         * @param {Number} t 
         */

        setDuration( t ) {
            this.duration = this.animationClip.duration = t; 
            this.updateHeader();

            if( this.onSetDuration ) 
                this.onSetDuration( t );	 
        }


        // Converts distance in pixels to time
        xToTime( x ) {
            return (x - this.session.left_margin) / this.secondsToPixels + this.session.start_time;
        }

        // Converts time to disance in pixels
        timeToX( t ) {
            return this.session.left_margin + (t - this.session.start_time) * this.secondsToPixels;
        }

        getCurrentFrame( framerate ) {
            return Math.floor(this.currentTime * framerate);
        }
        
        /**
         * @method setScale
         * @param {*} v
         * TODO
         */

        setScale( v ) {

            if(!this.session)
                return;

            var centerx = this.canvas.width * 0.5;
            var x = this.xToTime( centerx );
            this.secondsToPixels *= v;
            this.session.start_time += x - this.xToTime( centerx );
            this.draw();
        }
        
        /**
         * @method setFramerate
         * @param {*} v
         */

        setFramerate( v ) {
            this.framerate = v;
        }

        /**
         * @method processMouse
         * @param {*} e
         */

        processMouse( e ) {

            if(!this.canvas)
                return;
            e.preventDefault();
            e.stopPropagation();
            e.multipleSelection = false;
            var w = this.size[0];

            // Process mouse
            var x = e.offsetX;
            var y = e.offsetY;
            e.deltax = x - this.lastMouse[0];
            e.deltay = y - this.lastMouse[1];
            var localX = e.offsetX - this.position[0];
            var localY = e.offsetY - this.position[1];
            var timelineHeight = this.size[1];

            // if(!this.grabbing_timeline && !this.movingKeys)
            //     this.canvas.style.cursor = "default";
                
          
            var timeX = this.timeToX( this.currentTime );
            var current_grabbing_timeline = localY < this.topMargin && localX > this.session.left_margin && 
            localX > (timeX - 6) && localX < (timeX + 6);

            if( current_grabbing_timeline )
                this.canvas.style.cursor = "col-resize";
            else if(this.movingKeys) {
                this.canvas.style.cursor = "grabbing";    
            }
             else 
                this.canvas.style.cursor = "default";
    
            var time = this.xToTime(x, true);

            var is_inside = x >= this.position[0] && x <= (this.position[0] + this.size[0]) &&
                            y >= this.position[1] && y <= (this.position[1] + this.size[1]);

            var track = null;
            for(var i = this.tracksDrawn.length - 1; i >= 0; --i)
            {
                var t = this.tracksDrawn[i];
                if( localY >= t[1] && localY < (t[1] + t[2]) )
                {
                    track = t[0];
                    break;
                }
            }

            e.track = track;
            e.localX = localX;
            e.localY = localY;

            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }

            if( e.type == "mouseup" )
            {
                // this.canvas.style.cursor = "default";
                const discard = this.movingKeys || (LX.UTILS.getTime() - this.clickTime) > 420; // ms
                this.movingKeys ? innerSetTime( this.currentTime ) : 0;

                if(e.button == 0 && this.grabbing && this.onClipMoved && this.lastClipsSelected.length){
                    this.onClipMoved(this.lastClipsSelected);
                }

                this.grabbing_timeline = false;
                this.grabbing = false;
                this.grabbingScroll = false;
                this.movingKeys = false;
                this.timeBeforeMove = null;
                e.discard = discard;
                
                if( e.button == 0 && this.onMouseUp )
                    this.onMouseUp(e, time);
            }

            if( !is_inside && !this.grabbing && !(e.metaKey || e.altKey ) )
                return;

            if( this.onMouse && this.onMouse( e, time, this ) )
                return;

            if( e.type == "mousedown")	{
                this.clickTime = LX.UTILS.getTime();

                if(this.trackBulletCallback && e.track)
                    this.trackBulletCallback(e.track,e,this,[localX,localY]);

                if( timelineHeight < this.scrollableHeight && x > w - 10)
                {
                    this.grabbingScroll = true;
                }
                else
                {
                    this.grabbing = true;
                    this.grabTime = time - this.currentTime;

                    this.grabbing_timeline = current_grabbing_timeline;

                    if(this.onMouseDown)
                        this.onMouseDown(e, time);
                }
            }
            else if( e.type == "mousemove" ) {

                if(e.shiftKey) {
                    if(this.boxSelection) {
                        this.boxSelectionEnd = [localX, localY - 20];
                        return; // Handled
                    }
                }
                else if(this.grabbing && e.button !=2 && !this.movingKeys) {
                    this.canvas.style.cursor = "grabbing"; 
                    if(this.grabbing_timeline )
                    {
                        let time = this.xToTime( localX );
                        time = Math.max(0, time);
                        this.currentTime = Math.min(this.duration, time);
                        this.draw();
                        LX.emit( "@on_current_time_" + this.constructor.name, this.currentTime );
                    }
                    else
                    {
                        // Move timeline in X (independent of current time)
                        var old = this.xToTime( this.lastMouse[0] );
                        var now = this.xToTime( e.offsetX );
                        this.session.start_time += (old - now);
                    }
                }
                if(this.onMouseMove)
                    this.onMouseMove(e, time);
            }

            else if( e.type == "wheel" ) {
                if( timelineHeight < this.scrollableHeight && x > w - 10)
                {
                    this.currentScroll = LX.UTILS.clamp( this.currentScroll + (e.wheelDelta < 0 ? 0.1 : -0.1), 0, 1);
                }
                else
                {
                    this.setScale( e.wheelDelta < 0 ? 0.95 : 1.05 );
                }
            }
            else if (e.type == "dblclick" && this.onDblClick) {
                this.onDblClick(e);	
            }
            else if (e.type == "contextmenu" && this.showContextMenu)
                this.showContextMenu(e);

            this.lastMouse[0] = x;
            this.lastMouse[1] = y;

            return true;
        }
        
        /**
         * @method drawTrackWithKeyframes
         * @param {*} ctx
         * ...
         * @description helper function, you can call it from onDrawContent to render all the keyframes
         * TODO
         */

        drawTrackWithKeyframes( ctx, y, trackHeight, title, track, trackInfo ) {
            
            if(trackInfo.enabled === false)
                ctx.globalAlpha = 0.4;

            ctx.font = Math.floor( trackHeight * 0.8) + "px Arial";
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            
            // if(title != null)
            // {
            //     // var info = ctx.measureText( title );
            //     ctx.fillStyle = this.active ? "rgba(255,255,255,0.9)" : "rgba(250,250,250,0.7)";
            //     ctx.fillText( title, 25, y + trackHeight * 0.75 );
            // }
            ctx.fillStyle = "#2c303570";
            if(trackInfo.isSelected)
                ctx.fillRect(0, y, ctx.canvas.width, trackHeight );
            ctx.fillStyle = "#5e9fdd"//"rgba(10,200,200,1)";
            var keyframes = track.times;

            if(keyframes) {
                
                this.tracksDrawn.push([track,y+this.topMargin,trackHeight]);
                for(var j = 0; j < keyframes.length; ++j)
                {
                    let time = keyframes[j];
                    let selected = trackInfo.selected[j];
                    if( time < this.startTime || time > this.endTime )
                        continue;
                    var keyframePosX = this.timeToX( time );
                    if( keyframePosX > this.sidebarWidth ){
                        ctx.save();

                        let margin = -1;
                        let size = trackHeight * 0.3;
                        if(trackInfo.edited[j])
                            ctx.fillStyle = Timeline.COLOR_EDITED;
                        if(selected) {
                            ctx.fillStyle = Timeline.COLOR_SELECTED;
                            size = trackHeight * 0.35;
                            margin = 0;
                        }
                        if(trackInfo.hovered[j]) {
                            size = trackHeight * 0.35;
                            ctx.fillStyle = Timeline.COLOR_HOVERED;
                            margin = 0;
                        }
                        if(trackInfo.locked)
                            ctx.fillStyle = Timeline.COLOR_LOCK;

                        if(!this.active || trackInfo.active == false)
                            ctx.fillStyle = Timeline.COLOR_UNACTIVE;
                            
                        ctx.translate(keyframePosX, y + this.trackHeight * 0.75 + margin);
                        ctx.rotate(45 * Math.PI / 180);		
                        ctx.fillRect( -size, -size, size, size);
                        if(selected) {
                            ctx.globalAlpha = 0.3;
                            ctx.fillRect( -size*1.5, -size*1.5, size*2, size*2);
                        }
                            
                        ctx.restore();
                    }
                }
            }

            ctx.globalAlpha = this.opacity;
        }

        /**
         * @method drawTrackWithBoxes
         * @param {*} ctx
         * ...
         * TODO
         */

        drawTrackWithBoxes( ctx, y, trackHeight, title, track ) {

            let offset = (trackHeight - trackHeight *0.6)*0.5;
            trackHeight *= 0.6;
            let selectedClipArea = null;

            if(track.enabled === false)
                ctx.globalAlpha = 0.4;
            this.tracksDrawn.push([track,y+this.topMargin,trackHeight]);
            this.canvas = this.canvas || ctx.canvas;
            ctx.font = Math.floor( trackHeight * 0.8) + "px Arial";
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255,255,255,0.8)";

            // if(title != null)
            // {
            //     // var info = ctx.measureText( title );
            //     ctx.fillStyle = "rgba(255,255,255,0.9)";
            //     ctx.fillText( title, 25, y + trackHeight * 0.8 );
            // }

            ctx.fillStyle = "rgba(10,200,200,1)";
            var clips = track.clips;
            let trackAlpha = 1;

            if(clips) {
         
                for(var j = 0; j < clips.length; ++j)
                {
                    let clip = clips[j];
                    //let selected = track.selected[j];
                    var x = Math.floor( this.timeToX(clip.start) ) + 0.5;
                    var x2 = Math.floor( this.timeToX( clip.start + clip.duration ) ) + 0.5;
                    var w = x2-x;

                    if( x2 < 0 || x > this.canvas.width )
                        continue;

                    //background rect
                    ctx.globalAlpha = trackAlpha;
                    ctx.fillStyle = clip.clipColor || "#5e9fdd"//#333";
                    //ctx.fillRect(x,y,w,trackHeight);
                    ctx.roundRect( x, y + offset, w, trackHeight , 5, true);
                   
                    let fadeinX = this.secondsToPixels * ((clip.fadein || 0) - clip.start);
                    let fadeoutX = this.secondsToPixels * (clip.start + clip.duration - (clip.fadeout || (clip.start + clip.duration)));
       
                    let color = LX.UTILS.HexToRgb(ctx.fillStyle);
                    color = color.map(x => x*=0.8);
                    ctx.fillStyle = 'rgba(' + color.join(',') + ', 0.8)';
                    
                    if(fadeinX>0)
                        ctx.roundRect(x, y + offset, fadeinX, trackHeight, {tl: 5, bl: 5, tr:0, br:0}, true);
                    if(fadeoutX)
                        ctx.roundRect( x + w - fadeoutX, y + offset, fadeoutX, trackHeight, {tl: 0, bl: 0, tr:5, br:5}, true);
                    
                    // //draw clip content
                    // if( clip.drawClip )
                    // {
                    //     ctx.save();
                    //     ctx.translate(x,y);
                    //     ctx.strokeStyle = "#AAA";
                    //     ctx.fillStyle = "#AAA";
                    //     clip.drawClip( ctx, x2-x, trackHeight, this.selectedClip == clip || track.selected[j], this );
                    //     ctx.restore();
                    // }
                    //draw clip outline
                    if(clip.hidden)
                        ctx.globalAlpha = trackAlpha * 0.5;
                    
                        var safex = Math.max(-2, x );
                        var safex2 = Math.min( this.canvas.width + 2, x2 );
                    // ctx.lineWidth = 0.5;
                    // ctx.strokeStyle = clip.constructor.color || "black";
                    // ctx.strokeRect( safex, y, safex2-safex, trackHeight );
                    ctx.globalAlpha = trackAlpha;
                    if(this.selectedClip == clip || track.selected[j])
                        selectedClipArea = [x, y + offset, x2-x, trackHeight];

                    ctx.font = "12px Rubik";
                    //render clip selection area
                    if(selectedClipArea)
                    {
                        ctx.strokeStyle = track.clips[j].clipColor;
                        ctx.globalAlpha = 0.5;
                        ctx.lineWidth = 2.5;
                        ctx.roundRect(selectedClipArea[0]-1,selectedClipArea[1]-1,selectedClipArea[2]+2,selectedClipArea[3]+2, 5, false, true);
                        ctx.strokeStyle = "#888";
                        ctx.lineWidth = 0.5;
                        ctx.globalAlpha = this.opacity;
                        ctx.font = "bold 13px Rubik";
                    }

                    let text = clip.id.replaceAll("_", " ").replaceAll("-", " ");
                    let textInfo = ctx.measureText( text );
                    ctx.fillStyle = clip.color;
                    
                    if( textInfo.width < (w - 24) )
                        ctx.fillText( text, x + (w - textInfo.width)*0.5,  y + offset + 12 );
                    ctx.font = "12px Rubik";
                }
            }

            //ctx.restore();
        }

        /**
        * @method selectTrack
        * @param {id, parent, children, visible} trackInfo 
        */

        selectTrack( trackInfo) {
            this.unSelectAllTracks();
            
            let [name, type] = trackInfo.id.split(" (");
            
            if(type)
                type = type.replaceAll(")", "").replaceAll(" ", "");
            else {
                type = name;
                name = trackInfo.parent.id;
            }
            let tracks = this.tracksPerItem[name];

            for(let i = 0; i < tracks.length; i++) {
                if(tracks[i].type != type && tracks.length > 1)
                    continue;
                this.tracksPerItem[name][i].isSelected = true;
                trackInfo = this.tracksPerItem[name][i];
            }
            
            if(this.onSelectTrack)
                this.onSelectTrack(trackInfo);
        }

        unSelectAllTracks() {
            for(let i = 0; i < this.selectedItems.length; i++) {
                let item = this.selectedItems[i];
                let tracks = this.tracksPerItem[item];
                for(let t = 0; t < tracks.length; t++) {
                    tracks[t].isSelected = false;
                }
            }
        }

        /**
        * @method changeTrackVisibility
        * @param {id, parent, children, visible} trackInfo 
        */

        changeTrackVisibility(trackInfo, visible) {
            let [name, type] = trackInfo.id.split(" (");
            if(type)
                type = type.replaceAll(")", "").replaceAll(" ", "");
            else {
                type = name;
                name = trackInfo.parent.id;
            }
            trackInfo = {name, type};
            let tracks = this.tracksPerItem[name];

            for(let i = 0; i < tracks.length; i++) {
                if(tracks[i].type != type && tracks.length > 1)
                    continue;
                    this.tracksPerItem[name][i].active = visible;
                    trackInfo = this.tracksPerItem[name][i];
            }
            this.draw();
            if(this.onChangeTrackVisibility)
                this.onChangeTrackVisibility(trackInfo, visible);
        }

        /**
        * @method changeTrackDisplay
        * @param {id, parent, children, display} trackInfo 
        */

        changeTrackDisplay(trackInfo, hide) {

            for(let idx = 0; idx < trackInfo.children.length; idx++) {
                let [name, type] = trackInfo.children[idx].id.split(" (");
                if(type)
                    type = type.replaceAll(")", "").replaceAll(" ", "");
                else {
                    type = name;
                    name = trackInfo.parent.id;
                }
                //trackInfo = {name, type};
                let tracks = this.tracksPerItem[name];
    
                for(let i = 0; i < tracks.length; i++) {
                    if(tracks[i].type != type && tracks.length > 1)
                        continue;
                        this.tracksPerItem[name][i].hide = hide;
                  //      trackInfo = this.tracksPerItem[name][i];
                }
            }
            
            this.draw();

            if(this.onChangeTrackDisplay)
                this.onChangeTrackDisplay(trackInfo, hide)
        }

        /**
         * @method resize
         * @param {*} size
         * 
         * 
         */
        resize( size = [this.root.parent.root.clientWidth, this.root.parent.root.clientHeight]) {

            this.root.root.style.width = size[0] + "px";
            this.root.root.style.height = size[1] + "px";
            
            this.size = size; 
            this.content_area.setSize([size[0], size[1] - this.header_offset]);
            
            let w = size[0] - this.leftPanel.root.clientWidth - 8;
            this.#resizecanvas([w , size[1]]);
        }

        #resizecanvas( size ) {
            this.canvas.width = size[0];
            this.canvas.height = size[1] - this.header_offset;
            var w = Math.max(300, this.canvas.width);
            this.secondsToPixels = ( w - this.session.left_margin ) / this.duration;
            this.pixelsToSeconds = 1 / this.secondsToPixels;
            this.draw(this.currentTime);
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
            this.resize();
            
        }
    };

    Timeline.COLOR = "#5e9fdd";
    Timeline.COLOR_HOVERED = "rgba(250,250,250,0.7)";
    Timeline.COLOR_SELECTED = "rgba(250,250,20,1)"///"rgba(250,250,20,1)";
    Timeline.COLOR_UNACTIVE = "rgba(250,250,250,0.7)";
    Timeline.COLOR_LOCK = "rgba(255,125,125,0.7)";
    Timeline.COLOR_EDITED = "white"//"rgba(125,250,250, 1)";

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
            
            this.tracksPerItem = {};
            
            // this.selectedItems = selectedItems;
            this.snappedKeyFrameIndex = -1;
            this.autoKeyEnabled = false;


            if(this.animationClip)
                this.processTracks(this.animationClip);

            // Add button data
            let offset = 25;
            if(this.active)
            {

            }
        }

        onMouseUp( e, time )  {

            let track = e.track;
            let localX = e.localX;
            let discard = e.discard;
            
            if(e.shiftKey) {
                e.multipleSelection = true;
                // Multiple selection
                if(!discard && track) {
                    this.processCurrentKeyFrame( e, null, track, localX, true ); 
                }
                // Box selection
                else{
            
                    this.unSelectAllKeyFrames();
                    
                    let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                    
                    for(let t of tracks) {
                        let keyFrameIndices = this.getKeyFramesInRange(t, 
                            this.xToTime( this.boxSelectionStart[0] ), 
                            this.xToTime( this.boxSelectionEnd[0] ),
                            this.pixelsToSeconds * 5);
                            
                        if(keyFrameIndices) {
                            for(let index of keyFrameIndices)
                                this.processCurrentKeyFrame( e, index, t, null, true );
                        }
                    }
                }

            }else {
                let boundingBox = this.canvas.getBoundingClientRect()
                if(e.y < boundingBox.top || e.y > boundingBox.bottom) 
                    return;
                // Check exact track keyframe
                if(!discard && track) {
                    this.processCurrentKeyFrame( e, null, track, localX );
                    
                } 
                else {
                    this.unSelectAllKeyFrames();
                    let x = e.offsetX;
                    let y = e.offsetY - this.topMargin;
                    for( const b of this.buttonsDrawn ) {
                        b.pressed = false;
                        const bActive = x >= b[2] && x <= (b[2] + b[4]) && y >= b[3] && y <= (b[3] + b[5]);
                        if(bActive) {
                            const callback = b[6]; 
                            if(callback) callback(e);
                            else this[ b[1] ] = !this[ b[1] ];
                            break;
                        }
                    }
                }
            }

            this.canvas.classList.remove('grabbing');
            this.boxSelection = false;
            this.boxSelectionStart = null;
            this.boxSelectionEnd = null;
        }

        onMouseDown( e, time ) {
            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;

            if(e.shiftKey) {

                this.boxSelection = true;
                this.boxSelectionStart = [localX, localY - 20];
                e.multipleSelection = true;
            }
            else if(e.ctrlKey && track && !track.locked) {
                const keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                if( keyFrameIndex != undefined ) {
                    this.processCurrentKeyFrame( e, keyFrameIndex, track, null, e.multipleSelection ); // Settings this as multiple so time is not being set
                    this.movingKeys = true;
                    this.canvas.style.cursor = "grab";  
                    // Set pre-move state
                    for(let selectedKey of this.lastKeyFramesSelected) {
                        let [name, idx, keyIndex] = selectedKey;
                        let trackInfo = this.tracksPerItem[name][idx];
                        selectedKey[3] = this.animationClip.tracks[ trackInfo.clipIdx ].times[ keyIndex ];
                    }
                    
                    this.timeBeforeMove = track.times[ keyFrameIndex ];
                    this.canvas.classList.add('grabbing');
                    
                }
            } else if(!track) {
                let x = e.offsetX;
                let y = e.offsetY - this.topMargin;
                for( const b of this.buttonsDrawn ) {
                    const bActive = x >= b[2] && x <= (b[2] + b[4]) && y >= b[3] && y <= (b[3] + b[5]);
                    b.pressed = bActive;
                }
            }
        }

        onMouseMove( e, time ) {
            
            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;

            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }
            // Manage keyframe movement
            if(this.movingKeys) {

                this.clearState();
                const newTime = this.xToTime( localX );
                
                for(let [name, idx, keyIndex, keyTime] of this.lastKeyFramesSelected) {
                    track = this.tracksPerItem[name][idx];
                    if(track && track.locked)
                        return;

                    this.canvas.style.cursor = "grabbing";

                    const delta = this.timeBeforeMove - keyTime;
                    this.animationClip.tracks[ track.clipIdx ].times[ keyIndex ] = Math.min( this.animationClip.duration, Math.max(0, newTime - delta) );
                }

                return;
            }

            const removeHover = () => {
                if(this.lastHovered)
                    this.tracksPerItem[ this.lastHovered[0] ][ this.lastHovered[1] ].hovered[ this.lastHovered[2] ] = undefined;
            };

            if( this.grabbing && e.button != 2) {

                // fix this
                if(e.shiftKey && track) {

                    let keyFrameIndex = this.getNearestKeyFrame( track, this.currentTime);
                    
                    if(keyFrameIndex != this.snappedKeyFrameIndex){
                        this.snappedKeyFrameIndex = keyFrameIndex;
                        this.currentTime = track.times[ keyFrameIndex ];		
                        innerSetTime( this.currentTime );		
                    }
                }
                else{
                    innerSetTime( this.currentTime );	
                }
                    
            }
            else if(track) {

                let keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                if(keyFrameIndex != undefined) {
                    
                    const name = this.tracksDictionary[track.fullname]; 
                    let t = this.tracksPerItem[ name ][track.idx];
                    if(t && t.locked)
                        return;
                    removeHover();
                                            
                    this.lastHovered = [name, track.idx, keyFrameIndex];
                    t.hovered[keyFrameIndex] = true;

                }else {
                    removeHover();
                }
            }
            else {
                removeHover();
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
                                    this.pasteKeyFrameValue(e, this.tracksPerItem[id][trackIdx], keyIdx);
                            }
                        }
                    )
                }
                actions.push(
                    {
                        title: "Copy",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {
                            let toCopy = {};
                            for(let i = 0; i < this.lastKeyFramesSelected.length; i++){
                                let [id, trackIdx, keyIdx] = this.lastKeyFramesSelected[i];
                                if(toCopy[this.tracksPerItem[id][trackIdx].clipIdx]) {
                                    toCopy[this.tracksPerItem[id][trackIdx].clipIdx].idxs.push(keyIdx);
                                } else {
                                    toCopy[this.tracksPerItem[id][trackIdx].clipIdx] = {idxs : [keyIdx]};
                                    toCopy[this.tracksPerItem[id][trackIdx].clipIdx].track = this.tracksPerItem[id][trackIdx]
                                }                
                                if(i == 0) {
                                    this.copyKeyFrameValue(this.tracksPerItem[id][trackIdx], keyIdx)
                                }
                            }
                            for(let clipIdx in toCopy) {
                                
                                this.copyKeyFrames(toCopy[clipIdx].track, toCopy[clipIdx].idxs)
                            }
                           
                        }
                    }
                )
                actions.push(
                    {
                        title: "Delete",// + " <i class='bi bi-trash float-right'></i>",
                        callback: () => {
                            let keyframesToDelete = this.lastKeyFramesSelected;
                            e.multipleSelection = keyframesToDelete.length > 1 ?? false;
                            for(let i = 0; i < keyframesToDelete.length; i++){
                                this.deleteKeyFrame(e, keyframesToDelete[i][1], keyframesToDelete[i][2]);
                            }
                            
                        }
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
                                let currentTime = this.currentTime;
                                for(let clipIdx in this.clipboard.keyframes) {
                                    let indices = Object.keys( this.clipboard.keyframes[clipIdx].values)
                                    this.pasteKeyFrames(e, clipIdx, indices);
                                    this.currentTime = currentTime;
                                }
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

        onDrawContent( ctx, timeStart, timeEnd ) {
        
            if(this.selectedItems == null || !this.tracksPerItem) 
                return;
            
            ctx.save();

            let offset = this.trackHeight;
            for(let t = 0; t < this.selectedItems.length; t++) {
                let tracks = this.tracksPerItem[this.selectedItems[t]] ? this.tracksPerItem[this.selectedItems[t]] : [{name: this.selectedItems[t]}];
                if(!tracks) continue;
                
                const height = this.trackHeight;
                let offsetI = 0;
                for(let i = 0; i < tracks.length; i++) {
                    let track = tracks[i];
                    if(track.hide) {
                        continue;
                    }
                    this.drawTrackWithKeyframes(ctx, offsetI * height + offset, height, track.name + " (" + track.type + ")", this.animationClip.tracks[track.clipIdx], track);
                    offsetI++;
                }
                offset += offsetI * height + height;
            }
             
            ctx.restore();
        };

        onUpdateTracks ( keyType ) {
        
            if(this.selectedItems == null || this.lastKeyFramesSelected.length || !this.autoKeyEnabled)
                return;

            for(let i = 0; i < this.selectedItems.length; i++) {
                let tracks = this.tracksPerItem[this.selectedItems[i]];
                if(!tracks) continue;
    
                // Get current track
                const selectedTrackIdx = tracks.findIndex( t => t.type === keyType );
                if(selectedTrackIdx < 0)
                    return;
                let track = tracks[ selectedTrackIdx ];
                
                // Add new keyframe
                const newIdx = this.addKeyFrame( track );
                if(newIdx === null) 
                    continue;
    
                // Select it
                this.lastKeyFramesSelected.push( [track.name, track.idx, newIdx] );
                track.selected[newIdx] = true;
    
            }
            LX.emit( "@on_current_time_" + this.constructor.name, this.currentTime );
            // Update time
            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            return true; // Handled
        }

        // Creates a map for each item -> tracks
        processTracks(animation) {

            this.tracksPerItem = {};
            this.tracksDictionary = {};
            this.animationClip = {
                name: animation.name,
                duration: animation.duration,
                speed: animation.speed ?? 1,
                tracks: []
            };

            for( let i = 0; i < animation.tracks.length; ++i ) {

                let track = animation.tracks[i];

                const [name, type] = this.getTrackName(track.name);

                let trackInfo = {
                    fullname: track.name,
                    name: name, type: type,
                    dim: track.values.length/track.times.length,
                    selected: [], edited: [], hovered: [], active: true,
                    times: track.times,
                    values: track.values
                };
                
                if(!this.tracksPerItem[name]) {
                    this.tracksPerItem[name] = [trackInfo];
                }else {
                    this.tracksPerItem[name].push( trackInfo );
                }
                

                const trackIndex = this.tracksPerItem[name].length - 1;
                this.tracksPerItem[name][trackIndex].idx = trackIndex;
                this.tracksPerItem[name][trackIndex].clipIdx = i;

                // Save index also in original track
                track.idx = trackIndex;
                this.tracksDictionary[track.name] = name;

                this.animationClip.tracks.push(trackInfo);
            }
        }


        optimizeTrack(trackIdx) {
            const track = this.animationClip.tracks[trackIdx];
            if(track.optimize) {

                track.optimize( this.optimizeThreshold );
                if(this.onOptimizeTracks)
                   this.onOptimizeTracks(trackIdx);
            }
        }
    
        optimizeTracks() {
    
            if(!this.animationClip)
                return;
    
            for( let i = 0; i < this.animationClip.tracks.length; ++i ) {
                const track = this.animationClip.tracks[i];
                if(track.optimize) {
    
                    track.optimize( this.optimizeThreshold );
                    if(this.onOptimizeTracks)
                        this.onOptimizeTracks(i);
                }
            }
        }


        getNumTracks( item ) {
            if(!item || !this.tracksPerItem)
                return;
            const tracks = this.tracksPerItem[item.name];
            return tracks ? tracks.length : null;
        }

    
        onShowOptimizeMenu( e ) {
            
            if(this.selectedItems == null)
                return;

            let tracks = [];
            for(let i = 0; i < this.selectedItems.length; i++) {

                tracks = [...tracks, ...this.tracksPerItem[this.selectedItems[i]]];
                if(!tracks) continue;
    
            }
            if(!tracks.length) return;

            const threshold = this.onGetOptimizeThreshold ? this.onGetOptimizeThreshold() : 0.025;
            LX.addContextMenu("Optimize", e, m => {
                for( let t of tracks ) {
                    m.add( t.name + (t.type ? "@" + t.type : ""), () => { 
                        if(this.optimizeTrack) {
                            this.optimizeTrack(t.clipIdx, threshold)
                        // this.animationClip.tracks[t.clipIdx].optimize( threshold );
                            t.edited = [];
                        }
                    })
                }
            });
        }

        onPreProcessTrack( track ) {
            const name = this.tracksDictionary[track.fullname];
            let trackInfo = this.tracksPerItem[name][track.idx];
            trackInfo.selected = [];
            trackInfo.edited = [];
            trackInfo.hovered = [];
        }

        isKeyFrameSelected( track, index ) {
            return track.selected[ index ];
        }

        saveState( clipIdx ) {

            const localIdx = this.animationClip.tracks[clipIdx].idx;
            const name = this.getTrackName(this.animationClip.tracks[clipIdx].name)[0];
            const trackInfo = this.tracksPerItem[name][localIdx];

            this.trackState.push({
                idx: clipIdx,
                t: this.animationClip.tracks[clipIdx].times.slice(),
                v: this.animationClip.tracks[clipIdx].values.slice(),
                editedTracks: [].concat(trackInfo.edited)
            });
        }

        restoreState() {
            
            if(!this.trackState.length)
            return;

            const state = this.trackState.pop();
            this.animationClip.tracks[state.idx].times = state.t;
            this.animationClip.tracks[state.idx].values = state.v;

            const localIdx = this.animationClip.tracks[state.idx].idx;
            const name = this.getTrackName(this.animationClip.tracks[state.idx].name)[0];
            this.tracksPerItem[name][localIdx].edited = state.editedTracks;

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( state.idx );
        }

        selectKeyFrame( track, selectionInfo, index ) {
            
            if(index == undefined || !track)
            return;

            this.unSelectAllKeyFrames();
                                
            this.lastKeyFramesSelected.push( selectionInfo );
            if(track.locked)
                return;
            track.selected[index] = true;
            this.currentTime =  this.animationClip.tracks[track.clipIdx].times[ index ];
            LX.emit( "@on_current_time_" + this.constructor.name, this.currentTime );
            if( this.onSetTime )
                this.onSetTime(  this.animationClip.tracks[track.clipIdx].times[ index ]);
        }

        canPasteKeyFrame () {
            return this.clipboard != null;
        }

        copyKeyFrameValue( track, index ) {

            // 1 element clipboard by now

            let values = [];
            let start = index * track.dim;
            for(let i = start; i < start + track.dim; ++i)
                values.push( this.animationClip.tracks[ track.clipIdx ].values[i] );

            if(!this.clipboard)
                this.clipboard = {};

            this.clipboard.value = {
                type: track.type,
                values: values
            };
        }

        copyKeyFrames( track, indices ) {

            let clipIdx = track.clipIdx;
            if(!this.clipboard)
                this.clipboard = {};
            if(!this.clipboard.keyframes) {
                this.clipboard.keyframes = {};
            }
                
            this.clipboard.keyframes[clipIdx] = { track: track, values:{} }; 
            // 1 element clipboard by now
            for(let idx = 0; idx < indices.length; idx++ ){
                let keyIdx = indices[idx] ;
                let values = [];
                let start = keyIdx * track.dim;
                for(let i = start; i < start + track.dim; ++i)
                    values.push( this.animationClip.tracks[ clipIdx ].values[i] );
                
                this.clipboard.keyframes[clipIdx].values[indices[idx]] =  values;
            };
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

            if(this.onSetTime)
                this.onSetTime(this.currentTime);

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
                this.#paste( this.tracksPerItem[name][idx], keyIndex );
            }
        }

        pasteKeyFrames( e, clipIdx, indices ) {
            
            this.saveState(clipIdx);

            // Copy to current key
            for(let i = 0; i < indices.length; i++) {
                let value = this.clipboard.keyframes[clipIdx].values[indices[i]];
                if(typeof value == 'number')
                    value = [value];
                if(i > 0) {
                    let delta = this.animationClip.tracks[clipIdx].times[indices[i]] - this.animationClip.tracks[clipIdx].times[indices[i-1]];
                    this.currentTime += delta;

                }
                this.addKeyFrame( this.clipboard.keyframes[clipIdx].track, value);
            }
            
            if(!e.multipleSelection)
            return;
            
            // Don't want anything after this
            this.clearState();

            // Copy to every selected key
            for(let [name, idx, keyIndex] of this.lastKeyFramesSelected) {
                this.#paste( this.tracksPerItem[name][idx], keyIndex );
            }
        }

        addKeyFrame( track, value ) {

            // Update animationClip information
            let clipIdx = track.clipIdx;

            let [name, keyType] = this.getTrackName(track.name)
            let tracks = this.tracksPerItem[name];
            if(!tracks) return;

            // Get current track
            const selectedTrackIdx = tracks.findIndex( t => t.type === keyType );
            if(selectedTrackIdx >=  0)
                track = tracks[ selectedTrackIdx ];
            if(clipIdx == undefined) {
                if(selectedTrackIdx < 0)
                    return;
                    clipIdx = tracks[ selectedTrackIdx ].clipIdx;
            }

            // Time slot with other key?
            const keyInCurrentSlot = this.animationClip.tracks[clipIdx].times.find( t => { return !LX.UTILS.compareThreshold(this.currentTime, t, t, 0.001 ); });
            if( keyInCurrentSlot ) {
                console.warn("There is already a keyframe stored in time slot ", keyInCurrentSlot)
                return;
            }

            this.saveState(clipIdx);

            // Find new index
            let newIdx = this.animationClip.tracks[clipIdx].times.findIndex( t => t > this.currentTime );

            // Add as last index
            let lastIndex = false;
            if(newIdx < 0) {
                newIdx = this.animationClip.tracks[clipIdx].times.length;
                lastIndex = true;
            }

            // Add time key
            const timesArray = [];
            this.animationClip.tracks[clipIdx].times.forEach( (a, b) => {
                b == newIdx ? timesArray.push(this.currentTime, a) : timesArray.push(a);
            } );

            if(lastIndex) {
                timesArray.push(this.currentTime);			
            }

            this.animationClip.tracks[clipIdx].times = new Float32Array( timesArray );
           
            // Add values
            let valuesArray = [];
            let dim = value.length;
            this.animationClip.tracks[clipIdx].values.forEach( (a, b) => {
                if(b == newIdx * dim) {
                    for( let i = 0; i < dim; ++i )
                        valuesArray.push(value[i]);
                }
                valuesArray.push(a);
            } );

            if(lastIndex) {
                for( let i = 0; i < dim; ++i )
                    valuesArray.push(value[i]);
            }

            this.animationClip.tracks[clipIdx].values = new Float32Array( valuesArray );

            
            // Move the other's key properties
            for(let i = (this.animationClip.tracks[clipIdx].times.length - 1); i > newIdx; --i) {
                track.edited[i - 1] ? track.edited[i] = track.edited[i - 1] : 0;
            }
            
            // Reset this key's properties
            track.hovered[newIdx] = undefined;
            track.selected[newIdx] = undefined;
            track.edited[newIdx] = true;
        

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( clipIdx );

            if(this.onSetTime)
                this.onSetTime(this.currentTime);
            this.draw();
            return newIdx;
        }

        /** Delete a keyframe given the track and the its index
         * @track: track that keyframe belongs to
         * @index: index of the keyframe on the track
        */
        #delete( track, index ) {

            // Don't remove by now the first key
            if(index == 0) {
                console.warn("Operation not supported! [remove first keyframe track]");
                return 0;
            }

            // Update clip information
            const clipIdx = track.clipIdx;

            // Don't remove by now the last key
            // if(index == this.animationClip.tracks[clipIdx].times.length - 1) {
            // 	console.warn("Operation not supported! [remove last keyframe track]");
            // 	return;
            // }

            // Reset this key's properties
            track.hovered[index] = undefined;
            track.selected[index] = undefined;
            track.edited[index] = undefined;

            // Delete time key
            this.animationClip.tracks[clipIdx].times = this.animationClip.tracks[clipIdx].times.filter( (v, i) => i != index);

            // Delete values
            const indexDim = track.dim * index;
            const slice1 = this.animationClip.tracks[clipIdx].values.slice(0, indexDim);
            const slice2 = this.animationClip.tracks[clipIdx].values.slice(indexDim + track.dim);

            this.animationClip.tracks[clipIdx].values = LX.UTILS.concatTypedArray([slice1, slice2], Float32Array);

            // Move the other's key properties
            for(let i = index; i < this.animationClip.tracks[clipIdx].times.length; ++i) {
                track.edited[i] = track.edited[i + 1];
            }

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( clipIdx );
            
            return 1;
        }

        /** Delete one or more keyframes given the triggered event
         * @e: event
         * @track:
         * @index: index of the keyframe on the track
        */
        deleteKeyFrame(e, track, index) {
            
            if(e.multipleSelection) {

                // Split in tracks
                const perTrack = [];
                this.lastKeyFramesSelected.forEach( e => perTrack[e[1]] ? perTrack[e[1]].push(e) : perTrack[e[1]] = [e] );
                
                for(let pts of perTrack) {
                    
                    if(!pts) continue;

                    pts = pts.sort( (a,b) => a[2] - b[2] );
                    
                    let deletedIndices = 0;

                    // Delete every selected key
                    for(let [name, idx, keyIndex] of pts) {
                        deletedIndices += this.#delete( this.tracksPerItem[name][idx], keyIndex - deletedIndices );
                    }
                }
            }
            else{

                // Key pressed
                if(!track && this.lastKeyFramesSelected.length > 0) {
                    const [itemName, trackIndex, keyIndex] = this.lastKeyFramesSelected[0];
                    track = this.tracksPerItem[itemName][trackIndex];
                    index = keyIndex;
                }

                if ( track ){
                    this.saveState(track.clipIdx);
                    this.#delete( track, index );
                }
            }

            this.unSelectAllKeyFrames();
        }

        getNumKeyFramesSelected() {
            return this.lastKeyFramesSelected.length;
        }

        unSelect() {

            if(!this.unSelectAllKeyFrames()) {
                this.selectedItems = null;
                if(this.onItemUnselected)
                    this.onItemUnselected();
            }
        }

        setSelectedItems( itemsName ) {

            if(itemsName.constructor !== Array)
            throw("Item name has to be an array!");

            this.selectedItems = itemsName;
            this.unSelectAllKeyFrames();
            this.updateLeftPanel();
        }

        getTrack( trackInfo )  {
            const [name, trackIndex] = trackInfo;
            return this.tracksPerItem[ name ][trackIndex];
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

        getCurrentKeyFrame( track, time, threshold ) {

            if(!track || !track.times.length)
            return;

            // Avoid iterating through all timestamps
            if((time + threshold) < track.times[0])
            return;

            for(let i = 0; i < track.times.length; ++i) {
                let t = track.times[i];
                if(t >= (time - threshold) && 
                    t <= (time + threshold)) {
                    return i;
                }
            }

            return;
        }

        getKeyFramesInRange( track, minTime, maxTime, threshold ) {

            if(!track || !track.times.length)
            return;

            // Manage negative selection
            if(minTime > maxTime) {
                let aux = minTime;
                minTime = maxTime;
                maxTime = aux;
            }

            // Avoid iterating through all timestamps
            if((maxTime + threshold) < track.times[0])
            return;

            let indices = [];

            for(let i = 0; i < track.times.length; ++i) {
                let t = track.times[i];
                if(t >= (minTime - threshold) && 
                    t <= (maxTime + threshold)) {
                    indices.push(i);
                }
            }

            return indices;
        }

        getNearestKeyFrame( track, time ) {

            if(!track || !track.times.length)
            return;

            return track.times.reduce((a, b) => {
                return Math.abs(b - time) < Math.abs(a - time) ? b : a;
            });
        }

        unSelectAllKeyFrames() {

            for(let [name, idx, keyIndex] of this.lastKeyFramesSelected) {
                this.tracksPerItem[name][idx].selected[keyIndex] = false;
            }

            // Something has been unselected
            const unselected = this.lastKeyFramesSelected.length > 0;
            this.lastKeyFramesSelected.length = 0;
            return unselected;
        }

        processCurrentKeyFrame( e, keyFrameIndex, track, localX, multiple ) {

            if(track.locked)
                return;

            e.multipleSelection = multiple;
            keyFrameIndex = keyFrameIndex ?? this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );

            if(!multiple && e.button != 2) {
                this.unSelectAllKeyFrames();
            }
                            
            const name = this.tracksDictionary[track.fullname];
            let t = this.tracksPerItem[ name ][track.idx];
            let currentSelection = [name, track.idx, keyFrameIndex];
            if(!multiple)
                this.selectKeyFrame(t, currentSelection, keyFrameIndex);
            else
                this.lastKeyFramesSelected.push( currentSelection );
            if( this.onSelectKeyFrame && this.onSelectKeyFrame(e, currentSelection, keyFrameIndex)) {
                // Event handled
                return;
            }
            
            if(keyFrameIndex == undefined)
            return;

            // Select if not handled
            
            t.selected[keyFrameIndex] = true;

            if( !multiple && this.onSetTime )
                this.onSetTime( track.times[ keyFrameIndex ] );
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
            this.selectedClip = null;
            this.lastClipsSelected = [];

        }

        onMouseUp( e ) {
            
            let track = e.track;
            let localX = e.localX;

            let discard = e.discard;

            if(e.shiftKey) {

                // Multiple selection
                if(!discard && track) {
                        this.processCurrentClip( e, null, track, localX, true );
                }
                // Box selection
                else{
                    
                    let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                    
                    for(let t of tracks) {
                        let clipsIndices = this.getClipsInRange(t, 
                            this.xToTime( this.boxSelectionStart[0] ), 
                            this.xToTime( this.boxSelectionEnd[0] ),
                            this.pixelsToSeconds * 5);
                            
                        if(clipsIndices) {
                        for(let index of clipsIndices)
                            this.processCurrentClip( e, index, t, null, true );
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
                        this.processCurrentClip( e, null, track, localX );
                    }
                } 
                
            }
            this.movingKeys = false;
            this.boxSelection = false;
            this.boxSelectionStart = null;
            this.boxSelectionEnd = null;

        }

        onMouseDown( e, time ) {

            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;

            if(e.shiftKey) {

                this.boxSelection = true;
                this.boxSelectionStart = [localX,localY - 20];

            }
            else if(e.ctrlKey && track) {
                
                let x = e.offsetX;
                let selectedClips = [];
                if(this.lastClipsSelected.length){
                    selectedClips = this.lastClipsSelected;
                }
                // else{
                // 	clipIndex = this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                // 	if(clipIndex != undefined)
                // 	{
                // 		selectedClips = [[trackIndex, clipIndex]];
                // 	}
                
                // }
                this.canvas.style.cursor = "grab";  
                for(let i = 0; i< selectedClips.length; i++)
                {
                    this.movingKeys = false
                    let [trackIndex, clipIndex] = selectedClips[i];
                    var clip = this.animationClip.tracks[trackIndex].clips[clipIndex];

                    if(!this.timelineClickedClips)
                        this.timelineClickedClips  = [];
                    if(this.timelineClickedClips.indexOf(clip) < 0) {
                        this.timelineClickedClips.push(clip);

                        if(!this.timelineClickedClipsTime)
                            this.timelineClickedClipsTime  = [];
                        this.timelineClickedClipsTime.push(this.xToTime( localX ));
                    }


                    var endingX = this.timeToX( clip.start + clip.duration );
                    var distToStart = Math.abs( this.timeToX( clip.start ) - x );
                    var distToEnd = Math.abs( this.timeToX( clip.start + clip.duration ) - e.offsetX );

                    if(this.duration < clip.start + clip.duration  ){
                        this.setDuration(clip.start + clip.duration);
                    }
                    //this.addUndoStep( "clip_modified", clip );
                    if( (e.ctrlKey && distToStart < 5) || (clip.fadein && Math.abs( this.timeToX( clip.start + clip.fadein ) - e.offsetX ) < 5) )
                        this.dragClipMode = "fadein";
                    else if( (e.ctrlKey && distToEnd < 5) || (clip.fadeout && Math.abs( this.timeToX( clip.start + clip.duration - clip.fadeout ) - e.offsetX ) < 5) )
                        this.dragClipMode = "fadeout";
                    else if( Math.abs( endingX - x ) < 10 )
                        this.dragClipMode = "duration";
                    else
                        this.dragClipMode = "move";
                }
                
            }
            else if(!track) {

                if( this.timelineClickedClips )
                {
                    for(let i = 0; i < this.timelineClickedClips.length; i++){

                        if( this.timelineClickedClips[i].fadein && this.timelineClickedClips[i].fadein < 0 )
                            this.timelineClickedClips[i].fadein = 0;
                        if( this.timelineClickedClips[i].fadeout && this.timelineClickedClips[i].fadeout < 0 )
                            this.timelineClickedClips[i].fadeout = 0;
                    }
                }
                this.timelineClickedClips = null;
                this.selectedClip = null;
                this.unSelectAllClips();
                if(this.onSelectClip)
                    this.onSelectClip(null);
            }
        }

        onMouseMove( e, time ) {

            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }

            if(e.shiftKey) {
                if(this.boxSelection) {
                    this.boxSelectionEnd = [localX,localY - 20];
                    return; // Handled
                }
            }

            if(this.grabbing && e.button != 2) {

                var curr = time - this.currentTime;
                var delta = curr - this.grabTime;
                this.grabTime = curr;
               
                var ct = Math.max(0,this.currentTime - delta);
                if( this.timelineClickedClips != undefined) {
                    this.movingKeys = true;
                    for(let i = 0; i < this.timelineClickedClips.length; i++){
                        
                        var clip = this.timelineClickedClips[i] ;
                        var diff = clip.start + delta < 0 ? - clip.start : delta;//this.currentTime - this.timelineClickedClipsTime[i];//delta;
                        if( this.dragClipMode == "move" ) {
                           
                            clip.start += diff;
                            clip.fadein += diff;
                            clip.fadeout += diff;
                            this.canvas.style.cursor = "grabbing";

                        }
                        else if( this.dragClipMode == "fadein" )
                            clip.fadein = Math.min(Math.max((clip.fadein || 0) + diff, clip.start), clip.start+clip.duration);
                        else if( this.dragClipMode == "fadeout" )
                            clip.fadeout = Math.max(Math.min((clip.fadeout || clip.start+clip.duration) + diff, clip.start+clip.duration), clip.start);
                        else if( this.dragClipMode == "duration" )
                            clip.duration += diff;

                        if(this.duration < clip.start + clip.duration  )
                        {
                            this.setDuration(clip.start + clip.duration);
                        }
                    }
                    return true;
                }
                else{
                    innerSetTime( this.currentTime );	
                }
            }
        }

        onDblClick( e ) {
            
            let track = e.track;
            let localX = e.localX;

            let clipIndex = this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
            if(clipIndex != undefined)  {
                this.lastClipsSelected = [[track.idx, clipIndex]];

                if( this.onSelectClip ) 
                    this.onSelectClip(track.clips[clipIndex]);
            }
        }

        showContextMenu( e ) {

            e.preventDefault();
            e.stopPropagation();

            let actions = [];
            if(this.lastClipsSelected.length) {
                actions.push(
                    {
                        title: "Copy",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {this.clipsToCopy = [...this.lastClipsSelected];}
                    }
                )
                actions.push(
                    {
                        title: "Delete",// + " <i class='bi bi-trash float-right'></i>",
                        callback: () => {
                            let clipstToDelete = this.lastClipsSelected;
                            for(let i = 0; i < clipstToDelete.length; i++){
                                this.deleteClip(e, clipstToDelete[i], null);
                            }
                            // this.optimizeTracks();
                        }
                    }
                )
            }
            else{
                
                if(this.clipsToCopy)
                {
                    actions.push(
                        {
                            title: "Paste",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                            callback: () => {
                                this.clipsToCopy.sort((a,b) => {
                                    if(a[0]<b[0]) 
                                        return -1;
                                    return 1;
                                });

                                for(let i = 0; i < this.clipsToCopy.length; i++){
                                    let [trackIdx, clipIdx] = this.clipsToCopy[i];
                                    let clipToCopy = Object.assign({}, this.animationClip.tracks[trackIdx].clips[clipIdx]);
                                    this.addClip(clipToCopy, this.clipsToCopy.length > 1 ? clipToCopy.start : 0); 
                                }
                                this.clipsToCopy = null;
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

        onDrawContent( ctx, timeStart, timeEnd )  {

            if(!this.animationClip)  
                return;
            let tracks = this.animationClip.tracks|| [{name: "NMF", clips: []}];
            if(!tracks) 
                return;
            
            ctx.save();
            const height = this.trackHeight;
            for(let i = 0; i < tracks.length; i++) {
                let track = tracks[i];
                this.drawTrackWithBoxes(ctx, (i+1) * height, height, track.name || "", track);
            }
            
            ctx.restore();
            // let offset = 25;
            // ctx.fillStyle = 'white';
            // if(this.name)
            //     ctx.fillText(this.name, offset + ctx.measureText(this.name).actualBoundingBoxLeft, -this.topMargin*0.4 );
        }

        // Creates a map for each item -> tracks
        processTracks(animation) {

            this.tracksPerItem = {};
            this.tracksDictionary = {};
            this.animationClip = {
                name: animation.name,
                duration: animation.duration,
                speed: animation.speed ?? 1,
                tracks: []
            };

            for( let i = 0; i < animation.tracks.length; ++i ) {

                let track = animation.tracks[i];

                // const [name, type] = this.getTrackName(track.name);
                const name = track.name;
                const type = track.type;

                let trackInfo = {
                    fullname: track.name,
                    clips: track.clips,
                    name: name, type: type,
                    selected: [], edited: [], hovered: [], active: true,
                    times: track.times,
                    values: track.values
                };
                
                this.tracksDictionary[track.name] = name;
                // const trackIndex = this.tracksPerItem[name].length - 1;
                // this.tracksPerItem[name][trackIndex].idx = trackIndex;
                // this.tracksPerItem[name][trackIndex].clipIdx = i;

                // Save index also in original track
                // track.idx = trackIndex;
                this.animationClip.tracks.push(trackInfo);
            }
        }

        /**
         * @method optimizeTrack
         */

        optimizeTrack(trackIdx) {
            if(this.animationClip.tracks[trackIdx].clips.length) {
                this.animationClip.tracks[trackIdx].idx = tracks.length;
                for(let j = 0; j < this.animationClip.tracks[trackIdx].clips.length; j++)
                {
                    this.animationClip.tracks[trackIdx].clips[j].trackIdx = tracks.length;
                }
                let selectedIdx = 0;
                for(let l = 0; l < this.lastClipsSelected.length; l++)
                {
                    let [t,c] = this.lastClipsSelected[l];
                
                    if(t > trackIdx)
                        this.lastClipsSelected[l][1] = t - 1;
                    if(t == trackIdx)
                        selectedIdx = l;
                }
                this.lastClipsSelected = [...this.lastClipsSelected.slice(0, selectedIdx), ...this.lastClipsSelected.slice(selectedIdx + 1, this.lastClipsSelected.length)];
                tracks.push(this.animationClip.tracks[i]);
            }		
        }

        /**
         * @method optimizeTracks
         */

        optimizeTracks() {
            
            let tracks = [];
            for(let i = 0; i < this.animationClip.tracks.length; i++)
            {
                if(this.animationClip.tracks[i].clips.length) {
                    this.animationClip.tracks[i].idx = tracks.length;
                    for(let j = 0; j < this.animationClip.tracks[i].clips.length; j++)
                    {
                        this.animationClip.tracks[i].clips[j].trackIdx = tracks.length;
                    }
                    let selectedIdx = 0;
                    for(let l = 0; l < this.lastClipsSelected.length; l++)
                    {
                        let [t,c] = this.lastClipsSelected[l];
                    
                        if(t > i)
                            this.lastClipsSelected[l][1] = t - 1;
                        if(t == i)
                            selectedIdx = l;
                    }
                    this.lastClipsSelected = [...this.lastClipsSelected.slice(0, selectedIdx), ...this.lastClipsSelected.slice(selectedIdx + 1, this.lastClipsSelected.length)];
                    tracks.push(this.animationClip.tracks[i]);
                }			
            }
        }
        /** Add a clip to the timeline in a free track slot at the current time
         * @clip: clip to be added
         * @offsetTime: (optional) offset time of current time
         * @callback: (optional) function to call after adding the clip
        */
        addClip( clip, offsetTime = 0, callback = null ) {

            // Update clip information
            let trackIdx = null;
            let newStart = this.currentTime + offsetTime + clip.start;

            clip.fadein += (newStart - clip.start);
            clip.fadeout += (newStart - clip.start);
            clip.start = newStart;

            // Time slot with other clip?
            let clipInCurrentSlot = null;
            if(!this.animationClip) 
                this.addNewTrack();

            for(let i = 0; i < this.animationClip.tracks.length; i++) {
                clipInCurrentSlot = this.animationClip.tracks[i].clips.find( t => { 
                    return LX.UTILS.compareThresholdRange(newStart, clip.start + clip.duration, t.start, t.start+t.duration);
                    
                });
                if(!clipInCurrentSlot)
                {
                    trackIdx = i;
                    break;
                }
                console.warn("There is already a clip stored in time slot ", clipInCurrentSlot)
            }
            if(trackIdx == undefined)
            {
                // clipIdx = this.animationClip.tracks.length;
                // this.animationClip.tracks.push({clipIdx: clipIdx, clips: []} );
                trackIdx = this.addNewTrack();
            }
            //this.saveState(clipIdx);

            // Find new index
            let newIdx = this.animationClip.tracks[trackIdx].clips.findIndex( t => t.start > newStart );

            // Add as last index
            let lastIndex = false;
            if(newIdx < 0) {
                newIdx = this.animationClip.tracks[trackIdx].clips.length;
                lastIndex = true;
            }

            // Add clip
            const clipsArray = [];
            this.animationClip.tracks[trackIdx].clips.forEach( (a, b) => {
                b == newIdx ? clipsArray.push(clip, a) : clipsArray.push(a);
            } );

            if(lastIndex) {
                clipsArray.push(clip);			
            }

            this.animationClip.tracks[trackIdx].clips = clipsArray;	
            // Move the other's clips properties
            let track = this.animationClip.tracks[trackIdx];
            for(let i = (track.clips.length - 1); i > newIdx; --i) {
                track.edited[i - 1] ? track.edited[i] = track.edited[i - 1] : 0;
            }
            
            // Reset this clip's properties
            track.hovered[newIdx] = undefined;
            track.selected[newIdx] = undefined;
            track.edited[newIdx] = undefined;

            // // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( trackIdx );

            if(this.onSetTime)
                this.onSetTime(this.currentTime);
                
            let end = clip.start + clip.duration;
            
            if( end > this.duration || !this.animationClip.duration)
            {
                this.setDuration(end);
            }

            if(callback)
                callback();

            return newIdx;
        }

        /** Delete clip from the timeline
         * @clip: clip to be delete
         * @callback: (optional) function to call after deleting the clip
        */
        deleteClip( e, clip, callback ) {

            let index = -1;
            // Key pressed
            if(!clip && this.selectedClip) {
                clip = this.selectedClip;
            }
            
            if(e.multipleSelection || !clip) {

                // Split in tracks
                const perTrack = [];
                this.lastClipsSelected.forEach( e => perTrack[e[0]] ? perTrack[e[0]].push(e) : perTrack[e[0]] = [e] );
                
                for(let pts of perTrack) {
                    
                    if(!pts) continue;

                    pts = pts.sort( (a,b) => a[2] - b[2] );
                    
                    let deletedIndices = 0;

                    // Delete every selected clip
                    for(let [trackIdx, clipIdx] of pts) {
                        this.#delete(trackIdx, clipIdx );
                        deletedIndices++;
                    }
                }
            } 
            else if ( clip ){
                const [trackIdx, clipIdx]  = clip;

                this.saveState(clip);
                this.#delete( trackIdx, clipIdx );
            }
            

            if(callback)
                callback();
            
            this.timelineClickedClips = [];
            this.selectedClip = null;
            //this.unSelectAllClips();
            // // Update animation action interpolation info

        }

        #delete( trackIdx, clipIdx) {

            let clips = this.animationClip.tracks[trackIdx].clips;
            if(clipIdx >= 0)
            {
                clips = [...clips.slice(0, clipIdx), ...clips.slice(clipIdx + 1, clips.length)];
                this.animationClip.tracks[trackIdx].clips = clips;
                if(clips.length)
                {
                    let selectedIdx = 0;
                    for(let i = 0; i < this.lastClipsSelected.length; i++)
                    {
                        let [t,c] = this.lastClipsSelected[i];
                    
                        if( t == trackIdx  && c > clipIdx)
                            this.lastClipsSelected[i][1] = c - 1;
                        if(t == trackIdx && c == clipIdx)
                            selectedIdx = i;
                    }
                    this.lastClipsSelected = [...this.lastClipsSelected.slice(0, selectedIdx), ...this.lastClipsSelected.slice(selectedIdx + 1, this.lastClipsSelected.length)];
                }
            }

        }

        saveState( clipIdx ) {

            // const localIdx = this.animationClip.tracks[clipIdx].idx;
            // const name = this.getTrackName(this.animationClip.tracks[clipIdx].name)[0];
            // const trackInfo = this.tracksPerItem[name][localIdx];

            // this.trackState.push({
            //     idx: clipIdx,
            //     t: this.animationClip.tracks[clipIdx].times.slice(),
            //     v: this.animationClip.tracks[clipIdx].values.slice(),
            //     editedTracks: [].concat(trackInfo.edited)
            // });
        }

        restoreState() {
            
            // if(!this.trackState.length)
            // return;

            // const state = this.trackState.pop();
            // this.animationClip.tracks[state.idx].times = state.t;
            // this.animationClip.tracks[state.idx].values = state.v;

            // const localIdx = this.animationClip.tracks[state.idx].idx;
            // const name = this.getTrackName(this.animationClip.tracks[state.idx].name)[0];
            // this.tracksPerItem[name][localIdx].edited = state.editedTracks;

            // // Update animation action interpolation info
            // if(this.onUpdateTrack)
            //     this.onUpdateTrack( state.idx );
        }
        
        getCurrentClip( track, time, threshold ) {

            if(!track || !track.clips.length)
            return;

            // Avoid iterating through all timestamps
            if((time + threshold) < track.clips[0])
            return;

            for(let i = 0; i < track.clips.length; ++i) {
                let t = track.clips[i];
                if(t.start + t.duration >= (time - threshold) && 
                    t.start <= (time + threshold)) {
                    return i;
                }
            }

            return;
        };

        unSelectAllClips() {

            for(let [ idx, keyIndex] of this.lastClipsSelected) {
                this.animationClip.tracks[idx].selected[keyIndex]= false;
            }
            // Something has been unselected
            const unselected = this.lastClipsSelected.length > 0;
            this.lastClipsSelected.length = 0;
            this.timelineClickedClips = null;
            this.timelineClickedClipsTime = null;
            this.selectedClip = false;
            return unselected;
        }

        processCurrentClip( e, clipIndex, track, localX, multiple ) {

            e.multipleSelection = multiple;
            clipIndex = clipIndex ?? this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );

            if(!multiple && e.button != 2) {
                this.unSelectAllClips();
            }
                            
            if(clipIndex == undefined)
                return;

            if(track.selected[clipIndex])
                return;

            let currentSelection = [ track.idx, clipIndex];
            // Select if not handled
            this.lastClipsSelected.push( currentSelection );
            track.selected[clipIndex] = true;

            // if( !multiple && this.onSetTime )
            // 	this.onSetTime( track.clips[ clipIndex ] );

            if( this.onSelectClip && this.onSelectClip(track.clips[ clipIndex ])) {
                // Event handled
                return;
            }
        }

        getClipsInRange( track, minTime, maxTime, threshold ) {

            if(!track || !track.clips.length)
            return;

            // Manage negative selection
            if(minTime > maxTime) {
                let aux = minTime;
                minTime = maxTime;
                maxTime = aux;
            }

            // Avoid iterating through all timestamps
            
            if((maxTime + threshold) < track.clips[0].start)
                return;

            let indices = [];

            for(let i = 0; i < track.clips.length; ++i) {
                let t = track.clips[i];
                if((t.start + t.duration <= (maxTime + threshold) || t.start <= (maxTime + threshold)) &&
                    (t.start + t.duration >= (minTime - threshold) || t.start >= (minTime - threshold)) ) 
                {
                    indices.push(i);
                }
            }

            return indices;
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
            
            this.tracksPerItem = {};
            
            // this.selectedItems = selectedItems;
            this.snappedKeyFrameIndex = -1;
            this.autoKeyEnabled = false;
            this.valueBeforeMove = 0;
            this.range = options.range || [0, 1];

            if(this.animationClip)
                this.processTracks(animation);

            // Add button data
            let offset = 25;
            if(this.active)
            {

            }
        }

        onMouseUp( e, time)  {

            let track = e.track;
            let localX = e.localX;
            let discard = e.discard;
            
            if(e.shiftKey) {
                e.multipleSelection = true;
                // Multiple selection
                if(!discard && track) {
                    this.processCurrentKeyFrame( e, null, track, localX, true ); 
                }
                // Box selection
                else{
            
                    this.unSelectAllKeyFrames();
                    
                    let tracks = this.getTracksInRange(this.boxSelectionStart[1], this.boxSelectionEnd[1], this.pixelsToSeconds * 5);
                    
                    for(let t of tracks) {
                        let keyFrameIndices = this.getKeyFramesInRange(t, 
                            this.xToTime( this.boxSelectionStart[0] ), 
                            this.xToTime( this.boxSelectionEnd[0] ),
                            this.pixelsToSeconds * 5);
                            
                        if(keyFrameIndices) {
                            for(let index of keyFrameIndices)
                                this.processCurrentKeyFrame( e, index, t, null, true );
                        }
                    }
                }

            }else {
                
                let boundingBox = this.canvas.getBoundingClientRect()
                if(e.y < boundingBox.top || e.y > boundingBox.bottom)
                    return;
                // Check exact track keyframe
                if(!discard && track) {
                    this.processCurrentKeyFrame( e, null, track, localX );
                    
                } 
                else {
                    let x = e.offsetX;
                    let y = e.offsetY - this.topMargin;
                    for( const b of this.buttonsDrawn ) {
                        b.pressed = false;
                        const bActive = x >= b[2] && x <= (b[2] + b[4]) && y >= b[3] && y <= (b[3] + b[5]);
                        if(bActive) {
                            const callback = b[6]; 
                            if(callback) callback(e);
                            else this[ b[1] ] = !this[ b[1] ];
                            break;
                        }
                    }
                }
                
            }

            this.boxSelection = false;
            this.boxSelectionStart = null;
            this.boxSelectionEnd = null;

        }

        onMouseDown( e, time ) {

            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;

            if(e.shiftKey) {

                this.boxSelection = true;
                this.boxSelectionStart = [localX, localY - 20];
                e.multipleSelection = true;

            }
            else if((e.ctrlKey || e.altKey) && track && !track.locked) {

                    const keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                    if( keyFrameIndex != undefined ) {
                        this.processCurrentKeyFrame( e, keyFrameIndex, track, null, e.multipleSelection ); // Settings this as multiple so time is not being set
                        if(e.ctrlKey || e.altKey) {
                            this.movingKeys = true;
                            this.canvas.style.cursor = "grab";  

                        }
                        // Set pre-move state
                        for(let selectedKey of this.lastKeyFramesSelected) {
                            let [name, idx, keyIndex] = selectedKey;
                            let trackInfo = this.tracksPerItem[name][idx];
                            selectedKey[3] = this.animationClip.tracks[ trackInfo.clipIdx ].times[ keyIndex ];
                        }
                        
                        this.timeBeforeMove = track.times[ keyFrameIndex ];
                        this.valueBeforeMove = localY;
                    }
                

            }else if(!track) {
                this.unSelectAllKeyFrames()
                let x = e.offsetX;
                let y = e.offsetY - this.topMargin;
                for( const b of this.buttonsDrawn ) {
                    const bActive = x >= b[2] && x <= (b[2] + b[4]) && y >= b[3] && y <= (b[3] + b[5]);
                    b.pressed = bActive;
                }
            }
        }

        onMouseMove( e, time ) {
            
            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;
            
            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }
            // Manage keyframe movement
            if(this.movingKeys) {
                this.clearState();
                const newTime = this.xToTime( localX );
                
                for(let [name, idx, keyIndex, keyTime] of this.lastKeyFramesSelected) {
                    track = this.tracksPerItem[name][idx];
                    if(track && track.locked)
                        return;
                    
                    this.canvas.style.cursor = "grabbing";

                    if(e.ctrlKey) {
                        const delta = this.timeBeforeMove - keyTime;
                        this.animationClip.tracks[ track.clipIdx ].times[ keyIndex ] = Math.min( this.animationClip.duration, Math.max(0, newTime - delta) );
                    }

                    if(e.altKey) {
                        let trackRange = [this.tracksDrawn[track.idx][1], this.tracksDrawn[track.idx][1] + this.trackHeight];
                        localY = Math.min( trackRange[1], Math.max(trackRange[0], localY) );
                        
                        //convert to range track values
                        let value = (((localY - trackRange[1]) * (this.range[1] - this.range[0])) / (trackRange[0] - trackRange[1])) + this.range[0];
                        track.edited[keyIndex] = true;
                        this.animationClip.tracks[ track.clipIdx ].values[ keyIndex ] = value;
                        LX.emit( "@on_change_" + this.tracksDrawn[track.idx][0].type, value );
                    }
                }
                return
                
               
            }

            const removeHover = () => {
                if(this.lastHovered)
                    this.tracksPerItem[ this.lastHovered[0] ][ this.lastHovered[1] ].hovered[ this.lastHovered[2] ] = undefined;
            };

            if( this.grabbing && e.button != 2) {

                var curr = time - this.currentTime;
                var delta = curr - this.grabTime;
                this.grabTime = curr;

                // fix this
                if(e.shiftKey && track) {

                    let keyFrameIndex = this.getNearestKeyFrame( track, this.currentTime);
                    
                    if(keyFrameIndex != this.snappedKeyFrameIndex){
                        this.snappedKeyFrameIndex = keyFrameIndex;
                        innerSetTime( this.currentTime );		
                    }
                }
                else{
                    innerSetTime( this.currentTime );	
                }
                    
            }
            else if(track) {

                let keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                if(keyFrameIndex != undefined) {
                    
                    const name = this.tracksDictionary[track.fullname]; 
                    let t = this.tracksPerItem[ name ][track.idx];
                    removeHover();
                    if(t && t.locked)
                        return;
                        
                    this.lastHovered = [name, track.idx, keyFrameIndex];
                    t.hovered[keyFrameIndex] = true;

                }else {
                    removeHover();
                }
            }
            else {
                removeHover();
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
                                    this.pasteKeyFrameValue(e, this.tracksPerItem[id][trackIdx], keyIdx);
                            }
                        }
                    )
                }
                actions.push(
                    {
                        title: "Copy",// + " <i class='bi bi-clipboard-fill float-right'></i>",
                        callback: () => {
                            let toCopy = {};
                            for(let i = 0; i < this.lastKeyFramesSelected.length; i++){
                                let [id, trackIdx, keyIdx] = this.lastKeyFramesSelected[i];
                                if(toCopy[this.tracksPerItem[id][trackIdx].clipIdx]) {
                                    toCopy[this.tracksPerItem[id][trackIdx].clipIdx].idxs.push(keyIdx);
                                } else {
                                    toCopy[this.tracksPerItem[id][trackIdx].clipIdx] = {idxs : [keyIdx]};
                                    toCopy[this.tracksPerItem[id][trackIdx].clipIdx].track = this.tracksPerItem[id][trackIdx]
                                }                
                                if(i == 0) {
                                    this.copyKeyFrameValue(this.tracksPerItem[id][trackIdx], keyIdx)
                                }
                            }
                            for(let clipIdx in toCopy) {
                                
                                this.copyKeyFrames(toCopy[clipIdx].track, toCopy[clipIdx].idxs)
                            }
                           
                        }
                    }
                )
                actions.push(
                    {
                        title: "Delete",// + " <i class='bi bi-trash float-right'></i>",
                        callback: () => {
                            let keyframesToDelete = this.lastKeyFramesSelected;
                            e.multipleSelection = keyframesToDelete.length > 1 ?? false;
                            for(let i = 0; i < keyframesToDelete.length; i++){
                                this.deleteKeyFrame(e, keyframesToDelete[i][1], keyframesToDelete[i][2]);
                            }
                            
                        }
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
                                let currentTime = this.currentTime;
                                for(let clipIdx in this.clipboard.keyframes) {
                                    let indices = Object.keys( this.clipboard.keyframes[clipIdx].values)
                                    this.pasteKeyFrames(e, clipIdx, indices);
                                    this.currentTime = currentTime;
                                }
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

        onDrawContent( ctx, timeStart, timeEnd ) {
        
            if(this.selectedItems == null || !this.tracksPerItem) 
                return;
            ctx.save();
            // this.canvasArea.root.innerHtml = "";
            let offset = this.trackHeight;
             for(let t = 0; t < this.selectedItems.length; t++) {
                let tracks = this.tracksPerItem[this.selectedItems[t]] ? this.tracksPerItem[this.selectedItems[t]] : [{name: this.selectedItems[t]}];
                if(!tracks) continue;
                
                const height = this.trackHeight;
                let offsetI = 0;
                for(let i = 0; i < tracks.length; i++) {
                    let track = tracks[i];
                    if(track.hide) {
                        continue;
                    }
                   
                    this.drawTrackWithCurves(ctx, offsetI * height + offset, height, track.name + " (" + track.type + ")", this.animationClip.tracks[track.clipIdx], track);
                    offsetI++;
                }
                offset += offsetI * height + height;
            }
            ctx.restore();

        };

        drawTrackWithCurves (ctx, y, trackHeight, name, track, trackInfo) {
            let keyframes = track.times;
            let values = track.values;

            if(keyframes) {

                ctx.fillStyle = "#2c303570";
                if(trackInfo.isSelected)
                    ctx.fillRect(0, y - 3, ctx.canvas.width, trackHeight );      
                    
                this.tracksDrawn.push([track,y+this.topMargin,trackHeight]);
                    
                //draw lines
                ctx.strokeStyle = "white";
                ctx.beginPath();
                for(var j = 0; j < keyframes.length; ++j)
                {

                    let time = keyframes[j];
                    let value = values[j];
                    
                    //convert to timeline track range
                    value = (((value - this.range[0]) * ( -this.trackHeight) ) / (this.range[1] - this.range[0])) + this.trackHeight;

                    if( time < this.startTime || time > this.endTime )
                        continue;
                    let keyframePosX = this.timeToX( time );
                    
                    ctx.save();
                    ctx.translate(keyframePosX, y );
                   
                    if( keyframePosX <=  this.sidebarWidth ){
                        ctx.moveTo( 0, value );  
                    }
                    else { 
                        ctx.lineTo( 0, value );  
                    }
                    ctx.restore()
                    
                }
                ctx.stroke();
                ctx.closePath();
                ctx.fillStyle = Timeline.COLOR;
                //draw points
                for(var j = 0; j < keyframes.length; ++j)
                {
                    let time = keyframes[j];
                    let selected = trackInfo.selected[j];
                    let margin = 0;
                    let size = 5;
                    if( time < this.startTime || time > this.endTime )
                        continue;
                    var keyframePosX = this.timeToX( time );
                    if( keyframePosX > this.sidebarWidth ){
                        ctx.save();

                        
                        if(trackInfo.edited[j])
                            ctx.fillStyle = Timeline.COLOR_EDITED;
                        if(selected) {
                            ctx.fillStyle = Timeline.COLOR_SELECTED;
                            //size = 7;
                            margin = -2;
                        }
                        if(trackInfo.hovered[j]) {
                            //size = 7;
                            ctx.fillStyle = Timeline.COLOR_HOVERED;
                            margin = -2;
                        }
                        if(trackInfo.locked)
                            ctx.fillStyle = Timeline.COLOR_LOCK;

                        if(!this.active || trackInfo.active == false)
                            ctx.fillStyle = Timeline.COLOR_UNACTIVE;
                            
                        ctx.translate(keyframePosX, y);
                        
                        let value = values[j];
                        value = (((value - this.range[0]) * ( -this.trackHeight) ) / (this.range[1] - this.range[0])) + this.trackHeight;
    
                        ctx.beginPath();
                        ctx.arc( 0, value, size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.closePath(); 

                        if(trackInfo.selected[j]) {
                            ctx.fillStyle = Timeline.COLOR_SELECTED;
                            ctx.beginPath();
                            ctx.arc( 0, value, size - margin, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.closePath(); 
                        }
                        ctx.restore();
                    }
                }
            }
        }

        onUpdateTracks ( keyType ) {
        
            if(this.selectedItems == null || this.lastKeyFramesSelected.length || !this.autoKeyEnabled)
                return;

            for(let i = 0; i < this.selectedItems.length; i++) {
                let tracks = this.tracksPerItem[this.selectedItems[i]];
                if(!tracks) continue;
    
                // Get current track
                const selectedTrackIdx = tracks.findIndex( t => t.type === keyType );
                if(selectedTrackIdx < 0)
                    return;
                let track = tracks[ selectedTrackIdx ];
                
                // Add new keyframe
                const newIdx = this.addKeyFrame( track );
                if(newIdx === null) 
                    continue;
    
                // Select it
                this.lastKeyFramesSelected.push( [track.name, track.idx, newIdx] );
                track.selected[newIdx] = true;
    
            }
            
            // Update time
            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            return true; // Handled
        }

        // Creates a map for each item -> tracks
        processTracks(animation) {

            this.tracksPerItem = {};
            this.tracksDictionary = {};
            this.animationClip = {
                name: animation.name,
                duration: animation.duration,
                speed: animation.speed ?? 1,
                tracks: []
            };
            for( let i = 0; i < animation.tracks.length; ++i ) {

                let track = animation.tracks[i];

                const [name, type] = this.getTrackName(track.name);

                let trackInfo = {
                    fullname: track.name,
                    name: name, type: type,
                    dim: track.values.length/track.times.length,
                    selected: [], edited: [], hovered: [], active: true,
                    values: track.values,
                    times: track.times
                    
                };
                
                if(!this.tracksPerItem[name]) {
                    this.tracksPerItem[name] = [trackInfo];
                }else {
                    this.tracksPerItem[name].push( trackInfo );
                }
                

                const trackIndex = this.tracksPerItem[name].length - 1;
                this.tracksPerItem[name][trackIndex].idx = trackIndex;
                this.tracksPerItem[name][trackIndex].clipIdx = i;

                // Save index also in original track
                trackInfo.idx = trackIndex;
                this.tracksDictionary[track.name] = name;
                this.animationClip.tracks.push(trackInfo);

            }
        }

        getNumTracks( item ) {
            if(!item || !this.tracksPerItem)
                return;
            const tracks = this.tracksPerItem[item.name];
            return tracks ? tracks.length : null;
        }

    
        onShowOptimizeMenu( e) {
            
            if(this.selectedItems == null)
                return;

            let tracks = [];
            for(let i = 0; i < this.selectedItems.length; i++) {

                tracks = [...tracks, ...this.tracksPerItem[this.selectedItems[i]]];
                if(!tracks) continue;
    
            }
            if(!tracks.length) return;

            const threshold = this.onGetOptimizeThreshold ? this.onGetOptimizeThreshold() : 0.025;
            LX.addContextMenu("Optimize", e, m => {
                for( let t of tracks ) {
                    m.add( t.name + (t.type ? "@" + t.type : ""), () => { 
                        this.animationClip.tracks[t.clipIdx].optimize( threshold );
                        t.edited = [];
                        if(this.onOptimizeTracks)
                            this.onOptimizeTracks(t.clipIdx);
                    })
                }
            });
        }

        onPreProcessTrack( track, idx ) {
            const name = this.tracksDictionary[track.name];
            let trackInfo = this.tracksPerItem[track.name][idx];
            trackInfo.selected = [];
            trackInfo.edited = [];
            trackInfo.hovered = [];
        }

        isKeyFrameSelected( track, index ) {
            return track.selected[ index ];
        }

        saveState( clipIdx ) {

            const localIdx = this.animationClip.tracks[clipIdx].idx;
            const name = this.getTrackName(this.animationClip.tracks[clipIdx].name)[0];
            const trackInfo = this.tracksPerItem[name][localIdx];

            this.trackState.push({
                idx: clipIdx,
                t: this.animationClip.tracks[clipIdx].times.slice(),
                v: this.animationClip.tracks[clipIdx].values.slice(),
                editedTracks: [].concat(trackInfo.edited)
            });
        }

        restoreState() {
            
            if(!this.trackState.length)
            return;

            const state = this.trackState.pop();
            this.animationClip.tracks[state.idx].times = state.t;
            this.animationClip.tracks[state.idx].values = state.v;

            const localIdx = this.animationClip.tracks[state.idx].idx;
            const name = this.getTrackName(this.animationClip.tracks[state.idx].name)[0];
            this.tracksPerItem[name][localIdx].edited = state.editedTracks;

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( state.idx );
        }

        selectKeyFrame( track, selectionInfo, index ) {
            
            if(index == undefined || !track)
            return;

            this.unSelectAllKeyFrames();
                                
            this.lastKeyFramesSelected.push( selectionInfo );
            track.selected[index] = true;
            this.currentTime =  this.animationClip.tracks[track.clipIdx].times[ index ];
            LX.emit( "@on_current_time_" + this.constructor.name, this.currentTime );

            if( this.onSetTime )
                this.onSetTime(  this.animationClip.tracks[track.clipIdx].times[ index ]);
        }

        canPasteKeyFrame () {
            return this.clipboard != null;
        }

        copyKeyFrame( track, index ) {

            // 1 element clipboard by now

            let values = [];
            let start = index * track.dim;
            for(let i = start; i < start + track.dim; ++i)
                values.push( this.animationClip.tracks[ track.clipIdx ].values[i] );

            this.clipboard = {
                type: track.type,
                values: values
            };
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

            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            track.edited[ index ] = true;
        }

        pasteKeyFrame( e, track, index ) {

            this.saveState(track.clipIdx);

            // Copy to current key
            this.#paste( track, index );
            
            if(!e.multipleSelection)
            return;
            
            // Don't want anything after this
            this.clearState();

            // Copy to every selected key
            for(let [name, idx, keyIndex] of this.lastKeyFramesSelected) {
                this.#paste( this.tracksPerItem[name][idx], keyIndex );
            }
        }

        addKeyFrame( track, value ) {

            // Update animationClip information
            const clipIdx = track.clipIdx;

            // Time slot with other key?
            const keyInCurrentSlot = this.animationClip.tracks[clipIdx].times.find( t => { return !LX.UTILS.compareThreshold(this.currentTime, t, t, 0.001 ); });
            if( keyInCurrentSlot ) {
                console.warn("There is already a keyframe stored in time slot ", keyInCurrentSlot)
                return;
            }

            this.saveState(clipIdx);

            // Find new index
            let newIdx = this.animationClip.tracks[clipIdx].times.findIndex( t => t > this.currentTime );

            // Add as last index
            let lastIndex = false;
            if(newIdx < 0) {
                newIdx = this.animationClip.tracks[clipIdx].times.length;
                lastIndex = true;
            }

            // Add time key
            const timesArray = [];
            this.animationClip.tracks[clipIdx].times.forEach( (a, b) => {
                b == newIdx ? timesArray.push(this.currentTime, a) : timesArray.push(a);
            } );

            if(lastIndex) {
                timesArray.push(this.currentTime);			
            }

            this.animationClip.tracks[clipIdx].times = new Float32Array( timesArray );
            
            // Get mid values
            const values = value != undefined ? [value] : this.onGetSelectedItem()

            for(let i = 0; i < values.length; i++) {
                let lerpValue = values[i];
            
                // Add values
                let valuesArray = [];
                this.animationClip.tracks[clipIdx].values.forEach( (a, b) => {
                    if(b == newIdx * track.dim) {
                        for( let i = 0; i < track.dim; ++i )
                            valuesArray.push(lerpValue[i]);
                    }
                    valuesArray.push(a);
                } );
    
                if(lastIndex) {
                    for( let i = 0; i < track.dim; ++i )
                        valuesArray.push(lerpValue[i]);
                }
    
                this.animationClip.tracks[clipIdx].values = new Float32Array( valuesArray );
    
                // Move the other's key properties
                for(let i = (this.animationClip.tracks[clipIdx].times.length - 1); i > newIdx; --i) {
                    track.edited[i - 1] ? track.edited[i] = track.edited[i - 1] : 0;
                }
                
                // Reset this key's properties
                track.hovered[newIdx] = undefined;
                track.selected[newIdx] = undefined;
                track.edited[newIdx] = undefined;
            }
           

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( clipIdx );

            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            return newIdx;
        }

        /** Delete a keyframe given the track and the its index
         * @track: track that keyframe belongs to
         * @index: index of the keyframe on the track
        */
        #delete( track, index ) {

            // Don't remove by now the first key
            if(index == 0) {
                console.warn("Operation not supported! [remove first keyframe track]");
                return;
            }

            // Update clip information
            const clipIdx = track.clipIdx;

            // Don't remove by now the last key
            // if(index == this.animationClip.tracks[clipIdx].times.length - 1) {
            // 	console.warn("Operation not supported! [remove last keyframe track]");
            // 	return;
            // }

            // Reset this key's properties
            track.hovered[index] = undefined;
            track.selected[index] = undefined;
            track.edited[index] = undefined;

            // Delete time key
            this.animationClip.tracks[clipIdx].times = this.animationClip.tracks[clipIdx].times.filter( (v, i) => i != index);

            // Delete values
            const indexDim = track.dim * index;
            const slice1 = this.animationClip.tracks[clipIdx].values.slice(0, indexDim);
            const slice2 = this.animationClip.tracks[clipIdx].values.slice(indexDim + track.dim);

            this.animationClip.tracks[clipIdx].values = LX.UTILS.concatTypedArray([slice1, slice2], Float32Array);

            // Move the other's key properties
            for(let i = index; i < this.animationClip.tracks[clipIdx].times.length; ++i) {
                track.edited[i] = track.edited[i + 1];
            }

            // Update animation action interpolation info
            if(this.onUpdateTrack)
                this.onUpdateTrack( clipIdx );
        }

        /** Delete one or more keyframes given the triggered event
         * @e: event
         * @track:
         * @index: index of the keyframe on the track
        */
        deleteKeyFrame(e, track, index) {
            
            if(e.multipleSelection) {

                // Split in tracks
                const perTrack = [];
                this.lastKeyFramesSelected.forEach( e => perTrack[e[1]] ? perTrack[e[1]].push(e) : perTrack[e[1]] = [e] );
                
                for(let pts of perTrack) {
                    
                    if(!pts) continue;

                    pts = pts.sort( (a,b) => a[2] - b[2] );
                    
                    let deletedIndices = 0;

                    // Delete every selected key
                    for(let [name, idx, keyIndex] of pts) {
                        this.#delete( this.tracksPerItem[name][idx], keyIndex - deletedIndices );
                        deletedIndices++;
                    }
                }
            }
            else{

                // Key pressed
                if(!track && this.lastKeyFramesSelected.length > 0) {
                    const [itemName, trackIndex, keyIndex] = this.lastKeyFramesSelected[0];
                    track = this.tracksPerItem[itemName][trackIndex];
                    index = keyIndex;
                }

                if ( track ){
                    this.saveState(track.clipIdx);
                    this.#delete( track, index );
                }
            }

            this.unSelectAllKeyFrames();
        }

        getNumKeyFramesSelected() {
            return this.lastKeyFramesSelected.length;
        }

        unSelect() {

            if(!this.unSelectAllKeyFrames()) {
                this.selectedItems = null;
                if(this.onItemUnselected)
                    this.onItemUnselected();
            }
        }

        setSelectedItems( itemsName ) {

            if(itemsName.constructor !== Array)
            throw("Item name has to be an array!");

            this.selectedItems = itemsName;
            this.unSelectAllKeyFrames();
            this.updateLeftPanel();
        }

        getTrack( trackInfo )  {
            const [name, trackIndex] = trackInfo;
            return this.tracksPerItem[ name ][trackIndex];
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

        getCurrentKeyFrame( track, time, threshold ) {

            if(!track || !track.times.length)
            return;

            // Avoid iterating through all timestamps
            if((time + threshold) < track.times[0])
            return;

            for(let i = 0; i < track.times.length; ++i) {
                let t = track.times[i];
                if(t >= (time - threshold) && 
                    t <= (time + threshold)) {
                    return i;
                }
            }

            return;
        }

        getKeyFramesInRange( track, minTime, maxTime, threshold ) {

            if(!track || !track.times.length)
            return;

            // Manage negative selection
            if(minTime > maxTime) {
                let aux = minTime;
                minTime = maxTime;
                maxTime = aux;
            }

            // Avoid iterating through all timestamps
            if((maxTime + threshold) < track.times[0])
            return;

            let indices = [];

            for(let i = 0; i < track.times.length; ++i) {
                let t = track.times[i];
                if(t >= (minTime - threshold) && 
                    t <= (maxTime + threshold)) {
                    indices.push(i);
                }
            }

            return indices;
        }

        getNearestKeyFrame( track, time ) {

            if(!track || !track.times.length)
            return;

            return track.times.reduce((a, b) => {
                return Math.abs(b - time) < Math.abs(a - time) ? b : a;
            });
        }

        unSelectAllKeyFrames() {

            for(let [name, idx, keyIndex] of this.lastKeyFramesSelected) {
                this.tracksPerItem[name][idx].selected[keyIndex] = false;
            }

            // Something has been unselected
            const unselected = this.lastKeyFramesSelected.length > 0;
            this.lastKeyFramesSelected.length = 0;
            return unselected;
        }

        processCurrentKeyFrame( e, keyFrameIndex, track, localX, multiple ) {

            e.multipleSelection = multiple;
            keyFrameIndex = keyFrameIndex ?? this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );

            if(!multiple && e.button != 2) {
                this.unSelectAllKeyFrames();
            }
                            
            const name = this.tracksDictionary[track.fullname];
            let t = this.tracksPerItem[ name ][track.idx];
            let currentSelection = [name, track.idx, keyFrameIndex];
            if(!multiple)
                this.selectKeyFrame(t, currentSelection, keyFrameIndex);
            if( this.onSelectKeyFrame && this.onSelectKeyFrame(e, currentSelection, keyFrameIndex)) {
                // Event handled
                return;
            }
            
            if(keyFrameIndex == undefined)
            return;

            // Select if not handled
            this.lastKeyFramesSelected.push( currentSelection );
            t.selected[keyFrameIndex] = true;

            if( !multiple && this.onSetTime )
                this.onSetTime( track.times[ keyFrameIndex ] );
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

    LX.UTILS.concatTypedArray = (Arrays, ArrayType) => {
		return Arrays.reduce((acc, arr) => new ArrayType([...acc, ...arr]), []);
	}

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );