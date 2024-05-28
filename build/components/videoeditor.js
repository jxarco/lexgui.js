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

    constructor( editor, type, options = {} ) {

        this.editor = editor;
        this.type = type;

        this.root = document.createElement( 'div' );
        this.root.className = "lexvideotimebar";
        
        this.canvas = document.createElement( 'canvas' );

        this.root.appendChild( this.canvas );

        this.canvas.addEventListener( "mousedown", inner_mousedown );
        this.ctx = this.canvas.getContext("2d");

        let x = options.offset ?? 0;
        let offsetHeight = this.offsetHeight = 5;

        this.width = this.canvas.width;
        this.height = this.canvas.height - this.canvas.style.paddingTop - this.canvas.style.paddingBottom;
        this.barHeight = 25;

        const ctx = this.ctx;
        ctx.save();
        ctx.clearRect(0, 0, this.width, this.height);

        // Draw background timeline
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = LX.getThemeColor("global-primary-color");
        ctx.strokeStyle = ctx.fillStyle;
        ctx.roundRect(x, this.height * 0.5 - offsetHeight, this.width, this.barHeight);
        ctx.fill();

        // Draw background trimed timeline
        ctx.globalAlpha = 1;
        ctx.fillStyle = LX.getThemeColor("global-selected");
        ctx.fillRect(x + this.timeToX(this.editor.startTime), this.height * 0.5 - offsetHeight , this.timeToX(this.editor.endTime - this.editor.startTime), this.barHeight);
        
        ctx.strokeStyle = ctx.fillStyle;

         // Min-Max time markers
         this.addTimeMarker('start', this.editor.startTime, { color: null, fillColor: '#5f88c9', width: 15 });
         this.addTimeMarker('end', this.editor.endTime, { color: null, fillColor: '#5f88c9', width: 15 });
         this.addTimeMarker('current', this.editor.video.currentTime, { color: '#e5e5e5', fillColor: '#5f88c9', width: 2 });

        ctx.restore();

        this.lastPosition = new LX.vec2( 0, 0 );

        let that = this;
        
        function inner_mousedown( e )
        {           
            that.lastPosition.set( e.x, e.y );
            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mousemove( e )
        {
            var dt = that.lastPosition.sub( new LX.vec2( e.x, e.y ) );
            
            that.lastPosition.set( e.x, e.y );
            e.stopPropagation();
            e.preventDefault();
        }

        function inner_mouseup( e )
        {
            
        }
        return this.root;
        
    }

    addTimeMarker(name, time, options) {

        options = options || {};
        const ctx = this.ctx;
        ctx.lineWitdh = 1;
        const x = this.timeToX(time);
        let h0 = this.height - this.barHeight - this.offsetHeight*2;
        let h = this.barHeight  ;

        let mWidth = options.width ? options.width : (this.dragging == name ? 6 : 4);
        let markerColor = options.color || options.fillColor;

        ctx.strokeStyle = markerColor;
        ctx.globalAlpha = 1;
        ctx.fillStyle = options.fillColor || '#111' // "#FFF";
        //ctx.fillRect( x - mWidth * 0.5, h0, mWidth, h0 + h);
        //ctx.beginPath();
        ctx.roundRect(x - mWidth * 0.5, h0, mWidth,  h);
        ctx.fill();
        if(this.hovering == name) {
            ctx.globalAlpha = 0.2;
            // ctx.fillRect( x - mWidth * 0.5 - 2, h0, mWidth + 2, h0 + h);
            //ctx.beginPath();
            ctx.roundRect( x - mWidth * 0.5 - 2, h0, mWidth + 4,  h);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        
        // Current time text
        if(name == 'current' ) {
            h0 -= this.offsetHeight + 4;
            ctx.globalAlpha = 1;
            // ctx.beginPath();
            // ctx.moveTo(x, h0);
            // ctx.lineTo(x, h0 + h);
            // ctx.stroke();

            ctx.fillStyle = options.fillColor || '#e5e5e5';
            ctx.beginPath();
            ctx.moveTo(x - 8, h0 - 1);
            ctx.lineTo(x + 8, h0 - 1);
            ctx.lineTo(x, h0 + 10);
            ctx.fill();

            // ctx.fillStyle = '#e5e5e5';
            // ctx.beginPath();
            // ctx.moveTo(x - 6, h0);
            // ctx.lineTo(x + 6, h0);
            // ctx.lineTo(x, h0 + 8);
            // ctx.fill();

            let xPos = Math.max( Math.min( x - 17, this.width - 42), 5 );
            ctx.fillStyle = "rgba(200, 200, 200, 0.2)";
            ctx.lineWitdh = 0;
            ctx.roundRect(xPos - 5, h0 - 25, 47, 15);
            ctx.fill();
            ctx.fillStyle = "#e5e5e5";
            ctx.font = "bold 16px Calibri";
            ctx.fillText(String(time.toFixed(3)), xPos, h0 - 12);
        }
        else {
            ctx.strokeStyle = 'rgb(200, 200, 200)'
            ctx.beginPath();
            ctx.lineWitdh = 2;
            ctx.moveTo(x, h0 + 4);
            ctx.lineTo(x, h0 + h - 4);
            ctx.stroke();
        }
    }
    
    xToTime (x) {
        return (x / (this.width )) *  this.video.duration;
    }

    timeToX (time) {
        return (time / this.editor.video.duration) *  (this.width );
    }
}

/**
 * @class VideoEditor
 */

class VideoEditor {

    constructor( area, options = {} ) {

        this.area = area;
        area.root.classList.add("lexvideoeditor");

        let video = this.video = document.createElement( 'video' );
        this.video.src = options.src ?? '';
        this.loadVideo(options);

        this.startTime = 0;

        let [upArea, bottomArea] = area.split({ type: 'vertical', sizes:["80%", null], minimizable: false, resize: false });
        
        upArea.attach(video);

        this.controlsPanel = new LX.Panel({className: 'lexcontrolspanel'});        
        this.controlsPanel.addButton('', '<i class="fa-solid fa-play"></>', null, { width: '40px'});

       
        bottomArea.attach(this.controlsPanel);
    }

    async loadVideo( ) {
        while(this.video.duration === Infinity || isNaN(this.video.duration)) {
            await new Promise(r => setTimeout(r, 1000));
            this.video.currentTime = 10000000 * Math.random();
            this.endTime = this.video.duration;
            this.createTimeBar();
        }
    }

    createTimeBar( ) {
        let timebar = new TimeBar(this, TimeBar.TIMEBAR_TRIM);
        this.controlsPanel.attach(timebar);
    }
}

LX.VideoEditor = VideoEditor;

export { VideoEditor }