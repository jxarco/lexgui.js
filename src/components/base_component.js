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
 * @class ComboButtons
 * @description ComboButtons Component
 */

class ComboButtons extends BaseComponent
{
    constructor( name, values, options = {} )
    {
        const shouldSelect = !( options.noSelection ?? false );
        let shouldToggle = shouldSelect && ( options.toggle ?? false );

        let container = document.createElement('div');
        container.className = "lexcombobuttons ";

        options.skipReset = true;

        if( options.float )
        {
            container.className += options.float;
        }

        let currentValue = [];
        let buttonsBox = document.createElement('div');
        buttonsBox.className = "lexcombobuttonsbox ";
        container.appendChild( buttonsBox );

        for( let b of values )
        {
            if( !b.value )
            {
                throw( "Set 'value' for each button!" );
            }

            let buttonEl = document.createElement('button');
            buttonEl.className = "lexbutton combo";
            buttonEl.title = b.icon ? b.value : "";
            buttonEl.id = b.id ?? "";
            buttonEl.dataset["value"] = b.value;

            if( options.buttonClass )
            {
                buttonEl.classList.add( options.buttonClass );
            }

            if( shouldSelect && ( b.selected || options.selected?.includes( b.value ) ) )
            {
                buttonEl.classList.add("selected");
                currentValue = ( currentValue ).concat( [ b.value ] );
            }

            if( b.icon )
            {
                const icon = LX.makeIcon( b.icon );
                buttonEl.appendChild( icon );
            }
            else
            {
                buttonEl.innerHTML = `<span>${ b.value }</span>`;
            }

            if( b.disabled )
            {
                buttonEl.setAttribute( "disabled", true );
            }

            buttonEl.addEventListener("click", e => {

                currentValue = [];

                if( shouldSelect )
                {
                    if( shouldToggle )
                    {
                        buttonEl.classList.toggle( "selected" );
                    }
                    else
                    {
                        container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));
                        buttonEl.classList.add( "selected" );
                    }
                }

                container.querySelectorAll( "button" ).forEach( s => {

                    if( s.classList.contains( "selected" ) )
                    {
                        currentValue.push( s.dataset[ "value" ] );
                    }

                } );

                if( !shouldToggle && currentValue.length > 1 )
                {
                    console.error( `Enable _options.toggle_ to allow selecting multiple options in ComboButtons.` );
                    return;
                }

                currentValue = currentValue[ 0 ];

                this.set( b.value, false, buttonEl.classList.contains( "selected" ) );
            });

            buttonsBox.appendChild( buttonEl );
        }

        if( currentValue.length > 1 )
        {
            if( !shouldToggle )
            {
                options.toggle = true;
                shouldToggle = shouldSelect;
                console.warn( `Multiple options selected in '${ name }' ComboButtons. Enabling _toggle_ mode.` );
            }
        }
        else
        {
            currentValue = currentValue[ 0 ];
        }

        super( BaseComponent.BUTTONS, name, null, options );

        this.onGetValue = () => {
            return currentValue;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            if( shouldSelect && ( event == undefined ) )
            {
                container.querySelectorAll( "button" ).forEach( s => s.classList.remove( "selected" ));

                container.querySelectorAll( "button" ).forEach( s => {
                    if( currentValue && currentValue.indexOf( s.dataset[ "value" ] ) > -1 )
                    {
                        s.classList.add( "selected" );
                    }
                } );
            }

            if( !skipCallback && newValue.constructor != Array )
            {
                const enabled = event;
                const fn = values.filter( v => v.value == newValue )[ 0 ]?.callback;
                this._trigger( new LX.IEvent( name, shouldToggle ? [ newValue, enabled ] : newValue, null ), fn );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        this.root.appendChild( container );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.ComboButtons = ComboButtons;

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
 * @class Form
 * @description Form Component
 */

class Form extends BaseComponent
{
    constructor( name, data, callback, options = {} )
    {
        if( data.constructor != Object )
        {
            console.error( "Form data must be an Object" );
            return;
        }

        // Always hide name for this one
        options.hideName = true;

        super( BaseComponent.FORM, name, null, options );

        this.onGetValue = () => {
            return container.formData;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            container.formData = newValue;
            const entries = container.querySelectorAll( ".lexcomponent" );
            for( let i = 0; i < entries.length; ++i )
            {
                const entry = entries[ i ];
                if( entry.jsInstance.type != BaseComponent.TEXT )
                {
                    continue;
                }
                let entryName = entries[ i ].querySelector( ".lexcomponentname" ).innerText;
                let entryInput = entries[ i ].querySelector( ".lextext input" );
                entryInput.value = newValue[ entryName ] ?? "";
                BaseComponent._dispatchEvent( entryInput, "focusout", skipCallback );
            }
        };

        let container = document.createElement( 'div' );
        container.className = "lexformdata";
        container.style.width = "100%";
        container.formData = {};
        this.root.appendChild( container );

        for( let entry in data )
        {
            let entryData = data[ entry ];

            if( entryData.constructor != Object )
            {
                const oldValue = JSON.parse( JSON.stringify( entryData ) );
                entryData = { value: oldValue };
                data[ entry ] = entryData;
            }

            entryData.placeholder = entryData.placeholder ?? ( entryData.label ?? `Enter ${ entry }` );
            entryData.width = "100%";

            if( !( options.skipLabels ?? false ) )
            {
                const label = new LX.TextInput( null, entryData.label ?? entry, null, { disabled: true, inputClass: "formlabel nobg" } );
                container.appendChild( label.root );
            }

            entryData.textComponent = new LX.TextInput( null, entryData.constructor == Object ? entryData.value : entryData, ( value ) => {
                container.formData[ entry ] = value;
            }, entryData );
            container.appendChild( entryData.textComponent.root );

            container.formData[ entry ] = entryData.constructor == Object ? entryData.value : entryData;
        }

        const buttonContainer = LX.makeContainer( ["100%", "auto"], "flex flex-row", "", container );

        if( options.secondaryActionName || options.secondaryActionCallback )
        {
            const secondaryButton = new LX.Button( null, options.secondaryActionName ?? "Cancel", ( value, event ) => {
                if( callback )
                {
                    callback( container.formData, event );
                }
            }, { width: "100%", minWidth: "0", buttonClass: options.secondaryButtonClass ?? "primary" } );

            buttonContainer.appendChild( secondaryButton.root );
        }

        const primaryButton = new LX.Button( null, options.primaryActionName ?? "Submit", ( value, event ) => {

            const errors = [];

            for( let entry in data )
            {
                let entryData = data[ entry ];

                if( !entryData.textComponent.valid() )
                {
                    errors.push( { type: "input_not_valid", entry } )
                }
            }

            if( callback )
            {
                callback( container.formData, errors, event );
            }
        }, { width: "100%", minWidth: "0", buttonClass: options.primaryButtonClass ?? "contrast" } );

        buttonContainer.appendChild( primaryButton.root );
    }
}

LX.Form = Form;

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
 * @class ItemArray
 * @description ItemArray Component
 */

class ItemArray extends BaseComponent
{
    constructor( name, values = [], callback, options = {} )
    {
        options.nameWidth = "100%";

        super( BaseComponent.ARRAY, name, null, options );

        this.onGetValue = () => {
            return values;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            values = newValue;
            this._updateItems();
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, values, event ), callback );
            }
        };

        // Add open array button

        let container = document.createElement( "div" );
        container.className = "lexarray";
        container.style.width = "100%";
        this.root.appendChild( container );
        this.root.dataset["opened"] = false;

        let buttonName = `Array (size ${ values.length })`;

        const toggleButton = new LX.Button(null, buttonName, () => {
            this.root.dataset["opened"] = this.root.dataset["opened"] == "true" ? false : true;
            this.root.querySelector(".lexarrayitems").toggleAttribute( "hidden" );
        }, { buttonClass: "array" });
        toggleButton.root.querySelector( "span" ).appendChild( LX.makeIcon( "Down", { svgClass: "sm" } ) );
        container.appendChild( toggleButton.root );

        // Show elements

        let arrayItems = document.createElement( "div" );
        arrayItems.className = "lexarrayitems";
        arrayItems.toggleAttribute( "hidden",  true );
        this.root.appendChild( arrayItems );

        this._updateItems = () => {

            // Update num items
            let buttonSpan = this.root.querySelector(".lexbutton.array span");
            for( let node of buttonSpan.childNodes )
            {
                if ( node.nodeType === Node.TEXT_NODE ) { node.textContent = `Array (size ${ values.length })`; break; }
            }

            // Update inputs
            arrayItems.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                const value = values[ i ];
                let baseclass = options.innerValues ? 'select' : value.constructor;
                let component = null;

                switch( baseclass  )
                {
                    case String:
                        component = new LX.TextInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case Number:
                        component = new NumberInput(i + "", value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                    case 'select':
                        component = new Select(i + "", options.innerValues, value, function(value, event) {
                            values[ i ] = value;
                            callback( values );
                        }, { nameWidth: "12px", className: "p-0", skipReset: true });
                        break;
                }

                console.assert( component, `Value of type ${ baseclass } cannot be modified in ItemArray` );

                arrayItems.appendChild( component.root );

                const removeComponent = new LX.Button( null, "", ( v, event) => {
                    values.splice( values.indexOf( value ), 1 );
                    this._updateItems();
                    this._trigger( new LX.IEvent(name, values, event), callback );
                }, { title: "Remove item", icon: "Trash3"} );

                component.root.appendChild( removeComponent.root );
            }

            const addButton = new LX.Button(null, LX.makeIcon( "Plus", { svgClass: "sm" } ).innerHTML + "Add item", (v, event) => {
                values.push( options.innerValues ? options.innerValues[ 0 ] : "" );
                this._updateItems();
                this._trigger( new LX.IEvent(name, values, event), callback );
            }, { buttonClass: 'array' });

            arrayItems.appendChild( addButton.root );
        };

        this._updateItems();
    }
}

LX.ItemArray = ItemArray;

/**
 * @class List
 * @description List Component
 */

class List extends BaseComponent
{
    constructor( name, values, value, callback, options = {} )
    {
        super( BaseComponent.LIST, name, value, options );

        this.onGetValue = () => {
            return value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );

            let idx = null;
            for( let i = 0; i < values.length; ++i )
            {
                const v = values[ i ];
                if( v == newValue || ( ( v.constructor == Array ) && ( v[ 0 ] == newValue ) ) )
                {
                    idx = i;
                    break;
                }
            }

            if( !idx )
            {
                console.error( `Cannot find item ${ newValue } in List.` );
                return;
            }

            listContainer.children[ idx ].classList.toggle( 'selected' );
            value = newValue;

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            listContainer.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        this._updateValues = ( newValues ) => {

            values = newValues;
            listContainer.innerHTML = "";

            for( let i = 0; i < values.length; ++i )
            {
                let icon = null;
                let itemValue = values[ i ];

                if( itemValue.constructor === Array )
                {
                    icon = itemValue[ 1 ];
                    itemValue = itemValue[ 0 ];
                }

                let listElement = document.createElement( 'div' );
                listElement.className = "lexlistitem" + ( value == itemValue ? " selected" : "" );

                if( icon )
                {
                    listElement.appendChild( LX.makeIcon( icon ) );
                }

                listElement.innerHTML += `<span>${ itemValue }</span>`;

                listElement.addEventListener( 'click', e => {
                    listContainer.querySelectorAll( '.lexlistitem' ).forEach( e => e.classList.remove( 'selected' ) );
                    listElement.classList.toggle( 'selected' );
                    value = itemValue;
                    this._trigger( new LX.IEvent( name, itemValue, e ), callback );
                });

                listContainer.appendChild( listElement );
            }
        };

        // Show list

        let listContainer = document.createElement( 'div' );
        listContainer.className = "lexlist";
        this.root.appendChild( listContainer );

        this._updateValues( values );

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.List = List;

/**
 * @class RadioGroup
 * @description RadioGroup Component
 */

class RadioGroup extends BaseComponent
{
    constructor( name, label, values, callback, options = {} )
    {
        super( BaseComponent.RADIO, name, null, options );

        let currentIndex = null;

        this.onGetValue = () => {
            const items = container.querySelectorAll( 'button' );
            return currentIndex ? [ currentIndex, items[ currentIndex ] ] : undefined;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {

            newValue = newValue[ 0 ] ?? newValue; // Allow getting index of { index, value } tupple

            console.assert( newValue.constructor == Number, "RadioGroup _value_ must be an Array index!" );

            const items = container.querySelectorAll( 'button' );
            items.forEach( b => { b.checked = false; b.classList.remove( "checked" ) } );

            const optionItem = items[ newValue ];
            optionItem.checked = !optionItem.checked;
            optionItem.classList.toggle( "checked" );

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( null, [ newValue, values[ newValue ] ], event ), callback );
            }
        };

        var container = document.createElement( 'div' );
        container.className = "lexradiogroup " + ( options.className ?? "" );
        this.root.appendChild( container );

        let labelSpan = document.createElement( 'span' );
        labelSpan.innerHTML = label;
        container.appendChild( labelSpan );

        for( let i = 0; i < values.length; ++i )
        {
            const optionItem = document.createElement( 'div' );
            optionItem.className = "lexradiogroupitem";
            container.appendChild( optionItem );

            const optionButton = document.createElement( 'button' );
            optionButton.className = "flex p-0 rounded-lg cursor-pointer";
            optionButton.disabled = options.disabled ?? false;
            optionItem.appendChild( optionButton );

            optionButton.addEventListener( "click", ( e ) => {
                this.set( i, false, e );
            } );

            const checkedSpan = document.createElement( 'span' );
            optionButton.appendChild( checkedSpan );

            const optionLabel = document.createElement( 'span' );
            optionLabel.innerHTML = values[ i ];
            optionItem.appendChild( optionLabel );
        }

        if( options.selected )
        {
            console.assert( options.selected.constructor == Number, "RadioGroup _selected_ must be an Array index!" );
            currentIndex = options.selected;
            this.set( currentIndex, true );
        }
    }
}

LX.RadioGroup = RadioGroup;

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
 * @class Progress
 * @description Progress Component
 */

class Progress extends BaseComponent
{
    constructor( name, value, options = {} )
    {
        super( BaseComponent.PROGRESS, name, value, options );

        this.onGetValue = () => {
            return progress.value;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
			newValue = LX.clamp( newValue, progress.min, progress.max );
            this.root.querySelector("meter").value = newValue;
            _updateColor();
            if( this.root.querySelector("span") )
            {
                this.root.querySelector("span").innerText = newValue;
            }

            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), options.callback );
            }
        };

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            container.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        const container = document.createElement('div');
        container.className = "lexprogress";
        this.root.appendChild( container );

        // add slider (0-1 if not specified different )

        let progress = document.createElement('meter');
        progress.id = "lexprogressbar-" + name;
        progress.className = "lexprogressbar";
        progress.step = "any";
        progress.min = options.min ?? 0;
        progress.max = options.max ?? 1;
        progress.low = options.low ?? progress.low;
        progress.high = options.high ?? progress.high;
        progress.optimum = options.optimum ?? progress.optimum;
        progress.value = value;
        container.appendChild( progress );

        const _updateColor = () => {

            let backgroundColor = LX.getThemeColor( "global-selected" );

            if( progress.low != undefined && progress.value < progress.low )
            {
                backgroundColor = LX.getThemeColor( "global-color-error" );
            }
            else if( progress.high != undefined && progress.value < progress.high )
            {
                backgroundColor = LX.getThemeColor( "global-color-warning" );
            }

            progress.style.background = `color-mix(in srgb, ${backgroundColor} 20%, transparent)`;
        };

        if( options.showValue )
        {
            if( document.getElementById('progressvalue-' + name ) )
            {
                document.getElementById('progressvalue-' + name ).remove();
            }

            let span = document.createElement("span");
            span.id = "progressvalue-" + name;
            span.style.padding = "0px 5px";
            span.innerText = value;
            container.appendChild( span );
        }

        if( options.editable ?? false )
        {
            progress.classList.add( "editable" );

            let innerMouseDown = e => {

                var doc = this.root.ownerDocument;
                doc.addEventListener( 'mousemove', innerMouseMove );
                doc.addEventListener( 'mouseup', innerMouseUp );
                document.body.classList.add( 'noevents' );
                progress.classList.add( "grabbing" );
                e.stopImmediatePropagation();
                e.stopPropagation();

                const rect = progress.getBoundingClientRect();
                const newValue = LX.round( LX.remapRange( e.offsetX, 0, rect.width, progress.min, progress.max ) );
                this.set( newValue, false, e );
            }

            let innerMouseMove = e => {

                let dt = e.movementX;

                if ( dt != 0 )
                {
                    const rect = progress.getBoundingClientRect();
                    const newValue = LX.round( LX.remapRange( e.offsetX - rect.x, 0, rect.width, progress.min, progress.max ) );
                    this.set( newValue, false, e );
                }

                e.stopPropagation();
                e.preventDefault();
            }

            let innerMouseUp = e => {

                var doc = this.root.ownerDocument;
                doc.removeEventListener( 'mousemove', innerMouseMove );
                doc.removeEventListener( 'mouseup', innerMouseUp );
                document.body.classList.remove( 'noevents' );
                progress.classList.remove( "grabbing" );
            }

            progress.addEventListener( "mousedown", innerMouseDown );
        }

        _updateColor();

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.Progress = Progress;

/**
 * @class FileInput
 * @description FileInput Component
 */

class FileInput extends BaseComponent
{
    constructor( name, callback, options = { } )
    {
        super( BaseComponent.FILE, name, null, options );

        let local = options.local ?? true;
        let type = options.type ?? 'text';
        let read = options.read ?? true;

        this.onResize = ( rect ) => {
            const realNameWidth = ( this.root.domName?.style.width ?? "0px" );
            input.style.width = `calc( 100% - ${ realNameWidth })`;
        };

        // Create hidden input
        let input = document.createElement( 'input' );
        input.className = "lexfileinput";
        input.type = 'file';
        input.disabled = options.disabled ?? false;
        this.root.appendChild( input );

        if( options.placeholder )
        {
            input.placeholder = options.placeholder;
        }

        input.addEventListener( 'change', function( e ) {

            const files = e.target.files;
            if( !files.length ) return;
            if( read )
            {
                if( options.onBeforeRead )
                    options.onBeforeRead();

                const reader = new FileReader();

                if( type === 'text' ) reader.readAsText( files[ 0 ] );
                else if( type === 'buffer' ) reader.readAsArrayBuffer( files[ 0 ] );
                else if( type === 'bin' ) reader.readAsBinaryString( files[ 0 ] );
                else if( type === 'url' ) reader.readAsDataURL( files[ 0 ] );

                reader.onload = e => { callback.call( this, e.target.result, files[ 0 ] ) } ;
            }
            else
                callback( files[ 0 ] );
        });

        input.addEventListener( 'cancel', function( e ) {
            callback( null );
        });

        if( local )
        {
            let settingsDialog = null;

            const settingButton = new LX.Button(null, "", () => {

                if( settingsDialog )
                {
                    return;
                }

                settingsDialog = new LX.Dialog( "Load Settings", p => {
                    p.addSelect( "Type", [ 'text', 'buffer', 'bin', 'url' ], type, v => { type = v } );
                    p.addButton( null, "Reload", v => { input.dispatchEvent( new Event( 'change' ) ) } );
                }, { onclose: ( root ) => { root.remove(); settingsDialog = null; } } );

            }, { skipInlineCount: true, title: "Settings", disabled: options.disabled, icon: "Settings" });

            this.root.appendChild( settingButton.root );
        }

        LX.doAsync( this.onResize.bind( this ) );
    }
}

LX.FileInput = FileInput;

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

/**
 * @class Counter
 * @description Counter Component
 */

class Counter extends BaseComponent
{
    constructor( name, value, callback, options = { } )
    {
        super( BaseComponent.COUNTER, name, value, options );

        this.onGetValue = () => {
            return counterText.count;
        };

        this.onSetValue = ( newValue, skipCallback, event ) => {
            newValue = LX.clamp( newValue, min, max );
            counterText.count = newValue;
            counterText.innerHTML = newValue;
            if( !skipCallback )
            {
                this._trigger( new LX.IEvent( name, newValue, event ), callback );
            }
        };

        const min = options.min ?? 0;
        const max = options.max ?? 100;
        const step = options.step ?? 1;

        const container = document.createElement( 'div' );
        container.className = "lexcounter";
        this.root.appendChild( container );

        const substrButton = new LX.Button(null, "", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count - mult, false, e );
        }, { skipInlineCount: true, title: "Minus", icon: "Minus" });

        container.appendChild( substrButton.root );

        const containerBox = document.createElement( 'div' );
        containerBox.className = "lexcounterbox";
        container.appendChild( containerBox );

        const counterText = document.createElement( 'span' );
        counterText.className = "lexcountervalue";
        counterText.innerHTML = value;
        counterText.count = value;
        containerBox.appendChild( counterText );

        if( options.label )
        {
            const counterLabel = document.createElement( 'span' );
            counterLabel.className = "lexcounterlabel";
            counterLabel.innerHTML = options.label;
            containerBox.appendChild( counterLabel );
        }

        const addButton = new LX.Button(null, "", ( value, e ) => {
            let mult = step ?? 1;
            if( e.shiftKey ) mult *= 10;
            this.set( counterText.count + mult, false, e );
        }, { skipInlineCount: true, title: "Plus", icon: "Plus" });
        container.appendChild( addButton.root );
    }
}

LX.Counter = Counter;

export { BaseComponent, ADD_CUSTOM_COMPONENT };