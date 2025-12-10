// VideoEditor.ts @evallsg

import { LX } from '../core/Namespace';

if ( !LX )
{
    throw ( 'Missing LX namespace!' );
}

LX.extensions.push( 'VideoEditor' );

const g = globalThis as any;
const vec2 = LX.vec2;
const Area = LX.Area;
const Panel = LX.Panel;

/**
 * @class TimeBar
 */

export class TimeBar
{
    static TIMEBAR_PLAY = 1;
    static TIMEBAR_TRIM = 2;

    static BACKGROUND_COLOR = LX.getThemeColor( 'global-branch-darker' );
    static COLOR = LX.getThemeColor( 'global-button-color' );
    static ACTIVE_COLOR = '#668ee4';

    type: number = TimeBar.TIMEBAR_PLAY;
    duration: number = 1.0;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D | null;

    markerWidth: number = 8;
    markerHeight: number;
    offset: number;
    lineWidth: number;
    lineHeight: number;
    position: typeof vec2;
    startX: number;
    endX: number;
    currentX: number;
    hovering: string | undefined;
    dragging: string | undefined;

    onChangeCurrent: any;
    onChangeStart: any;
    onChangeEnd: any;
    onDraw: any;
    onMouse: any;

    constructor( area: typeof Area, type?: number, options: any = {} )
    {
        this.type = type ?? TimeBar.TIMEBAR_PLAY;
        this.duration = options.duration ?? this.duration;

        // Create canvas
        this.canvas = document.createElement( 'canvas' );
        this.canvas.width = area.size[0];
        this.canvas.height = area.size[1];
        area.attach( this.canvas );

        this.ctx = this.canvas.getContext( '2d' );

        this.markerWidth = options.markerWidth ?? this.markerWidth;
        this.markerHeight = options.markerHeight ?? ( this.canvas.height * 0.5 );
        this.offset = options.offset || ( this.markerWidth * 0.5 + 5 );

        // dimensions of line (not canvas)
        this.lineWidth = this.canvas.width - this.offset * 2;
        this.lineHeight = options.barHeight ?? 5;

        this.position = new vec2( this.offset, this.canvas.height * 0.5 - this.lineHeight * 0.5 );
        this.startX = this.position.x;
        this.endX = this.position.x + this.lineWidth;
        this.currentX = this.startX;

        this._draw();

        this.updateTheme();
        LX.addSignal( '@on_new_color_scheme', () => {
            // Retrieve again the color using LX.getThemeColor, which checks the applied theme
            this.updateTheme();
        } );

        this.canvas.onmousedown = ( e: MouseEvent ) => this.onMouseDown( e );
        this.canvas.onmousemove = ( e: MouseEvent ) => this.onMouseMove( e );
        this.canvas.onmouseup = ( e: MouseEvent ) => this.onMouseUp( e );
    }

    updateTheme()
    {
        TimeBar.BACKGROUND_COLOR = LX.getThemeColor( 'global-color-secondary' );
        TimeBar.COLOR = LX.getThemeColor( 'global-color-quaternary' );
        TimeBar.ACTIVE_COLOR = '#668ee4';
    }

    setDuration( duration: number )
    {
        this.duration = duration;
    }

    xToTime( x: number )
    {
        return ( ( x - this.offset ) / ( this.lineWidth ) ) * this.duration;
    }

    timeToX( time: number )
    {
        return ( time / this.duration ) * ( this.lineWidth ) + this.offset;
    }

    setCurrentTime( time: number )
    {
        this.currentX = this.timeToX( time );
        this.onSetCurrentValue( this.currentX );
    }

    setStartTime( time: number )
    {
        this.startX = this.timeToX( time );
        this.onSetStartValue( this.startX );
    }

    setEndTime( time: number )
    {
        this.endX = this.timeToX( time );
        this.onSetEndValue( this.endX );
    }

    onSetCurrentValue( x: number )
    {
        this.update( x );

        const t = this.xToTime( x );
        if ( this.onChangeCurrent )
        {
            this.onChangeCurrent( t );
        }
    }

    onSetStartValue( x: number )
    {
        this.update( x );

        const t = this.xToTime( x );
        if ( this.onChangeStart )
        {
            this.onChangeStart( t );
        }
    }

    onSetEndValue( x: number )
    {
        this.update( x );

        const t = this.xToTime( x );
        if ( this.onChangeEnd )
        {
            this.onChangeEnd( t );
        }
    }

    _draw()
    {
        const ctx = this.ctx;
        if ( !ctx ) return;

        ctx.save();
        ctx.fillStyle = TimeBar.BACKGROUND_COLOR;
        ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );
        ctx.fillRect( 0, 0, this.canvas.width, this.canvas.height );

        // Draw background timeline
        ctx.fillStyle = TimeBar.COLOR;
        ctx.fillRect( this.position.x, this.position.y, this.lineWidth, this.lineHeight );

        // Draw background trimed timeline
        ctx.fillStyle = TimeBar.ACTIVE_COLOR;
        ctx.fillRect( this.startX, this.position.y, this.endX - this.startX, this.lineHeight );

        ctx.restore();

        // Min-Max time markers
        this._drawTrimMarker( 'start', this.startX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9' } );
        this._drawTrimMarker( 'end', this.endX, { color: null, fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9' } );
        this._drawTimeMarker( 'current', this.currentX, { color: '#e5e5e5',
            fillColor: TimeBar.ACTIVE_COLOR || '#5f88c9', width: this.markerWidth } );

        if ( this.onDraw )
        {
            this.onDraw();
        }
    }

    _drawTrimMarker( name: string, x: number, options: any = {} )
    {
        const w = this.markerWidth;
        const h = this.markerHeight;
        const y = this.canvas.height * 0.5 - h * 0.5;
        const ctx = this.ctx;
        if ( !ctx ) return;

        // Shadow
        if ( this.hovering == name )
        {
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 2;
        }

        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111'; // "#FFF";

        ctx.beginPath();
        ctx.roundRect( x - w * 0.5, y, w, h, 2 );
        ctx.fill();
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111'; // "#FFF";

        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo( x, y + 4 );
        ctx.lineTo( x, y + h - 4 );
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    _drawTimeMarker( name: string, x: number, options: any = {} )
    {
        let y = this.offset;
        const w = options.width ? options.width : ( this.dragging == name ? 6 : 4 );
        const h = this.canvas.height - this.offset * 2;

        let ctx = this.ctx;
        if ( !ctx ) return;

        ctx.globalAlpha = 1;
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111'; // "#FFF";

        // Shadow
        if ( this.hovering == name )
        {
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 2;
        }

        // Current time line
        ctx.fillStyle = ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo( x, y );
        ctx.lineTo( x, y + h * 0.5 );
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = ctx.strokeStyle = options.fillColor || '#111'; // "#FFF";

        y -= this.offset + 8;
        // Current time ball grab
        ctx.fillStyle = options.fillColor || '#e5e5e5';
        ctx.beginPath();
        ctx.roundRect( x - w * 0.5, y + this.offset, w, w, 5 );

        ctx.fill();
        ctx.shadowBlur = 0;
    }

    update( x: number )
    {
        this.currentX = Math.min( Math.max( this.startX, x ), this.endX );
        this._draw();
    }

    onMouseDown( e: MouseEvent )
    {
        if ( this.onMouse )
        {
            this.onMouse( e );
        }

        e.preventDefault();

        if ( !this.canvas || e.target != this.canvas || e.cancelBubble )
        {
            return;
        }

        const canvas = this.canvas;

        // Process mouse
        const x = e.offsetX;
        const y = e.offsetY;

        // Check if some marker is clicked
        const threshold = this.markerWidth;

        // grab trim markers only from the bottom
        if ( Math.abs( this.startX - x ) < threshold && this.position.y < y )
        {
            this.dragging = 'start';
            canvas.style.cursor = 'grabbing';
        }
        else if ( Math.abs( this.endX - x ) < threshold && this.position.y < y )
        {
            this.dragging = 'end';
            canvas.style.cursor = 'grabbing';
        }
        else
        {
            this.dragging = 'current';
            canvas.style.cursor = 'grabbing';

            if ( x < this.startX )
            {
                this.currentX = this.startX;
            }
            else if ( x > this.endX )
            {
                this.currentX = this.endX;
            }
            else
            {
                this.currentX = x;
            }

            this.onSetCurrentValue( this.currentX );
        }

        this._draw();
    }

    onMouseUp( e: MouseEvent )
    {
        if ( this.onMouse )
        {
            this.onMouse( e );
        }

        e.preventDefault();

        delete this.dragging;
        delete this.hovering;

        if ( !this.canvas || e.cancelBubble )
        {
            return;
        }

        const canvas = this.canvas;
        canvas.style.cursor = 'default';
    }

    onMouseMove( e: MouseEvent )
    {
        if ( this.onMouse )
        {
            this.onMouse( e );
        }

        if ( !this.canvas || e.cancelBubble )
        {
            return;
        }

        e.preventDefault();

        const canvas = this.canvas;

        // Process mouse
        const x = e.target == canvas ? e.offsetX : e.clientX - canvas.offsetLeft;
        const y = e.target == canvas ? e.offsetY : e.clientY - canvas.offsetTop;

        if ( this.dragging )
        {
            switch ( this.dragging )
            {
                case 'start':
                    this.startX = Math.max( this.position.x, Math.min( this.endX, x ) );
                    this.currentX = this.startX;
                    this.onSetStartValue( this.startX );
                    break;
                case 'end':
                    this.endX = Math.max( this.startX, Math.min( this.position.x + this.lineWidth, x ) );
                    this.currentX = this.endX;
                    this.onSetEndValue( this.endX );
                    break;
                default:
                    this.currentX = Math.max( this.startX, Math.min( this.endX, x ) );
                    break;
            }

            this.onSetCurrentValue( this.currentX );
        }
        else
        {
            const threshold = this.markerWidth * 0.5;

            if ( Math.abs( this.startX - x ) < threshold )
            {
                this.hovering = 'start';
                canvas.style.cursor = 'grab';
            }
            else if ( Math.abs( this.endX - x ) < threshold )
            {
                this.hovering = 'end';
                canvas.style.cursor = 'grab';
            }
            else if ( Math.abs( this.currentX - x ) < threshold )
            {
                this.hovering = 'current';
                canvas.style.cursor = 'grab';
            }
            else
            {
                delete this.hovering;
                canvas.style.cursor = 'default';
            }
        }

        this._draw();
    }

    resize( size: number[] )
    {
        this.canvas.width = Math.max( 0, size[0] );
        this.canvas.height = Math.max( 0, size[1] );

        let newWidth = size[0] - this.offset * 2;
        newWidth = newWidth < 0.00001 ? 0.00001 : newWidth; // actual width of the line = canvas.width - offsetleft - offsetRight
        const startRatio = ( this.startX - this.offset ) / this.lineWidth;
        const currentRatio = ( this.currentX - this.offset ) / this.lineWidth;
        const endRatio = ( this.endX - this.offset ) / this.lineWidth;

        this.lineWidth = newWidth;
        this.startX = Math.min( Math.max( newWidth * startRatio, 0 ), newWidth ) + this.offset;
        this.currentX = Math.min( Math.max( newWidth * currentRatio, 0 ), newWidth ) + this.offset;
        this.endX = Math.min( Math.max( newWidth * endRatio, 0 ), newWidth ) + this.offset;

        this._draw();
    }
}

LX.TimeBar = TimeBar;

/**
 * @class VideoEditor
 */

export class VideoEditor
{
    static CROP_HANDLE_L: number = 0x01;
    static CROP_HANDLE_R: number = 0x02;
    static CROP_HANDLE_T: number = 0x04;
    static CROP_HANDLE_B: number = 0x08;
    static CROP_HANDLE_TL: number = VideoEditor.CROP_HANDLE_L | VideoEditor.CROP_HANDLE_T;
    static CROP_HANDLE_BL: number = VideoEditor.CROP_HANDLE_L | VideoEditor.CROP_HANDLE_B;
    static CROP_HANDLE_TR: number = VideoEditor.CROP_HANDLE_R | VideoEditor.CROP_HANDLE_T;
    static CROP_HANDLE_BR: number = VideoEditor.CROP_HANDLE_R | VideoEditor.CROP_HANDLE_B;

    options: any = {};
    playing: boolean = false;
    videoReady: boolean = false;
    controls: boolean = true;
    startTimeString: string = '0:0';
    endTimeString: string = '0:0';
    speed: number = 1.0;
    currentTime: number = 0.0;
    startTime: number = 0.0;
    endTime: number = 0.0;
    requestId: any;
    video: HTMLVideoElement;
    loop: boolean = false;
    isDragging: boolean = false;
    isResizing: any = null; // holds the HTMLElement of the crop handle, if resizing
    crop: boolean = false;
    dragOffsetX: number = 0.0;
    dragOffsetY: number = 0.0;
    currentTimeString: string = '';

    timebar: TimeBar;
    mainArea: typeof Area;
    cropArea: any; // HTMLElement with normCoord attribute;
    controlsArea: typeof Area;
    controlsPanelLeft: typeof Panel;
    controlsPanelRight: typeof Panel;
    controlsCurrentPanel: typeof Panel;

    onChangeCurrent: any;
    onChangeStart: any;
    onChangeEnd: any;
    onKeyUp: any;
    onSetTime: any;
    onVideoLoaded: any;
    onCropArea: any;
    onResize: any;
    onChangeSpeed: any;

    _updateTime: boolean = true;
    _onCropMouseUp: ( e: MouseEvent ) => void;
    _onCropMouseMove: ( e: MouseEvent ) => void;
    resize: () => void;

    constructor( area: typeof Area, options: any = {} )
    {
        this.options = options ?? {};
        this.speed = options.speed ?? this.speed;
        this.mainArea = area;

        let videoArea = null;
        let controlsArea = null;

        if ( options.controlsArea )
        {
            videoArea = area;
            controlsArea = options.controlsArea;
        }
        else
        {
            [ videoArea, controlsArea ] = area.split( { type: 'vertical', sizes: [ '85%', null ], minimizable: false,
                resize: false } );
        }

        controlsArea.root.classList.add( 'lexconstrolsarea' );

        this.cropArea = document.createElement( 'div' );
        this.cropArea.id = 'cropArea';
        this.cropArea.className = 'resize-area hidden';
        this.cropArea.normCoords = { x: 0, y: 0, w: 1, h: 1 };

        const flags = 0x0f;
        this.setCropAreaHandles( flags );

        this.crop = options.crop;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        // Create video element and load it
        let video = this.video = options.video ?? document.createElement( 'video' );
        this.loop = options.loop ?? this.loop;

        if ( options.src )
        {
            this.video.src = options.src;
            this.loadVideo( options );
        }

        if ( options.videoArea )
        {
            options.videoArea.root.classList.add( 'lexvideoeditor' );
            options.videoArea.attach( this.cropArea );
            videoArea.attach( options.videoArea );
        }
        else
        {
            videoArea.attach( video );
            videoArea.attach( this.cropArea );
            videoArea.root.classList.add( 'lexvideoeditor' );
        }

        this.controlsArea = controlsArea;
        // Create playing timeline area and attach panels
        let [ topArea, bottomArea ] = controlsArea.split( { type: 'vertical', sizes: [ '50%', null ],
            minimizable: false, resize: false } );
        bottomArea.setSize( [ bottomArea.size[0], 40 ] );
        let [ leftArea, controlsRight ] = bottomArea.split( { type: 'horizontal', sizes: [ '92%', null ],
            minimizable: false, resize: false } );
        let [ controlsLeft, timeBarArea ] = leftArea.split( { type: 'horizontal', sizes: [ '10%', null ],
            minimizable: false, resize: false } );

        topArea.root.classList.add( 'lexbar' );
        bottomArea.root.classList.add( 'lexbar' );
        this.controlsCurrentPanel = new LX.Panel( { className: 'lexcontrolspanel lextime' } );
        this.controlsCurrentPanel.refresh = () => {
            this.controlsCurrentPanel.clear();
            this.controlsCurrentPanel.addLabel( this.currentTimeString, { float: 'center' } );
        };
        topArea.root.classList.add( 'lexflexarea' );
        topArea.attach( this.controlsCurrentPanel );
        this.controlsCurrentPanel.refresh();

        const style = getComputedStyle( bottomArea.root );
        let padding = Number( style.getPropertyValue( 'padding' ).replace( 'px', '' ) );
        this.timebar = new TimeBar( timeBarArea, TimeBar.TIMEBAR_TRIM, { offset: padding } );

        // Create controls panel (play/pause button and start time)
        this.controlsPanelLeft = new LX.Panel( { className: 'lexcontrolspanel' } );
        this.controlsPanelLeft.refresh = () => {
            this.controlsPanelLeft.clear();
            this.controlsPanelLeft.sameLine();
            let playbtn = this.controlsPanelLeft.addButton( 'Play', '', ( v: boolean ) => {
                this.playing = v;
                if ( this.playing )
                {
                    if ( this.video.currentTime + 0.000001 >= this.endTime )
                    {
                        this.video.currentTime = this.startTime;
                    }
                    this.video.play();
                }
                else
                {
                    this.video.pause();
                }
            }, { width: '40px', icon: 'Play@solid', swap: 'Pause@solid', hideName: true,
                className: 'justify-center' } );
            playbtn.setState( this.playing, true );

            this.controlsPanelLeft.addButton( '', '', ( v: any, e: MouseEvent ) => {
                const panel = new LX.Panel();
                panel.addRange( 'Speed', this.speed, ( v: number ) => {
                    this.speed = v;
                    this.video.playbackRate = v;
                    if ( this.onChangeSpeed )
                    {
                        this.onChangeSpeed( v );
                    }
                }, { min: 0, max: 2.5, step: 0.01, hideName: true } );

                new LX.Popover( e.target, [ panel ], { align: 'start', side: 'top', sideOffset: 12 } );
            }, { width: '40px', title: 'speed', icon: 'Timer@solid', className: 'justify-center' } );

            this.controlsPanelLeft.addButton( '', 'Loop', ( v: boolean ) => {
                this.loop = v;
            }, { width: '40px', title: 'loop', icon: ( 'Repeat@solid' ), className: `justify-center`, selectable: true,
                selected: this.loop } );

            this.controlsPanelLeft.addLabel( this.startTimeString, { width: '100px' } );
            this.controlsPanelLeft.endLine();

            let availableWidth = leftArea.root.clientWidth - controlsLeft.root.clientWidth;
            this.timebar.resize( [ availableWidth, timeBarArea.root.clientHeight ] );
        };

        this.controlsPanelLeft.refresh();
        controlsLeft.root.style.minWidth = 'fit-content';
        // controlsLeft.root.classList.add();
        controlsLeft.attach( this.controlsPanelLeft );

        // Create right controls panel (ens time)
        this.controlsPanelRight = new LX.Panel( { className: 'lexcontrolspanel' } );
        this.controlsPanelRight.refresh = () => {
            this.controlsPanelRight.clear();
            this.controlsPanelRight.addLabel( this.endTimeString, { width: 100 } );
        };
        this.controlsPanelRight.refresh();
        controlsRight.root.style.minWidth = 'fit-content';
        controlsRight.attach( this.controlsPanelRight );

        this.timebar.onChangeCurrent = this._setCurrentTime.bind( this );
        this.timebar.onChangeStart = this._setStartTime.bind( this );
        this.timebar.onChangeEnd = this._setEndTime.bind( this );

        this.resize = () => {
            bottomArea.setSize( [ this.controlsArea.root.clientWidth, 40 ] );
            let availableWidth = this.controlsArea.root.clientWidth - controlsLeft.root.clientWidth
                - controlsRight.root.clientWidth;
            this.timebar.resize( [ availableWidth, timeBarArea.root.clientHeight ] );
            this.moveCropArea( this.cropArea.normCoords.x, this.cropArea.normCoords.y, true );
            this.resizeCropArea( this.cropArea.normCoords.w, this.cropArea.normCoords.h, true );

            if ( this.onResize )
            {
                this.onResize( [ videoArea.root.clientWidth, videoArea.root.clientHeight ] );
            }
        };
        area.onresize = this.resize.bind( this );
        window.addEventListener( 'resize', area.onresize );

        this.onKeyUp = ( e: KeyboardEvent ) => {
            if ( this.controls && e.key == ' ' )
            {
                e.preventDefault();
                e.stopPropagation();

                this.playing = !this.playing;
                if ( this.playing )
                {
                    if ( this.video.currentTime + 0.000001 >= this.endTime )
                    {
                        this.video.currentTime = this.startTime;
                    }
                    this.video.play();
                }
                else
                {
                    this.video.pause();
                }

                this.controlsPanelLeft.refresh();
            }
        };

        window.addEventListener( 'keyup', this.onKeyUp );

        const parent = controlsArea.parentElement ? controlsArea.parentElement : controlsArea.root.parentElement;

        // Add canvas event listeneres
        parent.addEventListener( 'mousedown', ( e: MouseEvent ) => {
            // if( this.controls) {
            //     this.timebar.onMouseDown(e);
            // }
        } );

        this._onCropMouseUp = ( event: MouseEvent ) => {
            // if(this.controls) {
            //     this.timebar.onMouseUp(event);
            // }
            event.preventDefault();
            event.stopPropagation();
            if ( ( this.isDragging || this.isResizing ) && this.onCropArea )
            {
                this.onCropArea( this.getCroppedArea() );
            }
            this.isDragging = false;
            this.isResizing = false;

            document.removeEventListener( 'mouseup', this._onCropMouseUp ); // self destroy. Added during mouseDown on cropArea and handles
            document.removeEventListener( 'mousemove', this._onCropMouseMove ); // self destroy. Added during mouseDown on cropArea and handles
        };

        this._onCropMouseMove = ( event: MouseEvent ) => {
            // if(this.controls) {
            //     this.timebar.onMouseMove(event);
            // }
            window.getSelection()?.removeAllRanges();
            event.preventDefault();
            event.stopPropagation();

            if ( this.isResizing )
            {
                const rectCrop = this.cropArea.getBoundingClientRect();
                const rectVideo = this.video.getBoundingClientRect();
                const mov = this.isResizing.movement;

                let x = rectCrop.left, y = rectCrop.top, w = rectCrop.width, h = rectCrop.height;

                if ( mov & VideoEditor.CROP_HANDLE_L )
                {
                    let mouseX = Math.min( rectCrop.right - 4, Math.max( rectVideo.left, event.clientX ) ); // -4 because of border
                    w = rectCrop.left + rectCrop.width - mouseX;
                    x = mouseX;
                    if ( mouseX < rectCrop.left )
                    {
                        this.moveCropArea( x, y, false );
                        this.resizeCropArea( w, h, false );
                    }
                    else
                    {
                        this.resizeCropArea( w, h, false );
                        this.moveCropArea( x, y, false );
                    }
                }

                if ( mov & VideoEditor.CROP_HANDLE_R )
                {
                    w = event.clientX - rectCrop.left;
                    this.resizeCropArea( w, h, false );
                }

                if ( mov & VideoEditor.CROP_HANDLE_T )
                {
                    const mouseY = Math.min( rectCrop.bottom - 4, Math.max( rectVideo.top, event.clientY ) );
                    h = rectCrop.top + rectCrop.height - mouseY;
                    y = mouseY;

                    if ( mouseY < rectCrop.top )
                    {
                        this.moveCropArea( x, y, false );
                        this.resizeCropArea( w, h, false );
                    }
                    else
                    {
                        this.resizeCropArea( w, h, false );
                        this.moveCropArea( x, y, false );
                    }
                }

                if ( mov & VideoEditor.CROP_HANDLE_B )
                {
                    h = event.clientY - rectCrop.top;
                    this.resizeCropArea( w, h, false );
                }
            }

            if ( this.isDragging )
            {
                this.moveCropArea( event.clientX - this.dragOffsetX, event.clientY - this.dragOffsetY, false );
            }
        };

        this.cropArea.addEventListener( 'mousedown', ( e: MouseEvent ) => {
            if ( e.target === this.cropArea )
            {
                const rect = this.cropArea.getBoundingClientRect();
                this.isDragging = true;

                this.dragOffsetX = e.clientX - rect.left;
                this.dragOffsetY = e.clientY - rect.top;

                document.addEventListener( 'mouseup', this._onCropMouseUp );
                document.addEventListener( 'mousemove', this._onCropMouseMove );
            }
        } );

        this.onChangeStart = null;
        this.onChangeEnd = null;
    }

    setCropAreaHandles( flags: number )
    {
        // remove existing resizer handles
        const resizers = this.cropArea.getElementsByClassName( 'resize-handle' );
        for ( let i = resizers.length - 1; i > -1; --i )
        {
            resizers[i].remove();
        }

        const buildResizer = ( className: string, movement: number ) => {
            const handle: any = document.createElement( 'div' );
            handle.className = ' resize-handle ' + className;
            handle.movement = movement;
            if ( this.options.handleStyle )
            {
                Object.assign( handle.style, this.options.handleStyle );
            }
            this.cropArea.append( handle );
            handle.addEventListener( 'mousedown', ( e: MouseEvent ) => {
                e.stopPropagation();
                e.preventDefault();
                this.isResizing = handle;

                document.addEventListener( 'mouseup', this._onCropMouseUp );
                document.addEventListener( 'mousemove', this._onCropMouseMove );
            } );
        };

        if ( flags & VideoEditor.CROP_HANDLE_L ) buildResizer( 'l', VideoEditor.CROP_HANDLE_L );
        if ( flags & VideoEditor.CROP_HANDLE_R ) buildResizer( 'r', VideoEditor.CROP_HANDLE_R );
        if ( flags & VideoEditor.CROP_HANDLE_T ) buildResizer( 't', VideoEditor.CROP_HANDLE_T );
        if ( flags & VideoEditor.CROP_HANDLE_B ) buildResizer( 'b', VideoEditor.CROP_HANDLE_B );
        if ( ( flags & VideoEditor.CROP_HANDLE_TL ) == VideoEditor.CROP_HANDLE_TL )
        {
            buildResizer( 'tl', VideoEditor.CROP_HANDLE_TL );
        }
        if ( ( flags & VideoEditor.CROP_HANDLE_BL ) == VideoEditor.CROP_HANDLE_BL )
        {
            buildResizer( 'bl', VideoEditor.CROP_HANDLE_BL );
        }
        if ( ( flags & VideoEditor.CROP_HANDLE_TR ) == VideoEditor.CROP_HANDLE_TR )
        {
            buildResizer( 'tr', VideoEditor.CROP_HANDLE_TR );
        }
        if ( ( flags & VideoEditor.CROP_HANDLE_BR ) == VideoEditor.CROP_HANDLE_BR )
        {
            buildResizer( 'br', VideoEditor.CROP_HANDLE_BR );
        }
    }

    resizeCropArea( sx: number, sy: number, isNormalized: boolean = true )
    {
        const rectVideo = this.video.getBoundingClientRect();

        if ( !isNormalized )
        {
            sx = ( rectVideo.width ) ? ( sx / rectVideo.width ) : 1;
            sy = ( rectVideo.height ) ? ( sy / rectVideo.height ) : 1;
        }

        sx = Math.min( 1 - this.cropArea.normCoords.x, Math.max( 0, sx ) );
        sy = Math.min( 1 - this.cropArea.normCoords.y, Math.max( 0, sy ) );

        this.cropArea.normCoords.w = sx;
        this.cropArea.normCoords.h = sy;

        const widthPx = rectVideo.width * sx;
        const heightPx = rectVideo.height * sy;
        const xPx = rectVideo.width * this.cropArea.normCoords.x + rectVideo.left;
        const yPx = rectVideo.height * this.cropArea.normCoords.y + rectVideo.top;

        if ( !this.cropArea.classList.contains( 'hidden' ) )
        {
            const nodes = this.cropArea.parentElement.childNodes;
            for ( let i = 0; i < nodes.length; i++ )
            {
                if ( nodes[i] != this.cropArea )
                {
                    const rectEl = nodes[i].getBoundingClientRect();
                    nodes[i].style.webkitMask = `linear-gradient(#000 0 0) ${xPx - rectEl.left}px ${
                        yPx - rectEl.top
                    }px / ${widthPx}px ${heightPx}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
                    nodes[i].style.webkitMaskRepeat = 'no-repeat';
                }
            }
        }

        this.cropArea.style.width = widthPx + 'px';
        this.cropArea.style.height = heightPx + 'px';
    }

    // screen pixel (event.clientX) or video normalized (0 is top left of video, 1 bot right)
    moveCropArea( x: number, y: number, isNormalized: boolean = true )
    {
        const rectVideo = this.video.getBoundingClientRect();

        if ( !isNormalized )
        {
            x = ( rectVideo.width ) ? ( ( x - rectVideo.left ) / rectVideo.width ) : 0;
            y = ( rectVideo.height ) ? ( ( y - rectVideo.top ) / rectVideo.height ) : 0;
        }

        x = Math.max( 0, Math.min( 1 - this.cropArea.normCoords.w, x ) );
        y = Math.max( 0, Math.min( 1 - this.cropArea.normCoords.h, y ) );

        this.cropArea.normCoords.x = x;
        this.cropArea.normCoords.y = y;

        const xPx = rectVideo.width * x + rectVideo.left;
        const yPx = rectVideo.height * y + rectVideo.top;
        const widthPx = rectVideo.width * this.cropArea.normCoords.w;
        const heightPx = rectVideo.height * this.cropArea.normCoords.h;

        if ( !this.cropArea.classList.contains( 'hidden' ) )
        {
            const nodes = this.cropArea.parentElement.childNodes;
            for ( let i = 0; i < nodes.length; i++ )
            {
                if ( nodes[i] != this.cropArea )
                {
                    const rectEl = nodes[i].getBoundingClientRect();
                    nodes[i].style.webkitMask = `linear-gradient(#000 0 0) ${xPx - rectEl.left}px ${
                        yPx - rectEl.top
                    }px / ${widthPx}px ${heightPx}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
                    nodes[i].style.webkitMaskRepeat = 'no-repeat';
                }
            }
        }

        const rectParent = this.cropArea.parentElement.getBoundingClientRect();
        this.cropArea.style.left = xPx - rectParent.left + 'px';
        this.cropArea.style.top = yPx - rectParent.top + 'px';
    }

    async loadVideo( options: any = {} )
    {
        this.videoReady = false;

        while ( this.video.duration === Infinity || isNaN( this.video.duration ) || !this.timebar )
        {
            await new Promise( r => setTimeout( r, 1000 ) );
            this.video.currentTime = 10000000 * Math.random();
        }

        this.video.currentTime = 0.01; // BUG: some videos will not play unless this line is present

        // Duration can change if the video is dynamic (stream). This function is to ensure to load all buffer data
        const forceLoadChunks = () => {
            const state = this.videoReady;
            if ( this.video.readyState > 3 )
            {
                this.videoReady = true;
            }
            if ( !state )
            {
                this.video.currentTime = this.video.duration;
            }
        };

        this.video.addEventListener( 'canplaythrough', forceLoadChunks, { passive: true } );

        this.video.ondurationchange = ( v ) => {
            if ( this.video.duration != this.endTime )
            {
                this.video.currentTime = this.startTime;
                console.log( 'duration changed from', this.endTime, ' to ', this.video.duration );
                this.endTime = this.video.duration;
                this.timebar.setDuration( this.endTime );
                this.timebar.setEndTime( this.endTime );
            }
            this.video.currentTime = this.startTime;
            this.timebar.setCurrentTime( this.video.currentTime );
        };

        this.timebar.startX = this.timebar.position.x;
        this.timebar.endX = this.timebar.position.x + this.timebar.lineWidth;
        this.startTime = 0;
        this.endTime = this.video.duration;
        this.timebar.setDuration( this.endTime );
        this.timebar.setEndTime( this.video.duration );
        this.timebar.setStartTime( this.startTime );
        this.timebar.setCurrentTime( this.startTime );
        // this.timebar.setStartValue( this.timebar.startX);
        // this.timebar.currentX = this._timeToX( this.video.currentTime);
        // this.timebar.setCurrentValue( this.timebar.currentX);
        // this.timebar.update( this.timebar.currentX );

        // only have one update on flight
        if ( !this.requestId )
        {
            this._update();
        }

        this.controls = options.controls ?? true;

        if ( !this.controls )
        {
            this.hideControls();
        }

        this.cropArea.style.height = this.video.clientHeight + 'px';
        this.cropArea.style.width = this.video.clientWidth + 'px';
        this.moveCropArea( 0, 0, true );
        this.resizeCropArea( 1, 1, true );

        if ( this.crop )
        {
            this.showCropArea();
        }
        else
        {
            this.hideCropArea();
        }

        window.addEventListener( 'keyup', this.onKeyUp );

        if ( this.onVideoLoaded )
        {
            this.onVideoLoaded( this.video );
        }
    }

    _update()
    {
        // if( this.onDraw ) {
        //     this.onDraw();
        // }
        if ( this.playing )
        {
            if ( this.video.currentTime + 0.000001 >= this.endTime )
            {
                this.video.pause();

                if ( !this.loop )
                {
                    this.playing = false;
                    this.controlsPanelLeft.refresh();
                }
                else
                {
                    this.video.currentTime = this.startTime;
                    this.video.play();
                }
            }

            this._updateTime = false;
            this.timebar.setCurrentTime( this.video.currentTime );
            this._updateTime = true;
        }

        this.requestId = requestAnimationFrame( this._update.bind( this ) );
    }

    timeToString( t: number )
    {
        let mzminutes = Math.floor( t / 60 );
        let mzseconds = Math.floor( t - ( mzminutes * 60 ) );
        let mzmiliseconds = Math.floor( ( t - mzseconds ) * 100 );

        let mzmilisecondsStr: string = mzmiliseconds < 10 ? ( '0' + mzmiliseconds ) : mzmiliseconds.toString();
        let mzsecondsStr: string = mzseconds < 10 ? ( '0' + mzseconds ) : mzseconds.toString();
        let mzminutesStr: string = mzminutes < 10 ? ( '0' + mzminutes ) : mzminutes.toString();
        return `${mzminutesStr}:${mzsecondsStr}.${mzmilisecondsStr}`;
    }

    _setCurrentTime( t: number )
    {
        if ( this.video.currentTime != t && this._updateTime )
        {
            this.video.currentTime = t;
        }

        this.currentTimeString = this.timeToString( t );
        this.controlsCurrentPanel.refresh();

        if ( this.onSetTime )
        {
            this.onSetTime( t );
        }

        if ( this.onChangeCurrent )
        {
            this.onChangeCurrent( t );
        }
    }

    _setStartTime( t: number )
    {
        this.startTime = this.video.currentTime = t;

        this.startTimeString = this.timeToString( t );
        this.controlsPanelLeft.refresh();

        if ( this.onSetTime )
        {
            this.onSetTime( t );
        }

        if ( this.onChangeStart )
        {
            this.onChangeStart( t );
        }
    }

    _setEndTime( t: number )
    {
        this.endTime = this.video.currentTime = t;

        this.endTimeString = this.timeToString( t );
        this.controlsPanelRight.refresh();

        if ( this.onSetTime )
        {
            this.onSetTime( t );
        }

        if ( this.onChangeEnd )
        {
            this.onChangeEnd( t );
        }
    }

    getStartTime()
    {
        return this.startTime;
    }

    getEndTime()
    {
        return this.endTime;
    }

    getTrimedTimes()
    {
        return { start: this.startTime, end: this.endTime };
    }

    getCroppedArea()
    {
        return this.cropArea.getBoundingClientRect();
    }

    showCropArea()
    {
        this.cropArea.classList.remove( 'hidden' );

        const nodes = this.cropArea.parentElement?.childNodes ?? [];
        const rect = this.cropArea.getBoundingClientRect();
        for ( let i = 0; i < nodes.length; i++ )
        {
            const node: any = nodes[i];
            if ( node == this.cropArea ) continue;
            const rectEl = node.getBoundingClientRect();
            node.style.webkitMask = `linear-gradient(#000 0 0) ${rect.left - rectEl.left}px ${
                rect.top - rectEl.top
            }px / ${rect.width}px ${rect.height}px, linear-gradient(rgba(0, 0, 0, 0.3) 0 0)`;
            node.style.webkitMaskRepeat = 'no-repeat';
        }
    }

    hideCropArea()
    {
        this.cropArea.classList.add( 'hidden' );

        const nodes = this.cropArea.parentElement?.childNodes ?? [];
        for ( let i = 0; i < nodes.length; i++ )
        {
            const node: any = nodes[i];
            if ( node == this.cropArea ) continue;
            node.style.webkitMask = '';
            node.style.webkitMaskRepeat = 'no-repeat';
        }
    }

    showControls()
    {
        this.controls = true;
        this.controlsArea.show();
    }

    hideControls()
    {
        this.controls = false;
        this.controlsArea.hide();
    }

    stopUpdates()
    {
        if ( this.requestId )
        {
            cancelAnimationFrame( this.requestId );
            this.requestId = null;
        }
    }

    unbind()
    {
        this.stopUpdates();

        this.video.pause();
        this.playing = false;
        this.controlsPanelLeft.refresh();
        this.video.src = '';

        window.removeEventListener( 'keyup', this.onKeyUp );
        document.removeEventListener( 'mouseup', this._onCropMouseUp );
        document.removeEventListener( 'mousemove', this._onCropMouseMove );
    }
}

LX.VideoEditor = VideoEditor;
