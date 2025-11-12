// base_component.js @jxarco
import { LX } from './core.js';

function ADD_CUSTOM_COMPONENT( customComponentName, options = {} )
{
    let customIdx = LX.guidGenerator();

    LX.Panel.prototype[ 'add' + customComponentName ] = function( name, instance, callback )
    {
        const userParams = Array.from( arguments ).slice( 3 );

        let component = new BaseComponent( BaseComponent.CUSTOM, name, null, options );
        this._attachComponent( component );

        component.customName = customComponentName;
        component.customIdx = customIdx;

        component.onGetValue = () => {
            return instance;
        };

        component.onSetValue = ( newValue, skipCallback, event ) => {
            instance = newValue;
            _refreshComponent();
            element.querySelector( ".lexcustomitems" ).toggleAttribute( 'hidden', false );
            if( !skipCallback )
            {
                component._trigger( new LX.IEvent( name, instance, event ), callback );
            }
        };

        component.onResize = ( rect ) => {
            const realNameWidth = ( component.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const element = component.root;

        let container, customComponentsDom;
        let defaultInstance = options.default ?? {};

        // Add instance button

        const _refreshComponent = () => {

            if( container ) container.remove();
            if( customComponentsDom ) customComponentsDom.remove();

            container = document.createElement('div');
            container.className = "lexcustomcontainer w-full";
            element.appendChild( container );
            element.dataset["opened"] = false;

            const customIcon = LX.makeIcon( options.icon ?? "Box" );
            const menuIcon = LX.makeIcon( "Menu" );

            let buttonName = customComponentName + (!instance ? " [empty]" : "");
            let buttonEl = this.addButton(null, buttonName, (value, event) => {
                if( instance )
                {
                    element.querySelector(".lexcustomitems").toggleAttribute('hidden');
                    element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                }
                else
                {
                    LX.addContextMenu(null, event, c => {
                        c.add("New " + customComponentName, () => {
                            instance = {};
                            _refreshComponent();
                            element.querySelector(".lexcustomitems").toggleAttribute('hidden', false);
                            element.dataset["opened"] = !element.querySelector(".lexcustomitems").hasAttribute("hidden");
                        });
                    });
                }

            }, { buttonClass: 'custom' });

            const buttonSpan = buttonEl.root.querySelector( "span" );
            buttonSpan.prepend( customIcon );
            buttonSpan.appendChild( menuIcon );
            container.appendChild( buttonEl.root );

            if( instance )
            {
                menuIcon.addEventListener( "click", e => {
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                    LX.addContextMenu(null, e, c => {
                        c.add("Clear", () => {
                            instance = null;
                            _refreshComponent();
                        });
                    });
                });
            }

            // Show elements

            customComponentsDom = document.createElement('div');
            customComponentsDom.className = "lexcustomitems";
            customComponentsDom.toggleAttribute('hidden', true);
            element.appendChild( customComponentsDom );

            if( instance )
            {
                this.queue( customComponentsDom );

                const on_instance_changed = ( key, value, event ) => {
                    const setter = options[ `_set_${ key }` ];
                    if( setter )
                    {
                        setter.call( instance, value );
                    }
                    else
                    {
                        instance[ key ] = value;
                    }
                    component._trigger( new LX.IEvent( name, instance, event ), callback );
                };

                for( let key in defaultInstance )
                {
                    let value = null;

                    const getter = options[ `_get_${ key }` ];
                    if( getter )
                    {
                        value = instance[ key ] ? getter.call( instance ) : getter.call( defaultInstance );
                    }
                    else
                    {
                        value = instance[ key ] ?? defaultInstance[ key ];
                    }

                    if( !value )
                    {
                        continue;
                    }

                    switch( value.constructor )
                    {
                        case String:
                            if( value[ 0 ] === '#' )
                            {
                                this.addColor( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this.addText( key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        case Number:
                            this.addNumber( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Boolean:
                            this.addCheckbox( key, value, on_instance_changed.bind( this, key ) );
                            break;
                        case Array:
                            if( value.length > 4 )
                            {
                                this.addArray( key, value, on_instance_changed.bind( this, key ) );
                            }
                            else
                            {
                                this._addVector( value.length, key, value, on_instance_changed.bind( this, key ) );
                            }
                            break;
                        default:
                            console.warn( `Unsupported property type: ${ value.constructor.name }` )
                            break;
                    }
                }

                if( options.onCreate )
                {
                    options.onCreate.call( this, this, ...userParams );
                }

                this.clearQueue();
            }
        };

        _refreshComponent();
    };
}

LX.ADD_CUSTOM_COMPONENT = ADD_CUSTOM_COMPONENT;

/**
 * @class Blank
 * @description Blank Component
 */

class Blank extends BaseComponent
{
    constructor( width, height )
    {
        super( BaseComponent.BLANK );

        this.root.style.width = width ?? "auto";
        this.root.style.height = height ?? "8px";
    }
}

LX.Blank = Blank;

/**
 * @class Card
 * @description Card Component
 */

class Card extends BaseComponent
{
    constructor( name, options = {} )
    {
        options.hideName = true;

        super( BaseComponent.CARD, name, null, options );

        let container = document.createElement('div');
        container.className = "lexcard";
        container.style.width = "100%";
        this.root.appendChild( container );

        if( options.img )
        {
            let img = document.createElement('img');
            img.src = options.img;
            container.appendChild( img );

            if( options.link != undefined )
            {
                img.style.cursor = "pointer";
                img.addEventListener('click', function() {
                    const hLink = container.querySelector('a');
                    if( hLink )
                    {
                        hLink.click();
                    }
                });
            }
        }

        let cardNameDom = document.createElement('span');
        cardNameDom.innerText = name;
        container.appendChild( cardNameDom );

        if( options.link != undefined )
        {
            let cardLinkDom = document.createElement( 'a' );
            cardLinkDom.innerText = name;
            cardLinkDom.href = options.link;
            cardLinkDom.target = options.target ?? "";
            cardNameDom.innerText = "";
            cardNameDom.appendChild( cardLinkDom );
        }

        if( options.callback )
        {
            container.style.cursor = "pointer";
            container.addEventListener("click", ( e ) => {
                this._trigger( new LX.IEvent( name, null, e ), options.callback );
            });
        }
    }
}

LX.Card = Card;

/**
 * @class Dial
 * @description Dial Component
 */

class Dial extends BaseComponent
{
    constructor( name, values, callback, options = {} )
    {
        let defaultValues = JSON.parse( JSON.stringify( values ) );

        super( BaseComponent.DIAL, name, defaultValues, options );

        this.onGetValue = () => {
            return JSON.parse( JSON.stringify( dialInstance.element.value ) );
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            dialInstance.element.value = JSON.parse( JSON.stringify( newValue ) );
            dialInstance.redraw();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, dialInstance.element.value, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
            LX.flushCss( container );
            dialInstance.element.style.height = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.width = dialInstance.element.offsetWidth;
            container.style.width = dialInstance.element.offsetWidth + "px";
            dialInstance.canvas.height = dialInstance.canvas.width;
            dialInstance.redraw();
        };

        var container = document.createElement( "div" );
        container.className = "lexcurve";
        this.root.appendChild( container );

        options.callback = ( v, e ) => {
            this._trigger( new LX.IEvent( name, v, e ), callback );
        };

        options.name = name;

        let dialInstance = new LX.CanvasDial( this, values, options );
        container.appendChild( dialInstance.element );
        this.dialInstance = dialInstance;

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Dial = Dial;

/**
 * @class Pad
 * @description Pad Component
 */

class Pad extends BaseComponent
{
    constructor( name, value, callback, options = {} )
    {
        super( BaseComponent.PAD, name, null, options );

        this.onGetValue = () => {
            return thumb.value.xy;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            thumb.value.set( newValue[ 0 ], newValue[ 1 ] );
            _updateValue( thumb.value );
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, thumb.value.xy ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        var container = document.createElement( 'div' );
        container.className = "lexpad";
        this.root.appendChild( container );

        let pad = document.createElement('div');
        pad.id = "lexpad-" + name;
        pad.className = "lexinnerpad";
        pad.style.width = options.padSize ?? '96px';
        pad.style.height = options.padSize ?? '96px';
        container.appendChild( pad );

        let thumb = document.createElement('div');
        thumb.className = "lexpadthumb";
        thumb.value = new LX.vec2( value[ 0 ], value[ 1 ] );
        thumb.min = options.min ?? 0;
        thumb.max = options.max ?? 1;
        pad.appendChild( thumb );

        let _updateValue = v => {
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = new LX.vec2( LX.remapRange( v.x, thumb.min, thumb.max, 0.0, 1.0 ), LX.remapRange( v.y, thumb.min, thumb.max, 0.0, 1.0 ) );
            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
        }

        pad.addEventListener( "mousedown", innerMouseDown );

        let that = this;

        function innerMouseDown( e )
        {
            if( document.activeElement == thumb )
            {
                return;
            }

            var doc = that.root.ownerDocument;
            doc.addEventListener( 'mousemove', innerMouseMove );
            doc.addEventListener( 'mouseup', innerMouseUp );
            document.body.classList.add( 'nocursor' );
            document.body.classList.add( 'noevents' );
            e.stopImmediatePropagation();
            e.stopPropagation();
            thumb.classList.add( "active" );

            if( options.onPress )
            {
                options.onPress.bind( thumb )( e, thumb );
            }
        }

        function innerMouseMove( e )
        {
            const rect = pad.getBoundingClientRect();
            const relativePosition = new LX.vec2( e.x - rect.x, e.y - rect.y );
            relativePosition.clp( 0.0, pad.offsetWidth, relativePosition);
            const [ w, h ] = [ pad.offsetWidth, pad.offsetHeight ];
            const value0to1 = relativePosition.div( new LX.vec2( pad.offsetWidth, pad.offsetHeight ) );

            thumb.style.transform = `translate(calc( ${ w * value0to1.x }px - 50% ), calc( ${ h * value0to1.y }px - 50%)`;
            thumb.value = new LX.vec2( LX.remapRange( value0to1.x, 0.0, 1.0, thumb.min, thumb.max ), LX.remapRange( value0to1.y, 0.0, 1.0, thumb.min, thumb.max ) );

            that._trigger( new LX.IEvent( name, thumb.value.xy, e ), callback );

            e.stopPropagation();
            e.preventDefault();
        }

        function innerMouseUp( e )
        {
            var doc = that.root.ownerDocument;
            doc.removeEventListener( 'mousemove', innerMouseMove );
            doc.removeEventListener( 'mouseup', innerMouseUp );
            document.body.classList.remove( 'nocursor' );
            document.body.classList.remove( 'noevents' );
            thumb.classList.remove( "active" );

            if( options.onRelease )
            {
                options.onRelease.bind( thumb )( e, thumb );
            }
        }

        LX.doAsync( () => {
            this.onResize();
            _updateValue( thumb.value )
        } );
    }
}

LX.Pad = Pad;

/**
 * @class TabSections
 * @description TabSections Component
 */

class TabSections extends BaseComponent
{
    constructor( name, tabs, options = {} )
    {
        options.hideName = true;

        super( BaseComponent.TABS, name, null, options );

        if( tabs.constructor != Array )
        {
            throw( "Param @tabs must be an Array!" );
        }

        if( !tabs.length )
        {
            throw( "Tab list cannot be empty!" );
        }

        const vertical = options.vertical ?? true;
        const showNames = !vertical && ( options.showNames ?? false );

        this.tabDOMs = {};

        let container = document.createElement( 'div' );
        container.className = "lextabscontainer";
        if( !vertical )
        {
            container.className += " horizontal";
        }

        let tabContainer = document.createElement( "div" );
        tabContainer.className = "tabs";
        container.appendChild( tabContainer );
        this.root.appendChild( container );

        // Check at least 1 is selected
        if( tabs.findIndex( e => e.selected === true ) < 0 )
        {
            tabs[ 0 ].selected = true;
        }

        for( let tab of tabs )
        {
            console.assert( tab.name );
            let tabEl = document.createElement( "div" );
            tabEl.className = "lextab " + ( ( tab.selected ?? false ) ? "selected" : "" );
            tabEl.innerHTML = ( showNames ? tab.name : "" );
            tabEl.appendChild( LX.makeIcon( tab.icon ?? "Hash", { title: tab.name, iconClass: tab.iconClass, svgClass: tab.svgClass } ) );
            this.tabDOMs[ tab.name ] = tabEl;

            let infoContainer = document.createElement( "div" );
            infoContainer.id = tab.name.replace( /\s/g, '' );
            infoContainer.className = "components";
            infoContainer.toggleAttribute( "hidden", !( tab.selected ?? false ) );
            container.appendChild( infoContainer );

            tabEl.addEventListener( "click", e => {
                // Change selected tab
                tabContainer.querySelectorAll( ".lextab" ).forEach( e => { e.classList.remove( "selected" ); } );
                tabEl.classList.add( "selected" );
                // Hide all tabs content
                container.querySelectorAll(".components").forEach( e => { e.toggleAttribute( "hidden", true ); } );
                // Show tab content
                const el = container.querySelector( '#' + infoContainer.id );
                el.toggleAttribute( "hidden" );

                if( tab.onSelect )
                {
                    tab.onSelect( this, infoContainer );
                }
            });

            tabContainer.appendChild( tabEl );

            if( tab.onCreate )
            {
                // Push to tab space
                const creationPanel = new LX.Panel();
                creationPanel.queue( infoContainer );
                tab.onCreate.call( this, creationPanel, infoContainer );
                creationPanel.clearQueue();
            }
        }

        this.tabs = tabs;
    }

    select( name ) {

        const tabEl = this.tabDOMs[ name ];

        if( !tabEl )
        {
            return;
        }

        tabEl.click();
    }
}

LX.TabSections = TabSections;

export { BaseComponent, ADD_CUSTOM_COMPONENT };