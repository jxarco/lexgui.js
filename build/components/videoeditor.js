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
        
        // this.root = document.createElement( 'div' );
        // this.root.className = "lexvideotimebar";
        // area.attach(this.root);
        
        // Create canvas
        this.canvas = document.createElement( 'canvas' );
        this.canvas.width = area.size[0];
        this.canvas.height = area.size[1];
        area.attach( this.canvas );
        
        this.ctx = this.canvas.getContext("2d");
        
        const barHeight = options.barHeight ?? 5;
        this.markerWidth = options.markerWidth ?? 8;
        this.offset = options.offset ?? 5;
        
        this.width = this.canvas.width - this.offset * 2;
        this.height = barHeight;

        this.position = new LX.vec2( this.offset, this.canvas.height * 0.5 - this.height * 0.5);
        this.startX = this.position.x;
        this.endX = this.width;
        this.currentX = this.startX + 5;

        const y = this.offset * 2;
        const w = this.markerWidth;
        const h = this.canvas.height - y * 2;
        this.trimRec = [this.startX, y, w, h];

        this.draw();

        this.lastPosition = new LX.vec2( 0, 0 );

        // Add canvas event listeneres
        area.root.addEventListener( "mousedown", this.onMouseDown.bind(this) );
        area.root.addEventListener( "mouseup", this.onMouseUp.bind(this) );
        area.root.addEventListener( "mousemove", this.onMouseMove.bind(this) );

        //return this.root;        
    }

    draw() {
        const ctx = this.ctx;
    
        ctx.save();
        // ctx.fillStyle ="red"// LX.getThemeColor("global-color-primary");
        ctx.fillStyle = TimeBar.BACKGROUND_COLOR;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // // Draw background timeline
        //ctx.globalAlpha = 0.8;
        ctx.fillStyle = TimeBar.COLOR;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Draw background trimed timeline
        //ctx.globalAlpha = 1;
        ctx.fillStyle = TimeBar.ACTIVE_COLOR;
        ctx.fillRect(this.startX, this.position.y, this.endX - this.offset - this.startX, this.height);
        
        // ctx.strokeStyle = ctx.fillStyle;
        ctx.restore();

        // Min-Max time markers
        this.addTrim('start', this.startX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9'});
        this.addTrim('end', this.endX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9'});
        this.addMarker('current', this.currentX, { color: '#e5e5e5', fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9', width: this.markerWidth });
    }

    addTrim(name, x, options) {

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
        //ctx.strokeStyle = markerColor;
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

    addMarker(name, x, options) {

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
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + h * 0.5);
        ctx.stroke();       
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111' // "#FFF";
        
        // Current time text
       
        y -= this.offset + 4;
        ctx.globalAlpha = 1;
        // ctx.beginPath();
        // ctx.moveTo(x, y);
        // ctx.lineTo(x, y + h);
        // ctx.stroke();

        ctx.fillStyle = options.fillColor || '#e5e5e5';
        ctx.beginPath();
        ctx.roundRect(x - w * 0.5, y + this.offset, w, w, 5);
        // ctx.moveTo(x - w, y - 1);
        // ctx.lineTo(x + w, y - 1);
        // ctx.lineTo(x, y + 10);
        ctx.fill();
        ctx.shadowBlur = 0;
        // ctx.fillStyle = '#e5e5e5';
        // ctx.beginPath();
        // ctx.moveTo(x - 6, y);
        // ctx.lineTo(x + 6, y);
        // ctx.lineTo(x, y + 8);
        // ctx.fill();

        // let xPos = Math.max( Math.min( x - 17, this.width - 42), 5 );
        // ctx.fillStyle = "rgba(200, 200, 200, 0.2)";
        // ctx.lineWitdh = 0;
        // ctx.roundRect(xPos - 5, y - 25, 47, 15);
        // ctx.fill();
        // ctx.fillStyle = "#e5e5e5";
        // ctx.font = "bold 16px Calibri";
        // ctx.fillText(String(time.toFixed(3)), xPos, y - 12);
    }

    onMouseDown (e) {

        e.preventDefault();
        
        if(!this.canvas) {
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
        else if(Math.abs(this.endX - x) < threshold) {
            this.dragging = 'end';
            canvas.style.cursor = "grabbing";
        } 
        else if(Math.abs(this.currentX - x) < threshold) {
            this.dragging = 'current';
            canvas.style.cursor = "grabbing";
        } 
        else {
            this.currentX = x;
            // if(this.onSetTime)
            //     this.onSetTime(t);
        }

        this.draw();
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

        e.preventDefault();

        // Process mouse
        const x = e.offsetX;
        const y = e.offsetY;
        const threshold = 5;

        if(this.dragging) {
            switch(this.dragging) {
                case 'start':
                    {
                        this.startX = x; 
                        this.currentX = x;
                        if(this.onChangeStart) {
                            this.onChangeStart(this.startX);
                        }
                        if(this.onChangeCurrent) {
                            this.onChangeCurrent(this.currentX);
                        }
                        
                    }
                    break;
                case 'end':
                    {
                        this.endX = x; 
                        this.currentX = x;
                        if(this.onChangeEnd) {
                            this.onChangeEnd(this.endX);
                        }
                        if(this.onChangeCurrent) {
                            this.onChangeCurrent(this.currentX);
                        }
                    }
                    break;
                case 'current':
                    this.currentX = x; 
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
        this.draw();
    }

    setCurrentValue( x ) {
        this.currentX = x;
        this.draw();
    }
}

/**
 * @class VideoEditor
 */

class VideoEditor {

    constructor( area, options = {} ) {

        this.startTime = 0;
        this.playing = false;

        this.area = area;
        area.root.classList.add("lexvideoeditor");
        let [videoArea, controlsArea] = area.split({ type: 'vertical', sizes:["90%", null], minimizable: false, resize: false });
        controlsArea.root.classList.add('lexconstrolsarea');
        
        // Create video element and load it
        let video = this.video = document.createElement( 'video' );
        this.video.src = options.src ?? '';
        this.loadVideo(options);
        videoArea.attach(video);

        // Create controls panel (play/pause button and start time)
        this.controlsPanelLeft = new LX.Panel({className: 'lexcontrolspanel'});        
        this.controlsPanelLeft.refresh = () => {
            this.controlsPanelLeft.clear();
            this.controlsPanelLeft.sameLine();
            this.controlsPanelLeft.addButton('', '<i class="fa-solid ' + (this.playing ? 'fa-pause' : 'fa-play') + '"></>', (v) => {
                this.playing = !this.playing;
                if(this.playing) {
                    this.video.play();
                }
                else {
                    this.video.pause();
                }
                this.controlsPanelLeft.refresh();
            }, { width: '40px'});
            
            this.controlsPanelLeft.addLabel(this.startTime, {width: 50});
            this.controlsPanelLeft.endLine();
        }

        this.controlsPanelLeft.refresh();

        // Create right controls panel (ens time)
        this.controlsPanelRight = new LX.Panel({className: 'lexcontrolspanel'});        
        this.controlsPanelRight.refresh = () => {
            this.controlsPanelRight.clear();
            
            this.controlsPanelRight.addLabel(this.endTime, {width: 50});
        }
        this.controlsPanelRight.refresh();

        // Create playing timeline area and attach panels
        let [leftArea, controlsRight] = controlsArea.split({ type: 'horizontal', sizes:["92%", null], minimizable: false, resize: false });
        let [controlsLeft, timeBarArea] = leftArea.split({ type: 'horizontal', sizes:["10%", null], minimizable: false, resize: false });
        
        controlsLeft.attach(this.controlsPanelLeft);
        controlsRight.attach(this.controlsPanelRight);

        const style = getComputedStyle(controlsArea.root);
        let padding = Number(style.getPropertyValue('padding').replace("px",""));
        this.timebar = new TimeBar(timeBarArea, TimeBar.TIMEBAR_TRIM, {offset: padding});   
       
        this.timebar.onChangeCurrent = this.setCurrentValue.bind(this); 
        this.timebar.onChangeStart = this.setStartValue.bind(this); 
        this.timebar.onChangeEnd = this.setEndValue.bind(this); 
    }

    async loadVideo( ) {
        while(this.video.duration === Infinity || isNaN(this.video.duration) || !this.timebar) {
            await new Promise(r => setTimeout(r, 1000));
            this.video.currentTime = 10000000 * Math.random();
        }
        this.video.currentTime = 0;
        this.endTime = this.video.duration;                             
        this.video.ontimeupdate  = (event) => {
            const x = this.timeToX(this.video.currentTime);
            this.timebar.setCurrentValue(x);
        };
        this.setEndValue(this.timebar.endX);
        this.setStartValue(this.timebar.startX);
        this.timebar.draw();
    }

    xToTime (x) {
        return (x / (this.timebar.width - this.timebar.offset * 2 )) *  this.video.duration;
    }

    timeToX (time) {
        return (time / this.video.duration) *  (this.timebar.width - this.timebar.offset * 2) + this.timebar.offset;
    }

    setCurrentValue ( x ) {
        const t = this.xToTime(x);
        this.video.currentTime = t;
        if(this.onSetTime) {
            this.onSetTime(x);
        }
    }

    setStartValue ( x ) {
        const t = this.xToTime(x);
        let mzminutes = Math.floor(t / 60);
        let mzseconds = Math.floor(t - (mzminutes * 60));
        mzseconds = mzseconds < 10 ? ('0' + mzseconds) : mzseconds;
        mzminutes = mzminutes < 10 ? ('0' + mzminutes) : mzminutes;
        this.startTime = mzminutes+':'+mzseconds;
        this.controlsPanelLeft.refresh();
    }

    setEndValue ( x ) {
        const t = this.xToTime(x);
        let mzminutes = Math.floor(t / 60);
        let mzseconds = Math.floor(t - (mzminutes * 60));
        mzseconds = mzseconds < 10 ? ('0' + mzseconds) : mzseconds;
        mzminutes = mzminutes < 10 ? ('0' + mzminutes) : mzminutes;
            
        this.endTime = mzminutes+':'+mzseconds;
        this.controlsPanelRight.refresh();
    }
}

LX.VideoEditor = VideoEditor;

export { VideoEditor }