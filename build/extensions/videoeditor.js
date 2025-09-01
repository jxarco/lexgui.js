import { LX } from 'lexgui';

if(!LX) {
    throw("lexgui.js missing!");
}

LX.extensions.push( 'TimeBar' );
LX.extensions.push( 'VideoEditor' );

/**
 * @class TimeBar
 */

class TimeBar {

    static TIMEBAR_PLAY       = 1;
    static TIMEBAR_TRIM       = 2;

    static BACKGROUND_COLOR = LX.getThemeColor("global-branch-darker");
    static COLOR = LX.getThemeColor("global-button-color");
    static ACTIVE_COLOR = "#668ee4";

    constructor( area, type, options = {} ) {

        this.type = type;

        // Create canvas
        this.canvas = document.createElement( 'canvas' );
        this.canvas.width = area.size[0];
        this.canvas.height = area.size[1];
        area.attach( this.canvas );

        this.ctx = this.canvas.getContext("2d");
  
        this.markerWidth = options.markerWidth ?? 8;
        this.markerHeight = options.markerHeight ?? (this.canvas.height * 0.5);
        this.offset = options.offset || (this.markerWidth*0.5 + 8);

        // dimensions of line (not canvas)
        this.lineWidth = this.canvas.width - this.offset * 2;
        this.lineHeight = options.barHeight ?? 5;

        this.position = new LX.vec2( this.offset, this.canvas.height * 0.5 - this.lineHeight * 0.5);
        this.startX = this.position.x;
        this.endX = this.position.x + this.lineWidth;
        this.currentX = this.startX;

        this._draw();

        this.updateTheme();
        LX.addSignal( "@on_new_color_scheme", (el, value) => {
            // Retrieve again the color using LX.getThemeColor, which checks the applied theme
            this.updateTheme();
        } )
    }

    updateTheme(){
        TimeBar.BACKGROUND_COLOR = LX.getThemeColor("global-color-secondary");
        TimeBar.COLOR = LX.getThemeColor("global-color-quaternary");
        TimeBar.ACTIVE_COLOR = "#668ee4";
    }

    _draw() {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.fillStyle = TimeBar.BACKGROUND_COLOR;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background timeline
        ctx.fillStyle = TimeBar.COLOR;
        ctx.fillRect(this.position.x, this.position.y, this.lineWidth, this.lineHeight);

        // Draw background trimed timeline
        ctx.fillStyle = TimeBar.ACTIVE_COLOR;
        ctx.fillRect(this.startX, this.position.y, this.endX - this.startX, this.lineHeight);

        ctx.restore();

        // Min-Max time markers
        this._drawTrimMarker('start', this.startX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9'});
        this._drawTrimMarker('end', this.endX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9'});
        this._drawTimeMarker('current', this.currentX, { color: '#e5e5e5', fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9', width: this.markerWidth });
    }

    _drawTrimMarker(name, x, options) {

        options = options || {};

        const w = this.markerWidth;
        const h = this.markerHeight;
        const y = this.canvas.height * 0.5 - h * 0.5;

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

    _drawTimeMarker(name, x, options) {

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

    update (x) {
        this.currentX = Math.min(Math.max(this.startX, x), this.endX);
        this._draw();

        if(this.onDraw) {
            this.onDraw();
        }
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

        // grab trim markers only from the bottom
        if(Math.abs(this.startX - x) < threshold && this.position.y < y) {
            this.dragging = 'start';
            canvas.style.cursor = "grabbing";
        }
        else if(Math.abs(this.endX - x) < threshold && this.position.y < y) {
            this.dragging = 'end';
            canvas.style.cursor = "grabbing";
        }
        else {
            this.dragging = 'current';
            canvas.style.cursor = "grabbing";
        
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

        this._draw();
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
    }

    onMouseMove (e) {
        if(!this.canvas) {
            return;
        }

        e.preventDefault();
        const canvas = this.canvas;

        // Process mouse
        const x = e.target == canvas ? e.offsetX : e.clientX - canvas.offsetLeft;
        const y = e.target == canvas ? e.offsetY : e.clientY - canvas.offsetTop;

        if(this.dragging) {
            switch(this.dragging) {
                case 'start':
                    this.startX = Math.max(this.position.x, Math.min(this.endX, x));                        
                    this.currentX = this.startX;
                    if(this.onChangeStart) {
                        this.onChangeStart(this.startX);
                    }
                    break;
                case 'end':
                    this.endX = Math.max(this.startX, Math.min(this.position.x + this.lineWidth, x));
                    this.currentX = this.endX;
                    if(this.onChangeEnd) {
                        this.onChangeEnd(this.endX);
                    }
                    break;
                default:
                    this.currentX = Math.max(this.startX, Math.min(this.endX, x));
                    break;
            }

            if(this.onChangeCurrent) {
                this.onChangeCurrent(this.currentX);
            }
        }
        else {
            const threshold = this.markerWidth * 0.5;

            if(Math.abs(this.startX - x) < threshold ) {
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

        let newWidth = size[0] - this.offset * 2;
        newWidth = newWidth < 0.00001 ? 0.00001 : newWidth; // actual width of the line = canvas.width - offsetleft - offsetRight 
        const startRatio = (this.startX - this.offset) / this.lineWidth;
        const currentRatio = (this.currentX - this.offset) / this.lineWidth;
        const endRatio = (this.endX - this.offset) / this.lineWidth;
        
        this.lineWidth = newWidth;
        this.startX = Math.min( Math.max(newWidth * startRatio, 0), newWidth ) + this.offset;
        this.currentX = Math.min(Math.max(newWidth * currentRatio, 0), newWidth) + this.offset;
        this.endX = Math.min( Math.max(newWidth * endRatio, 0 ), newWidth) + this.offset;

        this._draw();
    }
}
LX.TimeBar = TimeBar;


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

        let videoArea = null;
        let controlsArea = null;
        if(options.controlsArea) {
            videoArea = area;
            controlsArea = options.controlsArea;
        }
        else {
            [videoArea, controlsArea] = area.split({ type: 'vertical', sizes: ["85%", null], minimizable: false, resize: false });
        }
        controlsArea.root.classList.add('lexconstrolsarea');
        
        this.cropArea = document.createElement("div");
        this.cropArea.id = "cropArea";
        this.cropArea.className = "resize-area hidden"

        this.brCrop = document.createElement("div");
        this.brCrop.className = " resize-handle br"; // bottom right
        this.cropArea.append(this.brCrop);
        
        this.crop = options.crop;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        // Create video element and load it
        let video = this.video = options.video ?? document.createElement( 'video' );
        this.video.loop = true;
        
        if(options.src) {
            this.video.src = options.src;
            this._loadVideo(options);
        }
        
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
            this.controlsPanelLeft.addButton('', "", (v) => {
                this.playing = !this.playing;
                if(this.playing) {
                    this.video.play();
                }
                else {
                    this.video.pause();
                }
                this.controlsPanelLeft.refresh();
            }, { width: '40px', icon: (this.playing ? 'Pause@solid' : 'Play@solid'), className: "justify-center"});

            this.controlsPanelLeft.addLabel(this.startTimeString, {width: 100});
            this.controlsPanelLeft.endLine();

            let availableWidth = leftArea.root.clientWidth - controlsLeft.root.clientWidth;
            this.timebar.resize([availableWidth, timeBarArea.root.clientHeight]);
        }

        this.controlsPanelLeft.refresh();
        controlsLeft.root.style.minWidth = 'fit-content';
        controlsLeft.root.classList.add(); controlsLeft.attach(this.controlsPanelLeft);

        // Create right controls panel (ens time)
        this.controlsPanelRight = new LX.Panel({className: 'lexcontrolspanel'});
        this.controlsPanelRight.refresh = () => {
            this.controlsPanelRight.clear();
            this.controlsPanelRight.addLabel(this.endTimeString, {width: 100});
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
            this.dragCropArea( { clientX: -1, clientY: -1 } );
            this.resizeCropArea( { clientX: window.screen.width, clientY: window.screen.height } );

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

        const parent = controlsArea.parentElement ? controlsArea.parentElement : controlsArea.root.parentElement;

        // Add canvas event listeneres
        parent.addEventListener( "mousedown", (event) => {
            if(this.controls) {
                this.timebar.onMouseDown(event);
            }
        });
        parent.addEventListener( "mouseup",   (event) => {
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
        parent.addEventListener( "mousemove", (event) => {
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

            
            if (event.target === this.cropArea) {
                const rect = this.cropArea.getBoundingClientRect();
                this.isDragging = true;

                this.dragOffsetX = event.clientX - rect.left;
                this.dragOffsetY = event.clientY - rect.top;
            }
        });

        document.querySelectorAll('.resize-handle').forEach(handle => {

            handle.addEventListener('mousedown', (e) => {

                e.stopPropagation();
                if (handle.classList[1] === 'br') {
                    this.isResizing = true;
                }
            });
        });
        
        this.onChangeStart = null;
        this.onChangeEnd = null;
    }

    resizeCropArea(event) {

        const mouseX = event.clientX;
        const mouseY = event.clientY;
        
        const isCropHidden = this.cropArea.classList.contains("hidden");
        const nodes = this.cropArea.parentElement.childNodes;
        
        const rectCrop = this.cropArea.getBoundingClientRect();
        const rectVideo = this.video.getBoundingClientRect();
        let width = Math.max( 0, Math.min( mouseX - rectCrop.left, rectVideo.width ) );
        let height = Math.max( 0, Math.min( mouseY - rectCrop.top, rectVideo.height ) );
        if ( (rectCrop.left + width) > rectVideo.right ){
            width = Math.min( rectVideo.width, rectVideo.right - rectCrop.left);
        }
        if ( (rectCrop.top + height) > rectVideo.bottom ){
            height = Math.min( rectVideo.height, rectVideo.bottom - rectCrop.top);
        }

        if ( !isCropHidden ){ 
            for( let i = 0; i < nodes.length; i++ ) {
                if( nodes[i] != this.cropArea ) {                    
                    const rectEl = nodes[i].getBoundingClientRect();
                    nodes[i].style.webkitMask = `linear-gradient(#000 0 0) ${rectCrop.x - rectEl.left}px ${ rectCrop.y - rectEl.top }px / ${width}px ${height}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
                    nodes[i].style.webkitMaskRepeat = 'no-repeat';
                }
            }
        }

        this.cropArea.style.width = width + "px";
        this.cropArea.style.height = height + "px";
    }

    dragCropArea( event ) {
        const rectVideo = this.video.getBoundingClientRect();
        const rectCrop = this.cropArea.getBoundingClientRect();

        let x = event.clientX - this.dragOffsetX;
        let y = event.clientY - this.dragOffsetY;

        if( x < rectVideo.left ) {
            x = rectVideo.left;
        }

        if( x + rectCrop.width > rectVideo.right ) {
            x = Math.max( rectVideo.left, rectVideo.right - rectCrop.width);
        }

        if( y < rectVideo.top ) {
            y = rectVideo.top;
        }
        
        if( y + rectCrop.height > rectVideo.bottom ) {
            y = Math.max( rectVideo.top, rectVideo.bottom - rectCrop.height );
        }

        if ( !this.cropArea.classList.contains("hidden") ){
            const nodes = this.cropArea.parentElement.childNodes;   
            for( let i = 0; i < nodes.length; i++ ) {
                if( nodes[i] != this.cropArea ) {
                    const rectEl = nodes[i].getBoundingClientRect();
                    nodes[i].style.webkitMask = `linear-gradient(#000 0 0) ${x - rectEl.left}px ${y - rectEl.top}px / ${rectCrop.width}px ${rectCrop.height}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
                    nodes[i].style.webkitMaskRepeat = 'no-repeat';
                }
            }
        }

        const parentRect = this.cropArea.parentElement.getBoundingClientRect();
        this.cropArea.style.left = x - parentRect.left + "px";
        this.cropArea.style.top = y - parentRect.top + "px";

    }

    async _loadVideo( options = {} ) {
        while(this.video.duration === Infinity || isNaN(this.video.duration) || !this.timebar) {
            await new Promise(r => setTimeout(r, 1000));
            this.video.currentTime = 10000000 * Math.random();
        }
        
        this.timebar.startX = this.timebar.position.x;
        this.timebar.endX = this.timebar.position.x + this.timebar.lineWidth;

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

        this.cropArea.style.height = this.video.clientHeight + "px";
        this.cropArea.style.width =  this.video.clientWidth + "px";
        this.resizeCropArea( { clientX: window.screen.width, clientY: window.screen.height } );
        this.dragCropArea( { clientX: -1, clientY: -1 } );

        if( this.crop ) {
            this.showCropArea();
        }else{
            this.hideCropArea();
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
        return ((x - this.timebar.offset) / (this.timebar.lineWidth)) *  this.video.duration;
    }

    _timeToX (time) {
        return (time / this.video.duration) *  (this.timebar.lineWidth) + this.timebar.offset;
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
        
        if(this.onChangeStart) {
            this.onChangeStart(t);
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

        if(this.onChangeEnd) {
            this.onChangeEnd(t);
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

        const nodes = this.cropArea.parentElement.childNodes;
        const rect = this.cropArea.getBoundingClientRect();
        for( let i = 0; i < nodes.length; i++ ) {
            if( nodes[i] != this.cropArea ) {
               const rectEl = nodes[i].getBoundingClientRect();
                nodes[i].style.webkitMask = `linear-gradient(#000 0 0) ${rect.left - rectEl.left}px ${rect.top - rectEl.top}px / ${rect.width}px ${rect.height}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
                nodes[i].style.webkitMaskRepeat = 'no-repeat';
            }
        }
    }

    hideCropArea ( ) {
        this.cropArea.classList.add("hidden");

        const nodes = this.cropArea.parentElement.childNodes;
        for( let i = 0; i < nodes.length; i++ ) {
            if( nodes[i] != this.cropArea ) {       
                nodes[i].style.webkitMask = "";
                nodes[i].style.webkitMaskRepeat = 'no-repeat';
            }
        }
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

export { VideoEditor, TimeBar }