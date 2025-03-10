import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.components.push( 'VideoEditor' );

/**
 * @class TimeBar
 */

class TimeBar {

    static TIMEBAR_PLAY       = 1;
    static TIMEBAR_TRIM       = 2;

    static BACKGROUND_COLOR = LX.getThemeColor("global-branch-darker");
    static COLOR = LX.getThemeColor("global-button-color");
    static ACTIVE_COLOR = LX.getThemeColor("global-selected-light");

    constructor( area, type, options = {} ) {

        this.type = type;

        // Create canvas
        this.canvas = document.createElement( 'canvas' );
        this.canvas.width = area.size[0];
        this.canvas.height = area.size[1];
        area.attach( this.canvas );

        this.ctx = this.canvas.getContext("2d");

        const barHeight = options.barHeight ?? 5;
        this.markerWidth = options.markerWidth ?? 8;
        this.offset = options.offset || 4;

        this.width = this.canvas.width - this.offset * 2;
        this.height = barHeight;

        this.position = new LX.vec2( this.offset, this.canvas.height * 0.5 - this.height * 0.5);
        this.startX = this.position.x;
        this.endX = this.width;
        this.currentX = this.startX;

        const y = this.offset * 2;
        const w = this.markerWidth;
        const h = this.canvas.height - y * 2;
        this.trimRec = [this.startX, y, w, h];

        this.lastPosition = new LX.vec2( 0, 0 );

        this._draw();
    }

    _draw() {
        const ctx = this.ctx;

        ctx.save();
        ctx.fillStyle = TimeBar.BACKGROUND_COLOR;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // // Draw background timeline
        ctx.fillStyle = TimeBar.COLOR;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Draw background trimed timeline
        ctx.fillStyle = TimeBar.ACTIVE_COLOR;
        ctx.fillRect(this.startX, this.position.y, this.endX - this.offset - this.startX, this.height);

        ctx.restore();

        // Min-Max time markers
        this._addTrim('start', this.startX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9'});
        this._addTrim('end', this.endX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9'});
        this._addMarker('current', this.currentX, { color: '#e5e5e5', fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9', width: this.markerWidth });
    }

    _addTrim(name, x, options) {

        options = options || {};

        const y = this.trimRec[1];
        const w = this.trimRec[2];
        const h = this.trimRec[3];

        const ctx = this.ctx;
        if(this.hovering == name) {
            // Shadow
            ctx.shadowColor = "white";
            ctx.shadowBlur = 2;
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111' // "#FFF";

        ctx.beginPath();
        ctx.roundRect(x - w * 0.5, y, w, h, 2);
        ctx.fill();
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111' // "#FFF";

        ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.lineWitdh = 2;
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x, y + h - 4);
        ctx.stroke();
        ctx.shadowBlur = 0;

    }

    _addMarker(name, x, options) {

        options = options || {};

        let y = this.offset;
        const w = options.width ? options.width : (this.dragging == name ? 6 : 4);
        const h = this.canvas.height - this.offset * 2;

        let ctx = this.ctx;

        ctx.globalAlpha = 1;

        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111' // "#FFF";


        if(this.hovering == name) {
           // Shadow
            ctx.shadowColor = "white";
            ctx.shadowBlur = 2;
        }

        // Current time line
        ctx.fillStyle = ctx.strokeStyle = "white";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h * 0.5);
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111' // "#FFF";


        y -= this.offset + 4;
        // Current time ball grab
        ctx.fillStyle = options.fillColor || '#e5e5e5';
        ctx.beginPath();
        ctx.roundRect(x - w * 0.5, y + this.offset, w, w, 5);

        ctx.fill();
        ctx.shadowBlur = 0;
    }

    onMouseDown (e) {

        e.preventDefault();

        if(!this.canvas || e.target != this.canvas) {
            return;
        }
        const canvas = this.canvas;

        // Process mouse
        const x = e.offsetX;
        const y = e.offsetY;

        // Check if some marker is clicked
        const threshold = this.markerWidth;

        if(Math.abs(this.startX - x) < threshold && this.trimRec[1] < y &&  y < this.trimRec[3] + this.trimRec[1] ) {
            this.dragging = 'start';
            canvas.style.cursor = "grabbing";
        }
        else if(Math.abs(this.endX - x) < threshold && this.trimRec[1] < y &&  y < this.trimRec[3] + this.trimRec[1] ) {
            this.dragging = 'end';
            canvas.style.cursor = "grabbing";
        }
        else if(Math.abs(this.currentX - x) < threshold) {
            this.dragging = 'current';
            canvas.style.cursor = "grabbing";
        }
        else {
            if(x < this.startX) {
                this.currentX = this.startX;
            }
            else if(x > this.endX) {
                this.currentX = this.endX;
            }
            else {
                this.currentX = x;
            }
        }

        this._draw();
    }

    update (x) {
        this.currentX = Math.min(Math.max(this.startX, x), this.endX);
        this._draw();

        if(this.onDraw) {
            this.onDraw();
        }
    }

    onMouseUp (e) {
        e.preventDefault();

        this.dragging = false;
        this.hovering = false;

        if(!this.canvas) {
            return;
        }

        const canvas = this.canvas;
        canvas.style.cursor = "default";

         // Process mouse
        const x = e.target == this.canvas ? e.offsetX : e.offsetX - this.canvas.offsetLeft ;
        const y = e.target == this.canvas ? e.offsetY : e.offsetY - this.canvas.offsetTop ;
        const threshold = 5;

        if(this.trimRec[1] < y &&  y < this.trimRec[3] + this.trimRec[1]) {
            if(x < this.startX) {
                this.currentX = this.startX;
            }
            else if(x > this.endX) {
                this.currentX = this.endX;
            }
            else {
                this.currentX = x;
            }
            if(this.onChangeCurrent) {
                this.onChangeCurrent(this.currentX);
            }
        }
    }

    onMouseMove (e) {

        e.preventDefault();

        // Process mouse
        const x = e.target == this.canvas ? e.offsetX : e.offsetX - this.canvas.offsetLeft ;
        const y = e.target == this.canvas ? e.offsetY : e.offsetY - this.canvas.offsetTop ;
        const threshold = 5;

        if(this.dragging) {
            switch(this.dragging) {
                case 'start':
                        if(x < this.position.x) {
                            this.currentX = this.startX = this.position.x;
                        }
                        else if(x > this.endX) {
                            this.currentX = this.startX = this.endX;
                        }
                        else {
                            this.currentX = this.startX = x;
                        }

                        if(this.onChangeStart) {
                            this.onChangeStart(this.startX);
                        }
                        if(this.onChangeCurrent) {
                            this.onChangeCurrent(this.currentX);
                        }
                    break;
                case 'end':
                        if(x > this.width || x <= 0) {
                            this.currentX = this.endX = this.width;
                        }
                        else if(x < this.startX) {
                            this.currentX = this.endX = this.startX;
                        }
                        else {
                            this.currentX = this.endX = x;
                        }

                        if(this.onChangeEnd) {
                            this.onChangeEnd(this.endX);
                        }
                        if(this.onChangeCurrent) {
                            this.onChangeCurrent(this.currentX);
                        }
                    break;
                case 'current':

                    if(x < this.startX) {
                        this.currentX = this.startX;
                    }
                    else if(x > this.endX) {
                        this.currentX = this.endX;
                    }
                    else {
                        this.currentX = x;
                    }
                    if(this.onChangeCurrent) {
                        this.onChangeCurrent(this.currentX);
                    }
                    break;
            }
        }
        else {
            if(!this.canvas) {
                return;
            }

            const canvas = this.canvas;

            if(Math.abs(this.startX - x) < threshold && this.trimRec[1] < y &&  y < this.trimRec[3] + this.trimRec[1] ) {
                this.hovering = 'start';
                canvas.style.cursor = "grab";
            }
            else if(Math.abs(this.endX - x) < threshold) {
                this.hovering = 'end';
                canvas.style.cursor = "grab";
            }
            else if(Math.abs(this.currentX - x) < threshold) {
                this.hovering = 'current';
                canvas.style.cursor = "grab";
            }
            else {
                this.hovering = false;
                canvas.style.cursor = "default";
            }
        }
        this._draw();
    }

    resize (size) {
        this.canvas.width = size[0];
        this.canvas.height = size[1];

        const startRatio = this.startX / this.width;
        const currentRatio = this.currentX / this.width;
        const endRatio = this.endX / this.width;
        this.width = this.canvas.width - this.offset * 2;

        this.startX = Math.max(this.width * startRatio, this.offset);
        this.currentX = Math.min(Math.max(this.width * currentRatio, this.offset), this.width);
        this.endX = Math.min(this.width * endRatio, this.width);

        this._draw();
    }
}

/**
 * @class VideoEditor
 */

class VideoEditor {

    constructor( area, options = {} ) {

        this.playing = false;
        this.requestId = null;

        this.currentTime = this.startTime = 0;
        this.startTimeString = "0:0";
        this.endTimeString = "0:0";

        this.mainArea = area;

        let [videoArea, controlsArea] = area.split({ type: 'vertical', sizes: ["85%", null], minimizable: false, resize: false });
        controlsArea.root.classList.add('lexconstrolsarea');
        
        this.cropArea = document.createElement("div");
        this.cropArea.id = "cropArea";
        this.cropArea.className = "resize-area hidden"

        this.brCrop = document.createElement("div");
        this.brCrop.className = " resize-handle br"; // bottom right
        this.cropArea.append(this.brCrop);
        
        this.crop = options.crop;

        // Create video element and load it
        let video = this.video = options.video ?? document.createElement( 'video' );
        this.video.loop = true;
        
        if(options.src) {
            this.video.src = options.src;
        }
        this._loadVideo(options);

        if(options.videoArea) {
            options.videoArea.root.classList.add("lexvideoeditor");
            options.videoArea.attach(this.cropArea);
            videoArea.attach(options.videoArea);
        }
        else {
            videoArea.attach(video);
            videoArea.attach(this.cropArea);
            videoArea.root.classList.add("lexvideoeditor");
        }

        this.controlsArea = controlsArea;
        // Create playing timeline area and attach panels
        let [topArea, bottomArea] = controlsArea.split({ type: 'vertical', sizes:["50%", null], minimizable: false, resize: false });
        bottomArea.setSize([bottomArea.size[0], 40]);
        let [leftArea, controlsRight] = bottomArea.split({ type: 'horizontal', sizes:["92%", null], minimizable: false, resize: false });
        let [controlsLeft, timeBarArea] = leftArea.split({ type: 'horizontal', sizes:["10%", null], minimizable: false, resize: false });

        topArea.root.classList.add('lexbar');
        bottomArea.root.classList.add('lexbar');
        this.controlsCurrentPanel = new LX.Panel({className: 'lexcontrolspanel lextime'});
        this.controlsCurrentPanel.refresh = () => {
            this.controlsCurrentPanel.clear();
            this.controlsCurrentPanel.addLabel(this.currentTimeString, {float: "center"});
        }
        topArea.root.classList.add('lexflexarea')
        topArea.attach(this.controlsCurrentPanel);
        this.controlsCurrentPanel.refresh();

        const style = getComputedStyle(bottomArea.root);
        let padding = Number(style.getPropertyValue('padding').replace("px",""));
        this.timebar = new TimeBar(timeBarArea, TimeBar.TIMEBAR_TRIM, {offset: padding});

        // Create controls panel (play/pause button and start time)
        this.controlsPanelLeft = new LX.Panel({className: 'lexcontrolspanel'});
        this.controlsPanelLeft.refresh = () => {
            this.controlsPanelLeft.clear();
            this.controlsPanelLeft.sameLine();
            this.controlsPanelLeft.addButton('', '<i class="fa-solid ' + (this.playing ? 'fa-pause' : 'fa-play') + '"></>', (v) => {
                this.playing = !this.playing;
                if(this.playing) {

                    this.video.play();
                    // if(!this.requestId) {
                    //     this.requestId = requestAnimationFrame(this._update.bind(this))
                    // }
                }
                else {
                    // if(this.requestId) {
                    //     cancelAnimationFrame(this.requestId);
                    //     this.requestId = null;
                    // }
                    this.video.pause();
                }
                this.controlsPanelLeft.refresh();
            }, { width: '40px'});

            this.controlsPanelLeft.addLabel(this.startTimeString, {width: 50});
            this.controlsPanelLeft.endLine();

            let availableWidth = leftArea.root.clientWidth - controlsLeft.root.clientWidth;
            this.timebar.resize([availableWidth, timeBarArea.root.clientHeight]);
        }

        this.controlsPanelLeft.refresh();
        controlsLeft.root.style.minWidth = 'fit-content';
        controlsLeft.attach(this.controlsPanelLeft);

        // Create right controls panel (ens time)
        this.controlsPanelRight = new LX.Panel({className: 'lexcontrolspanel'});
        this.controlsPanelRight.refresh = () => {
            this.controlsPanelRight.clear();
            this.controlsPanelRight.addLabel(this.endTimeString, {width: 50});
        }
        this.controlsPanelRight.refresh();
        controlsRight.root.style.minWidth = 'fit-content';
        controlsRight.attach(this.controlsPanelRight);

        this.timebar.onChangeCurrent = this._setCurrentValue.bind(this);
        this.timebar.onChangeStart = this._setStartValue.bind(this);
        this.timebar.onChangeEnd = this._setEndValue.bind(this);

        window.addEventListener('resize', (v) => {
            if(this.onResize) {
                this.onResize([videoArea.root.clientWidth, videoArea.root.clientHeight]);
            }
            bottomArea.setSize([videoArea.root.clientWidth, 40]);
            let availableWidth = this.controlsArea.root.clientWidth - controlsLeft.root.clientWidth - controlsRight.root.clientWidth;
            this.timebar.resize([availableWidth, timeBarArea.root.clientHeight]);
        })

        this.onKeyUp = (event) => {
            if(this.controls && event.key == " ") {
                event.preventDefault();
                event.stopPropagation();

                if(!this.playing) {
                    this.video.play();
                }
                else {
                    this.video.pause();
                }
                this.playing = !this.playing;
                this.controlsPanelLeft.refresh();
            }
        }

        window.addEventListener( "keyup", this.onKeyUp);

        videoArea.onresize = (v) => {
            bottomArea.setSize([v.width, 40]);

            const ratio = this.video.clientHeight / this.video.videoHeight;
            this.cropArea.style.height = this.video.clientHeight + "px";
            this.cropArea.style.width = this.video.videoWidth * ratio + "px";
        }

        timeBarArea.onresize = (v) => {
            let availableWidth = this.controlsArea.root.clientWidth - controlsLeft.root.clientWidth - controlsRight.root.clientWidth;
            this.timebar.resize([availableWidth, v.height]);
        }

        // Add canvas event listeneres
        area.root.addEventListener( "mousedown", (event) => {
            if(this.controls) {
                this.timebar.onMouseDown(event);
            }
        });
        area.root.addEventListener( "mouseup",   (event) => {
            if(this.controls) {
                this.timebar.onMouseUp(event);
            }

            if( ( this.isDragging || this.isResizing ) && this.onCropArea ) {
                if( this.onCropArea ) {
                    this.onCropArea( this.getCroppedArea() );
                }
            }
            this.isDragging = false;
            this.isResizing = false;

        });
        area.root.addEventListener( "mousemove", (event) => {
            if(this.controls) {
                this.timebar.onMouseMove(event);
            }

            if (this.isResizing) {
                this.resizeCropArea(event);
            }

            if(this.isDragging) {

                this.dragCropArea(event);
            }
        });

        this.cropArea.addEventListener('mousedown', (event) => {

            const rect = this.cropArea.getBoundingClientRect();

            if (event.target === this.cropArea) {
                this.isDragging = true;

                this.dragOffsetX = event.clientX - rect.left;
                this.dragOffsetY = event.clientY - rect.top;
            }
        });

        document.querySelectorAll('.resize-handle').forEach(handle => {

            handle.addEventListener('mousedown', (e) => {

                e.stopPropagation();
                this.resizeHandle = handle.classList[1];
                this.isResizing = true;
            });
        });        
    }

    resizeCropArea(event) {

        const rect = this.cropArea.getBoundingClientRect();
        
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        if (this.resizeHandle === 'br') {
                        
            const nodes = this.cropArea.parentElement.childNodes;

            for( let i = 0; i < nodes.length; i++ ) {
                if( nodes[i] != this.cropArea ) {
                   const rectEl = nodes[i].getBoundingClientRect();
                    let width = mouseX - rect.left;
                    let height = mouseY - rect.top;
         
                    if( rect.x + width > rectEl.right ) {
                        width = rectEl.right - rect.x;
                    }
         
                    if( rect.y + height > rectEl.bottom ) {
                        height = rectEl.bottom - rect.y;
                    }
         
                    this.cropArea.style.width = width + "px";
                    this.cropArea.style.height = height + "px";
           
                    nodes[i].style.webkitMask = `linear-gradient(#000 0 0) ${rect.x - rectEl.left}px ${ rect.y - rectEl.top }px / ${width}px ${height}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
                    nodes[i].style.webkitMaskRepeat = 'no-repeat';
                }
            }
        }
    }

    dragCropArea( event ) {
        const rectVideo = this.video.getBoundingClientRect();

        let x = event.clientX - this.dragOffsetX;
        let y = event.clientY - this.dragOffsetY;

        if(x < rectVideo.left ) {
            x = rectVideo.left;
        }

        if( x + this.cropArea.clientWidth > rectVideo.right ) {
            x = rectVideo.right - this.cropArea.clientWidth;
        }

        if(y < rectVideo.top ) {
            y = rectVideo.top;
        }
        
        if( y + this.cropArea.clientHeight > rectVideo.height ) {
            y = rectVideo.height - this.cropArea.clientHeight;
        }

        this.cropArea.style.left = x + "px";
        this.cropArea.style.top = y + "px";

        const videoEndX = rectVideo.left + rectVideo.width;
        const cropEndX = x + this.cropArea.clientWidth;
        const videoEndY = rectVideo.height;
        const cropEndY = y + this.cropArea.clientHeight;

        const nodes = this.cropArea.parentElement.childNodes;

        for( let i = 0; i < nodes.length; i++ ) {
            if( nodes[i] != this.cropArea ) {
                const rectEl = nodes[i].getBoundingClientRect();
                nodes[i].style.webkitMask = `linear-gradient(#000 0 0) ${x - rectEl.left}px ${y }px / ${this.cropArea.clientWidth}px ${this.cropArea.clientHeight}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
                nodes[i].style.webkitMaskRepeat = 'no-repeat';
            }
        }
    }

    async _loadVideo( options = {} ) {
        while(this.video.duration === Infinity || isNaN(this.video.duration) || !this.timebar) {
            await new Promise(r => setTimeout(r, 1000));
            this.video.currentTime = 10000000 * Math.random();
        }
        
        this.timebar.startX = this.timebar.position.x;
        this.timebar.endX = this.timebar.width;

        this.video.currentTime = 0.01; // BUG: some videos will not play unless this line is present 
        this.endTime = this.video.duration;
        
        this._setEndValue(this.timebar.endX);
        this._setStartValue(this.timebar.startX);
        this.timebar.currentX = this._timeToX(this.video.currentTime);
        this._setCurrentValue(this.timebar.currentX, false);
        this.timebar.update(this.timebar.currentX);
        
        if ( !this.requestId ){ // only have one update on flight
            this._update();
        } 
        this.controls = options.controls ?? true;
        
        if ( !this.controls ) {
            this.hideControls();
        }

        const ratio = this.video.clientHeight / this.video.videoHeight;
        this.cropArea.style.height = this.video.clientHeight + "px";
        this.cropArea.style.width = this.video.videoWidth * ratio + "px";

        if( this.crop ) {
            this.showCropArea();
        }

        window.addEventListener( "keyup", this.onKeyUp);

        if( this.onVideoLoaded ) {
            this.onVideoLoaded(this.video);
        }
    }

    _update () {

        if(this.onDraw) {
            this.onDraw();
        }
        if(this.playing) {
            if(this.video.currentTime >= this.endTime) {
                this.video.currentTime = this.startTime;
            }
            const x = this._timeToX(this.video.currentTime);
            this._setCurrentValue(x, false);
            this.timebar.update(x);
        }

        this.requestId = requestAnimationFrame(this._update.bind(this));
    }

    _xToTime (x) {
        return ((x - this.timebar.offset) / (this.timebar.width - this.timebar.offset)) *  this.video.duration;
    }

    _timeToX (time) {
        return (time / this.video.duration) *  (this.timebar.width - this.timebar.offset ) + this.timebar.offset;
    }

    _setCurrentValue ( x, updateTime = true ) {
        const t = this._xToTime(x);

        if(updateTime) {
            this.video.currentTime = t;
        }
        //console.log( "Computed: " + t)
        let mzminutes = Math.floor(t / 60);
        let mzseconds = Math.floor(t - (mzminutes * 60));
        let mzmiliseconds = Math.floor((t - mzseconds)*100);

        mzmiliseconds = mzmiliseconds < 10 ? ('0' + mzmiliseconds) : mzmiliseconds;
        mzseconds = mzseconds < 10 ? ('0' + mzseconds) : mzseconds;
        mzminutes = mzminutes < 10 ? ('0' + mzminutes) : mzminutes;
        this.currentTimeString = mzminutes+':'+mzseconds+'.'+mzmiliseconds;
        this.controlsCurrentPanel.refresh();

        if(this.onSetTime) {
            this.onSetTime(t);
        }
    }

    _setStartValue ( x ) {
        const t = this._xToTime(x);
        this.startTime = this.video.currentTime = t;

        let mzminutes = Math.floor(t / 60);
        let mzseconds = Math.floor(t - (mzminutes * 60));
        let mzmiliseconds = Math.floor((t - mzseconds)*100);

        mzmiliseconds = mzmiliseconds < 10 ? ('0' + mzmiliseconds) : mzmiliseconds;
        mzseconds = mzseconds < 10 ? ('0' + mzseconds) : mzseconds;
        mzminutes = mzminutes < 10 ? ('0' + mzminutes) : mzminutes;
        this.startTimeString =  mzminutes+':'+mzseconds+'.'+mzmiliseconds;
        this.controlsPanelLeft.refresh();
        if(this.onSetTime) {
            this.onSetTime(t);
        }
    }

    _setEndValue ( x ) {
        const t = this._xToTime(x);
        this.endTime = this.video.currentTime = t;

        let mzminutes = Math.floor(t / 60);
        let mzseconds = Math.floor(t - (mzminutes * 60));
        let mzmiliseconds = Math.floor((t - mzseconds)*100);

        mzmiliseconds = mzmiliseconds < 10 ? ('0' + mzmiliseconds) : mzmiliseconds;
        mzseconds = mzseconds < 10 ? ('0' + mzseconds) : mzseconds;
        mzminutes = mzminutes < 10 ? ('0' + mzminutes) : mzminutes;

        this.endTimeString =  mzminutes+':'+mzseconds+'.'+mzmiliseconds;
        this.controlsPanelRight.refresh();
        if(this.onSetTime) {
            this.onSetTime(t);
        }
    }

    getStartTime ( ) {
        return this.startTime;
    }

    getEndTime ( ) {
        return this.endTime;
    }

    getTrimedTimes ( ) {
        return {start: this.startTime, end: this.endTime};
    }

    getCroppedArea ( ) {
        return this.cropArea.getBoundingClientRect();
    }

    showCropArea ( ) {
        this.cropArea.classList.remove("hidden");
    }

    hideCropArea ( ) {
        this.cropArea.classList.add("hidden");
    }

    showControls ( ) {
        this.controls = true;
        this.controlsArea.show();
    }

    hideControls ( ) {
        this.controls = false;
        this.controlsArea.hide();
    }

    stopUpdates(){

        if(this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    unbind ( ) {
        this.stopUpdates();
        
        this.video.pause();
        this.playing = false;
        this.controlsPanelLeft.refresh();
        this.video.src = "";

        window.removeEventListener("keyup", this.onKeyUp);
    }
}

LX.VideoEditor = VideoEditor;

export { VideoEditor }