(function(global){

    if(!global.LX) {
        throw("lexgui.js missing!");
    }

    /**
     * @class Timeline
     * @description Agnostic timeline, do not impose any timeline content. Renders to a canvas
     */

    class Timeline {

        /**
         * @param {string} name 
         * @param {object} options = {animationClip, selectedItems, position = [0,0], width, height, canvas, trackHeight}
         */
        constructor( name, options = {} ) {

            this.name = name ?? '';
            this.currentTime = 0;
            this.framerate = 30;
            this.opacity = 0.8;
            this.sidebarWidth = 0// 200;
            this.topMargin = 24;
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

            this.canvas = options.canvas ?? document.createElement('canvas');

            //do not change, it will be updated when called draw
            this.duration = 5;
            this.position = [options.x ?? 0, options.y ?? 0];

            this.size = [ options.width ?? 400, options.height ?? 100];

            if(options.width) 
                this.canvas.width = this.size[0];

            if(options.height)
                this.canvas.height = this.size[1];

            this.currentScroll = 0; //in percentage
            this.currentScrollInPixels = 0; //in pixels
            this.scrollableHeight = this.size[1]; //true height of the timeline content
            this.secondsToPixels = 100;
            this.pixelsToSeconds = 1 / this.secondsToPixels;
          

            this.selectedItems = options.selectedItems ?? null;

            this.animationClip = options.animationClip ?? null;
            
            this.trackHeight = options.trackHeight ?? 25;

            this.active = true;

            let div = document.createElement('div');
            div.className = 'lextimeline';
            this.root = div;

            let area = new LX.Area({height: "100%"});
            area.split({ type: "horizontal", sizes: ["20%", "80%"]});
            let [left, right] = area.sections;
            
            this.updateHeader();
            this.#updateLeftPanel(left);
            right.root.appendChild(this.canvas)
            // div.appendChild(this.canvas);
            div.appendChild(area.root);

            if(!options.canvas && this.name != '') {
                this.root.id = this.name;
                this.canvas.id = this.name + '-canvas';
            }

            this.canvas.addEventListener("mousedown", this.processMouse.bind(this));
            this.canvas.addEventListener("mouseup", this.processMouse.bind(this));
            this.canvas.addEventListener("mousemove", this.processMouse.bind(this));
            this.canvas.addEventListener("wheel", this.processMouse.bind(this));
            this.canvas.addEventListener("dblclick", this.processMouse.bind(this));
            this.canvas.addEventListener("contextmenu", this.processMouse.bind(this));

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
            else
            {
                this.header = new LX.Panel({id:'lextimeline'});
                this.root.appendChild(this.header.root);
            }
            let header = this.header;
            header.addBlank();
            header.sameLine(2 + this.buttonsDrawn.length);
            header.addTitle(this.name);
            header.addNumber("Duration", this.duration, (value, event) => this.setDuration(value), {width: '350px'});        

            for(let i = 0; i < this.buttonsDrawn.length; i++) {
                let button = this.buttonsDrawn[i];
                this.header.addButton( null, "<a class='" + button.icon +"' title='" + button.name + "'></a>", button.callback, {width: "45px"});
            }
        }

        /**
        * @method updateLeftPanel
        * 
        */
        #updateLeftPanel(area) {

            if(this.leftPanel)
                this.leftPanel.clear();
            else {
                this.leftPanel = area.addPanel({className: 'lextimelinepanel'});
                
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
                        t.children.push({'id': track.name + (track.type? ' (' + track.type + ')': ''), 'children':[]})
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
                        }
                    }});
                }
            }
            

            // for(let i = 0; i < this.animationClip.tracks.length; i++) {
            //     let track = this.animationClip.tracks[i];
            //     panel.addTitle(track.name + (track.type? '(' + track.type + ')' : ''));
            // }
            this.#resizecanvas([ this.root.clientWidth - this.leftPanel.root.clientWidth, this.size[1]]);

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

            if(this.processTracks)
                this.processTracks();
            
            this.updateHeader();
            this.#updateLeftPanel();
        }

        /**
         * @method draw
         * @param {*} currentTime 
         * @param {*} rect 
         * TODO
         */

        draw( currentTime = this.currentTime, rect ) {
            let ctx = this.canvas.getContext("2d");
            ctx.globalAlpha = 1.0;
            if(!rect)
                rect = [0, ctx.canvas.height - ctx.canvas.height , ctx.canvas.width, ctx.canvas.height ];

            this.canvas = ctx.canvas;
            this.position[0] = rect[0];
            this.position[1] = rect[1];
            var w = this.size[0] = rect[2];
            var h = this.size[1] = rect[3];
            var P2S = this.pixelsToSeconds;
            var S2P = this.secondsToPixels;
            var timelineHeight = this.size[1];
            ctx.fillStyle = "black";
            ctx.clearRect(0,0, w , h);
            this.currentTime = currentTime;
            if(this.animationClip)
                this.duration = this.animationClip.duration;
            var duration = this.duration;
            this.currentScrollInPixels = this.scrollableHeight <= h ? 0 : (this.currentScroll * (this.scrollableHeight - timelineHeight));
            ctx.save();
            ctx.translate( this.position[0], this.position[1] + this.topMargin ); //20 is the top margin area
            
            //background
            ctx.clearRect(0, -this.topMargin, w, h+this.topMargin);
            ctx.fillStyle = "#161c21";// "#000";
            //ctx.globalAlpha = 0.65;
            ctx.fillRect(0, -this.topMargin, w, this.topMargin);
            ctx.fillStyle = "#1a2025";// "#000";
            ctx.globalAlpha = 0.75;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;

            //buttons
            // for( const b of this.buttonsDrawn ) {
            //     const boundProperty = b[1];
            //     ctx.fillStyle = this[ boundProperty ] ? "#b66" : "#454545";	
            //     if(b.pressed) ctx.fillStyle = "#eee";
            //     ctx.roundRect(b[2], b[3], b[4], b[5], 5, true, false);
            //     ctx.drawImage(b[0], b[2] + 2, b[3] + 2, b[4] - 4, b[5] - 4);
            // }

            //seconds markers
            var secondsFullWindow = (w * P2S); //how many seconds fit in the current window
            var secondsHalfWindow = secondsFullWindow * 0.5;

            //time in the left side (current time is always in the middle)
            var timeStart = currentTime - secondsHalfWindow;
            //time in the right side
            var timeEnd = currentTime + secondsHalfWindow;

            this.startTime = timeStart;
            this.endTime = timeEnd;

            var sidebar = this.sidebarWidth;

            //this ones are limited to the true timeline (not the visible area)
            var start = Math.ceil( Math.max(0,timeStart) );
            var end = Math.floor( Math.min(duration,timeEnd) + 0.01 );
            
            // Calls using as 0,0 the top-left of the tracks area (not the top-left of the timeline but 20 pixels below)
            this.tracksDrawn.length = 0;

            // Frame lines
            if(S2P > 200)
            {
                ctx.strokeStyle = "#444";
                ctx.globalAlpha = 0.4;
                ctx.beginPath();

                let start = timeStart;
                let end = timeEnd;
                
                if(!this.renderOutFrames) {
                    start = 0;
                    end = duration;
                }
                
                var pixelsPerFrame = S2P / this.framerate;
                var x = pixelsPerFrame + Math.round( this.timeToX( Math.floor(start * this.framerate) / this.framerate));
                var numFrames = (end - start ) * this.framerate - 1;
                for(var i = 0; i < numFrames; ++i)
                {
                    ctx.moveTo( Math.round(x) + 0.5, 0);
                    ctx.lineTo( Math.round(x) + 0.5, 10);
                    x += pixelsPerFrame;
                }
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            // Vertical lines
            ctx.strokeStyle = "#444";
            ctx.beginPath();
            var linex = this.timeToX( 0 );
            if( linex > sidebar )
            {
                ctx.moveTo( linex, 0.5);
                ctx.lineTo( linex, h );
            }
            var linex = this.timeToX( duration );
            if( linex > sidebar && linex < w )
            {
                ctx.moveTo( linex, 0.5);
                ctx.lineTo( linex, h );
            }
            ctx.stroke();

            // Horizontal line
            ctx.strokeStyle = "#AAA";
            ctx.beginPath();
            ctx.moveTo( Math.max(sidebar, this.timeToX( Math.max(0,timeStart) ) ), 0.5);
            ctx.lineTo( Math.min(w, this.timeToX( Math.min(duration,timeEnd) ) ), 0.5);
            ctx.moveTo( Math.max(sidebar, this.timeToX( Math.max(0,timeStart) ) ), 1.5);
            ctx.lineTo( Math.min(w, this.timeToX( Math.min(duration,timeEnd) ) ), 1.5);
            var deltaSeconds = 1;
            if( this.secondsToPixels < 50)
                deltaSeconds = 10;
            ctx.stroke();
            
            // Numbers
            ctx.fillStyle = "#FFF";
            ctx.font = "12px Tahoma";
            ctx.textAlign = "center";
            for(var t = start; t <= end-0.01; t += 1 )
            {
                if( t % deltaSeconds != 0 )
                    continue;
                ctx.globalAlpha = t % 10 == 0 ? 0.5 : clamp( (this.secondsToPixels - 50) * 0.01,0,0.7);
                // if(Math.abs(t - currentTime) < 0.05)
                // 	ctx.globalAlpha = 0.25;
                var x = ((this.timeToX(t))|0) + 0.5;
                if( x > sidebar-10 && x < (w + 10))
                    ctx.fillText(String(t),x,-5);
            }
            ctx.fillText(String(duration.toFixed(3)), this.timeToX(duration),-5);
            ctx.globalAlpha = 1;

            // Current time marker
            ctx.strokeStyle = "#5f88c9"//#AFD";
            var x = ((w*0.5)|0) + 0.5;
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#AAA";
            ctx.fillRect( x-2,1,4,h);
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo( x,1);
            ctx.lineTo( x,h);
            ctx.stroke();

            ctx.fillStyle = "#5f88c9"//"#AFD";
            ctx.beginPath();
            ctx.moveTo( x - 4,1);
            ctx.lineTo( x + 4,1);
            ctx.lineTo( x,6);
            ctx.fill();

            // Current time text
            ctx.fillText(String(currentTime.toFixed(3)), x, -5);

            // Selections
            if(this.boxSelection && this.boxSelectionStart && this.boxSelectionEnd) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = "#AAA";
                ctx.strokeRect( this.boxSelectionStart[0], this.boxSelectionStart[1], this.boxSelectionEnd[0] - this.boxSelectionStart[0], this.boxSelectionEnd[1] - this.boxSelectionStart[1]);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            
            if(this.onDrawContent)
                this.onDrawContent( ctx, timeStart, timeEnd, this );
            ctx.restore();
            
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
            var markersPos = [];
            for (var i = 0; i < markers.length; ++i) {
                var marker = markers[i];
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
            if( this.onSetDuration ) 
                this.onSetDuration( t );	 
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

        // Converts distance in pixels to time
        xToTime( x, global ) {
            if (global)
                x -= this.position[0];
            var v = (x - this.size[0] * 0.5) * this.pixelsToSeconds + this.currentTime;
            return v;
        }

        // Converts time to disance in pixels
        timeToX( t, framerate, global ) {
            if (framerate)
                t = Math.round(t * framerate) / framerate;
            var x = (t - this.currentTime) * this.secondsToPixels + this.size[0] * 0.5;
            if (global)
                x += this.position[0];
            return x;
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

            this.secondsToPixels = v;
            if (this.secondsToPixels > 3000)
                this.secondsToPixels = 3000;
            this.pixelsToSeconds = 1 / this.secondsToPixels;
        }
        
        /**
         * @method setFramerate
         * @param {*} v
         * TODO
         */

        setFramerate( v ) {
            this.framerate = v;
        }

        /**
         * @method processMouse
         * @param {*} e
         * TODO
         */

        processMouse( e ) {

            if(!this.canvas)
                return;

            var w = this.size[0];

            // Process mouse
            var x = e.offsetX;
            var y = e.offsetY;
            e.deltax = x - this.lastMouse[0];
            e.deltay = y - this.lastMouse[1];
            var localX = e.offsetX - this.position[0];
            var localY = e.offsetY - this.position[1];
            this.lastMouse[0] = x;
            this.lastMouse[1] = y;
            var timelineHeight = this.size[1];

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
                const discard = this.movingKeys || (UTILS.getTime() - this.clickTime) > 420; // ms
                this.movingKeys ? innerSetTime( this.currentTime ) : 0;

                if(this.grabbing && this.onClipMoved){
                    this.onClipMoved();
                }

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
                this.clickTime = UTILS.getTime();

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

                    if(this.onMouseDown)
                        this.onMouseDown(e);
                }
            }
            else if( e.type == "mousemove" ) {

                if(e.shiftKey) {
                    if(this.boxSelection) {
                        this.boxSelectionEnd = [localX, localY - 20];
                        return; // Handled
                    }
                }

                if(this.onMouseMove)
                    this.onMouseMove(e, time);
            }

            else if( e.type == "wheel" ) {
                if( timelineHeight < this.scrollableHeight && x > w - 10)
                {
                    this.currentScroll = clamp( this.currentScroll + (e.wheelDelta < 0 ? 0.1 : -0.1), 0, 1);
                }
                else
                {
                    this.setScale( this.secondsToPixels * (e.wheelDelta < 0 ? 0.9 : (1/0.9)) );
                }
            }
            else if (e.type == "dblclick" && this.onDblClick) {
                this.onDblClick(e);	
            }
            else if (e.type == "contextmenu" && this.showContextMenu)
                this.showContextMenu(e);
            this.canvas.style.cursor = this.grabbing && (UTILS.getTime() - this.clickTime > 320) ? "grabbing" : "pointer" ;


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
                ctx.fillRect(0, y, ctx.canvas.width, trackHeight -1 );
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

                        let margin = 0;
                        let size = trackHeight * 0.3;
                        if(trackInfo.edited[j])
                            ctx.fillStyle = "rgba(255,0,255,1)";
                        if(selected) {
                            ctx.fillStyle = "rgba(250,250,20,1)";
                            size = trackHeight * 0.4;
                            margin = -2;
                        }
                        if(trackInfo.hovered[j]) {
                            size = trackHeight * 0.4;
                            ctx.fillStyle = "rgba(250,250,250,0.7)";
                            margin = -2;
                        }
                        if(!this.active || trackInfo.active == false)
                            ctx.fillStyle = "rgba(250,250,250,0.7)";
                            
                        ctx.translate(keyframePosX, y + size * 2 + margin);
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

            ctx.globalAlpha = 1;
        }

        /**
         * @method drawTrackWithBoxes
         * @param {*} ctx
         * ...
         * TODO
         */

        drawTrackWithBoxes( ctx, y, trackHeight, title, track ) {

            trackHeight *= 0.8;
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
                // A utility function to draw a rectangle with rounded corners.
                function roundedRect(ctx, x, y, width, height, radius, fill = true) {
                    ctx.beginPath();
                    ctx.moveTo(x, y + radius);
                    ctx.arcTo(x, y + height, x + radius, y + height, radius);
                    ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
                    ctx.arcTo(x + width, y, x + width - radius, y, radius);
                    ctx.arcTo(x, y, x, y + radius, radius);
                    if(fill)
                        ctx.fill();
                    else
                        ctx.stroke();
                }
                for(var j = 0; j < clips.length; ++j)
                {
                    let clip = clips[j];
                    let framerate = this.framerate;
                    //let selected = track.selected[j];
                    var frameNum = Math.floor( clip.start * framerate );
                    var x = Math.floor( this.timeToX( frameNum / framerate) ) + 0.5;
                    frameNum = Math.floor( (clip.start + clip.duration) * framerate );
                    var x2 = Math.floor( this.timeToX( frameNum / framerate) ) + 0.5;
                    var w = x2-x;

                    if( x2 < 0 || x > this.canvas.width )
                        continue;

                    //background rect
                    ctx.globalAlpha = trackAlpha;
                    ctx.fillStyle = clip.clipColor || "#5e9fdd"//#333";
                    //ctx.fillRect(x,y,w,trackHeight);
                    roundedRect(ctx, x, y, w, trackHeight, 5, true);

                    //draw clip content
                    if( clip.drawClip )
                    {
                        ctx.save();
                        ctx.translate(x,y);
                        ctx.strokeStyle = "#AAA";
                        ctx.fillStyle = "#AAA";
                        clip.drawClip( ctx, x2-x,trackHeight, this.selectedClip == clip || track.selected[j], this );
                        ctx.restore();
                    }
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
                        selectedClipArea = [x,y,x2-x,trackHeight ]
                    //render clip selection area
                    if(selectedClipArea)
                    {
                        ctx.strokeStyle = track.clips[j].clipColor;
                        ctx.globalAlpha = 0.8;
                        ctx.lineWidth = 1;
                        roundedRect(ctx, selectedClipArea[0]-1,selectedClipArea[1]-1,selectedClipArea[2]+2,selectedClipArea[3]+2, 5, false);
                        ctx.strokeStyle = "#888";
                        ctx.lineWidth = 0.5;
                        ctx.globalAlpha = 1;
                }
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
                this.onChangeTrackVisibility(trackInfo, visible)
        }

        /**
         * @method resize
         * @param {*} size
         * ...
         * TODO
         */

        resize( size = [this.parent.root.clientWidth, this.parent.root.clientHeight]) {
            // this.root.style.width = size[0] + 'px';
            // this.root.style.height = size[1] + 'px';
            let w = size[0] - this.leftPanel.root.clientWidth - 10;
            this.size = [w , size [1]];
            this.#resizecanvas(this.size)
            // this.canvas.style.width = size[0] + 'px';
            // this.canvas.style.height = size[1] + 'px';
            
        }

        #resizecanvas( size ) {
            this.canvas.width = size[0];
            this.canvas.height = size[1];
            this.draw(this.currentTime);
        }
    };

    LX.Timeline = Timeline;

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

    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius, fill, stroke) {
        if (typeof stroke === 'undefined') {
            stroke = true;
        }
        if (typeof radius === 'undefined') {
            radius = 5;
        }
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
                this.processTracks();

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

        onMouseDown( e ) {

            let localX = e.localX;
            let localY = e.localY;
            let track = e.track;

            if(e.shiftKey) {

                this.boxSelection = true;
                this.boxSelectionStart = [localX, localY - 20];

            }
            else if(e.ctrlKey && track) {

                    const keyFrameIndex = this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
                    if( keyFrameIndex != undefined ) {
                        this.processCurrentKeyFrame( e, keyFrameIndex, track, null, true ); // Settings this as multiple so time is not being set
                        this.movingKeys = true;
                        
                        // Set pre-move state
                        for(let selectedKey of this.lastKeyFramesSelected) {
                            let [name, idx, keyIndex] = selectedKey;
                            let trackInfo = this.tracksPerItem[name][idx];
                            selectedKey[3] = this.animationClip.tracks[ trackInfo.clipIdx ].times[ keyIndex ];
                        }
                        
                        this.timeBeforeMove = track.times[ keyFrameIndex ];
                    }
                

            }else if(!track) {
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
            let track = e.track;
            
            const innerSetTime = (t) => { if( this.onSetTime ) this.onSetTime( t );	 }
            // Manage keyframe movement
            if(this.movingKeys) {

                this.clearState();
                const newTime = this.xToTime( localX );
                
                for(let [name, idx, keyIndex, keyTime] of this.lastKeyFramesSelected) {
                    track = this.tracksPerItem[name][idx];
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

                var curr = time - this.currentTime;
                var delta = curr - this.grabTime;
                this.grabTime = curr;
                this.currentTime = Math.max(0,this.currentTime - delta);

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
                    
                    const name = this.tracksDictionary[track.name]; 
                    let t = this.tracksPerItem[ name ][track.idx];

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

        onDrawContent( ctx, timeStart, timeEnd ) {
        
            
            if(this.selectedItems == null || !this.tracksPerItem) 
                return;
            
            ctx.save();

            let offset = 16 + this.trackHeight;
            for(let t = 0; t < this.selectedItems.length; t++) {
                let tracks = this.tracksPerItem[this.selectedItems[t]] ? this.tracksPerItem[this.selectedItems[t]] : [{name: this.selectedItems[t]}];
                if(!tracks) continue;
                
                const height = this.trackHeight;
                for(let i = 0; i < tracks.length; i++) {
                    let track = tracks[i];
                    this.drawTrackWithKeyframes(ctx, (i) * height + (t+1)*(offset) , height, track.name + " (" + track.type + ")", this.animationClip.tracks[track.clipIdx], track);
                }
                offset+= (tracks.length - 1)*height;
            }
             
            
            
            ctx.restore();
            // let offset = 25;
            // ctx.fillStyle = 'white';
            // ctx.fillText("Tracks",  offset + ctx.measureText("Tracks").actualBoundingBoxLeft , -this.topMargin*0.4 );
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
            
            // Update time
            if(this.onSetTime)
                this.onSetTime(this.currentTime);

            return true; // Handled
        }

        // Creates a map for each item -> tracks
        processTracks() {

            this.tracksPerItem = {};
            this.tracksDictionary = {};

            for( let i = 0; i < this.animationClip.tracks.length; ++i ) {

                let track = this.animationClip.tracks[i];

                const [name, type] = this.getTrackName(track.name);

                let trackInfo = {
                    name: name, type: type,
                    dim: track.values.length/track.times.length,
                    selected: [], edited: [], hovered: []
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
            addContextMenu("Optimize", e, m => {
                for( let t of tracks ) {
                    m.add( t.name + (t.type ? "@" + t.type : ""), () => { 
                        this.animationClip.tracks[t.clipIdx].optimize( threshold );
                        t.edited = [];
                    })
                }
            });
        }

        onPreProcessTrack( track ) {
            const name = this.tracksDictionary[track.name];
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
            track.selected[index] = true;
            
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

            let clipboardInfo = this.clipboard;

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

        addKeyFrame( track ) {

            // Update animationClip information
            const clipIdx = track.clipIdx;

            // Time slot with other key?
            const keyInCurrentSlot = this.animationClip.tracks[clipIdx].times.find( t => { return !UTILS.compareThreshold(this.currentTime, t, t, 0.001 ); });
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
            const items = this.onGetSelectedItems();

            for(let i = 0; i < items.length; i++) {
                let item = items[i];
                let lerpValue = item[ track.type ].toArray();
            
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

            this.animationClip.tracks[clipIdx].values = UTILS.concatTypedArray([slice1, slice2], Float32Array);

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

            e.multipleSelection = multiple;
            keyFrameIndex = keyFrameIndex ?? this.getCurrentKeyFrame( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );

            if(!multiple && e.button != 2) {
                this.unSelectAllKeyFrames();
            }
                            
            const name = this.tracksDictionary[track.name];
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

            this.boxSelection = false;
            this.boxSelectionStart = null;
            this.boxSelectionEnd = null;

        }

        onMouseDown( e ) {

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
                
                for(let i = 0; i< selectedClips.length; i++)
                {
                    this.movingKeys = false
                    let [trackIndex, clipIndex] = selectedClips[i];
                    var clip = this.animationClip.tracks[trackIndex].clips[clipIndex];

                    if(!this.timelineClickedClips)
                        this.timelineClickedClips  = [];
                    this.timelineClickedClips.push(clip);

                    if(!this.timelineClickedClipsTime)
                        this.timelineClickedClipsTime  = [];
                    this.timelineClickedClipsTime.push(this.xToTime( localX ));

                    var endingX = this.timeToX( clip.start + clip.duration );
                    var distToStart = Math.abs( this.timeToX( clip.start ) - x );
                    var distToEnd = Math.abs( this.timeToX( clip.start + clip.duration ) - e.offsetX );

                    if(this.duration < clip.start + clip.duration  ){
                        this.setDuration(clip.start + clip.duration);
                        this.updateHeader();
                    }
                    //this.addUndoStep( "clip_modified", clip );
                    if( (e.shiftKey && distToStart < 5) || (clip.fadein && Math.abs( this.timeToX( clip.start + clip.fadein ) - e.offsetX ) < 5) )
                        this.dragClipMode = "fadein";
                    else if( (e.shiftKey && distToEnd < 5) || (clip.fadeout && Math.abs( this.timeToX( clip.start + clip.duration - clip.fadeout ) - e.offsetX ) < 5) )
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
                    for(let i = 0; i < this.timelineClickedClips.length; i++){
                        
                        var clip = this.timelineClickedClips[i] ;
                        var diff = delta;//this.currentTime - this.timelineClickedClipsTime[i];//delta;
                        if( this.dragClipMode == "move" ) {
                            clip.start += diff;
                            clip.attackPeak += diff;
                            clip.relax += diff;
                        }
                        else if( this.dragClipMode == "fadein" )
                            clip.fadein = (clip.fadein || 0) + diff;
                        else if( this.dragClipMode == "fadeout" )
                            clip.fadeout = (clip.fadeout || 0) - diff;
                        else if( this.dragClipMode == "duration" )
                            clip.duration += diff;
                        this.clipTime = this.currentTime;
                        if(this.duration < clip.start + clip.duration  )
                        {
                            this.setDuration(clip.start + clip.duration);
                            this.updateHeader();
                        }
                    }
                    return true;
                }
                else{
                    this.currentTime = Math.max(0,this.currentTime - delta);
                    innerSetTime( this.currentTime );	
                }
            }
        }

        onDblClick( e ) {
            
            let track = e.track;
            let localX = e.localX;

            let clipIndex = this.getCurrentClip( track, this.xToTime( localX ), this.pixelsToSeconds * 5 );
            if(clipIndex != undefined)  {
                this.lastClipsSelected = [track.idx, clipIndex];

                if( this.onSelectClip ) 
                    this.onSelectClip(track.clips[clipIndex]);
            }
        }

        showContextMenu( e ) {

            e.preventDefault();
            e.stopPropagation();

            let actions = [];
            //let track = this.NMFtimeline.clip.tracks[0];
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
                                this.deleteClip(clipstToDelete[i], null);
                            }
                            this.optimizeTracks();
                        }
                    }
                )
                // actions.push(
                //     {
                //         title: "Create preset" + " <i class='bi bi-file-earmark-plus-fill float-right'></i>",
                //         callback: () => {
                //             this.NMFtimeline.lastClipsSelected.sort((a,b) => {
                //                 if(a[0]<b[0]) 
                //                     return -1;
                //                 return 1;
                //             });
                //             this.createNewPresetDialog(this.NMFtimeline.lastClipsSelected);
                //         }
                //     }
                // )
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
                                    // let clip = new ANIM.FaceLexemeClip(clipToCopy);
                                    this.addClip(clipToCopy, this.clipsToCopy.length > 1 ? clipToCopy.start : 0); 
                                }
                                this.clipsToCopy = null;
                            }
                        }
                    )
                }
            }
            
            addContextMenu("Options", e, (m) => {
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
            const height = this.trackHeight*1.2;
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
        processTracks() {

            this.tracksPerItem = {};
            this.tracksDictionary = {};

            for( let i = 0; i < this.animationClip.tracks.length; ++i ) {

                let track = this.animationClip.tracks[i];

                // const [name, type] = this.getTrackName(track.name);
                const name = track.name;
                const type = track.type;

                let trackInfo = {
                    clips: track.clips,
                    name: name, type: type,
                    selected: [], edited: [], hovered: []
                };
                
                this.tracksDictionary[track.name] = name;
                // const trackIndex = this.tracksPerItem[name].length - 1;
                // this.tracksPerItem[name][trackIndex].idx = trackIndex;
                // this.tracksPerItem[name][trackIndex].clipIdx = i;

                // Save index also in original track
                // track.idx = trackIndex;
                this.animationClip.tracks[i] = trackInfo;
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
            let newStart = this.currentTime + offsetTime;

            clip.attackPeak += (newStart - clip.start);
            clip.relax += (newStart - clip.start);
            clip.start = newStart;

            // Time slot with other clip?
            let clipInCurrentSlot = null;
            if(!this.animationClip) 
                this.addNewTrack();

            for(let i = 0; i < this.animationClip.tracks.length; i++) {
                clipInCurrentSlot = this.animationClip.tracks[i].clips.find( t => { 
                    return UTILS.compareThresholdRange(this.currentTime, clip.start + clip.duration, t.start, t.start+t.duration);
                    
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
            let newIdx = this.animationClip.tracks[trackIdx].clips.findIndex( t => t.start > this.currentTime );

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
                this.updateHeader();
            }

            if(callback)
                callback();

            return newIdx;
        }

        /** Delete clip from the timeline
         * @clip: clip to be delete
         * @callback: (optional) function to call after deleting the clip
        */
        deleteClip( clip, callback ) {

            let index = -1;
            // Key pressed
            if(!clip && this.selectedClip) {
                clip = this.selectedClip;
            }
            

            let [trackIdx, clipIdx] = clip;
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
                if(callback)
                    callback();
            }
            this.selectedClip = null;
            //this.unSelectAllClips();
            // // Update animation action interpolation info

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

})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );