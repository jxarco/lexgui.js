// Tabs.js @jxarco
import { LX } from './core.js';

/**
 * @class Tabs
 */

class Tabs {

    static TAB_ID   = 0;

    constructor( area, options = {} ) {

        this.onclose = options.onclose;

        let container = document.createElement('div');
        container.className = "lexareatabs " + ( options.fit ? "fit" : "row" );

        const folding = options.folding ?? false;
        if( folding ) container.classList.add("folding");

        let that = this;

        container.addEventListener("dragenter", function( e ) {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            this.classList.add("dockingtab");
        });

        container.addEventListener("dragleave", function( e ) {
            e.preventDefault(); // Prevent default action (open as link for some elements)
            if ( this.contains( e.relatedTarget ) ) return; // Still inside
            this.classList.remove("dockingtab");
        });

        container.addEventListener("drop", function( e ) {
            e.preventDefault(); // Prevent default action (open as link for some elements)

            const tabId = e.dataTransfer.getData( "source" );
            const tabDom = document.getElementById( tabId );
            if( !tabDom ) return;

            const sourceContainer = tabDom.parentElement;
            const target = e.target;
            const rect = target.getBoundingClientRect();

            if( e.offsetX < ( rect.width * 0.5 ) )
            {
                this.insertBefore( tabDom, target );
            }
            else if( target.nextElementSibling )
            {
                this.insertBefore( tabDom, target.nextElementSibling );
            }
            else
            {
                this.appendChild( tabDom );
            }

            {
                // Update childIndex for fit mode tabs in source container
                sourceContainer.childNodes.forEach( (c, idx) => c.childIndex = ( idx - 1 ) );

                // If needed, set last tab of source container active
                const sourceAsFit = (/true/).test( e.dataTransfer.getData( "fit" ) );
                if( sourceContainer.childElementCount == ( sourceAsFit ? 2 : 1 ) )
                {
                    sourceContainer.lastChild.click(); // single tab or thumb first (fit mode)
                }
                else
                {
                    const sourceSelected = sourceContainer.querySelector( ".selected" );
                    ( sourceSelected ?? sourceContainer.childNodes[ sourceAsFit ? 1 : 0 ] ).click();
                }
            }

            // Update childIndex for fit mode tabs in target container
            this.childNodes.forEach( (c, idx) => c.childIndex = ( idx - 1 ) );

            const content = document.getElementById( tabId + "_content" );
            that.area.attach( content );
            this.classList.remove("dockingtab");

            // Change tabs instance and select on drop
            tabDom.instance = that;
            tabDom.click();

            // Store info
            that.tabs[ tabDom.dataset["name"] ] = content;
        });

        area.root.classList.add( "lexareatabscontainer" );

        const [ tabButtons, content ] = area.split({ type: 'vertical', sizes: options.sizes ?? "auto", resize: false, top: 2 });
        tabButtons.attach( container );

        if( options.parentClass )
        {
            container.parentElement.className += ` ${ options.parentClass }`;
        }

        this.area = content;
        this.area.root.className += " lexareatabscontent";

        if( options.contentClass )
        {
            this.area.root.className += ` ${ options.contentClass }`;
        }

        this.selected = null;
        this.root = container;
        this.tabs = {};
        this.tabDOMs = {};

        if( options.fit )
        {
            // Create movable element
            let mEl = document.createElement('span');
            mEl.className = "lexareatab thumb";
            this.thumb = mEl;
            this.root.appendChild( mEl );

            const resizeObserver = new ResizeObserver((entries) => {
                const tabEl = this.thumb.item;
                if( !tabEl ) return;
                var transition = this.thumb.style.transition;
                this.thumb.style.transition = "none";
                this.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                this.thumb.style.width = ( tabEl.offsetWidth ) + "px";
                LX.flushCss( this.thumb );
                this.thumb.style.transition = transition;
            });

            resizeObserver.observe( this.area.root );
        }

        // debug
        if( folding )
        {
            this.folded = true;
            this.folding = folding;

            if( folding == "up" )
            {
                area.root.insertChildAtIndex( area.sections[ 1 ].root, 0 );
            }

            // Listen resize event on parent area
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries)
                {
                    const bb = entry.contentRect;
                    const sibling = area.parentArea.sections[ 0 ].root;
                    const addOffset = true; // hardcoded...
                    sibling.style.height = "calc(100% - " + ((addOffset ? 42 : 0) + bb.height) + "px )";
                }
            });

            resizeObserver.observe( this.area.root );
            this.area.root.classList.add('folded');
        }
    }

    add( name, content, options = {} ) {

        let isSelected = options.selected ?? false;

        if( isSelected )
        {
            this.root.querySelectorAll( 'span' ).forEach( s => s.classList.remove( 'selected' ) );
            const pseudoParent = this.area.root.querySelector( ":scope > .pseudoparent-tabs" );
            const contentRoot = pseudoParent ?? this.area.root;
            contentRoot.querySelectorAll( ':scope > .lextabcontent' ).forEach( c => c.style.display = 'none' );
        }

        isSelected = !Object.keys( this.tabs ).length && !this.folding ? true : isSelected;

        let contentEl = content.root ? content.root : content;
        contentEl.originalDisplay = contentEl.style.display;
        contentEl.style.display = isSelected ? contentEl.originalDisplay : "none";
        contentEl.classList.add( 'lextabcontent' );

        // Process icon
        if( options.icon )
        {
            if( !options.icon.includes( '.' ) ) // Not a file
            {
                const classes = options.icon.split( ' ' );
                options.icon = LX.makeIcon( classes[ 0 ], { svgClass: "sm " + classes.slice( 0 ).join( ' ' ) } ).innerHTML;
            }
            else // an image..
            {
                const rootPath = "https://raw.githubusercontent.com/jxarco/lexgui.js/master/";
                options.icon = "<img src='" + ( rootPath + options.icon ) + "'>";
            }
        }

        // Create tab
        let tabEl = document.createElement( 'span' );
        tabEl.dataset[ "name" ] = name;
        tabEl.className = "lexareatab flex flex-row gap-1" + ( isSelected ? " selected" : "" );
        tabEl.innerHTML = ( options.icon ?? "" ) + name;
        tabEl.id = name.replace( /\s/g, '' ) + Tabs.TAB_ID++;
        tabEl.title = options.title ?? "";
        tabEl.selected = isSelected ?? false;
        tabEl.fixed = options.fixed;
        tabEl.instance = this;
        contentEl.id = tabEl.id + "_content";

        if( options.badge )
        {
            const asChild = options.badge.asChild ?? false;
            const badgeOptions = { };

            if( asChild )
            {
                badgeOptions.parent = tabEl;
            }

            tabEl.innerHTML += LX.badge( options.badge.content ?? "", options.badge.className, badgeOptions );
        }

        if( tabEl.selected )
        {
            this.selected = name;
        }

        tabEl.addEventListener("click", e => {

            e.preventDefault();
            e.stopPropagation();

            const scope = tabEl.instance;

            if( !tabEl.fixed )
            {
                // For folding tabs
                const lastValue = tabEl.selected;
                tabEl.parentElement.querySelectorAll( 'span' ).forEach( s => s.selected = false );
                tabEl.selected = !lastValue;
                // Manage selected
                tabEl.parentElement.querySelectorAll( 'span' ).forEach( s => s.classList.remove( 'selected' ));
                tabEl.classList.toggle('selected', ( scope.folding && tabEl.selected ));
                // Manage visibility
                const pseudoParent = scope.area.root.querySelector( ":scope > .pseudoparent-tabs" );
                const contentRoot = pseudoParent ?? scope.area.root;
                contentRoot.querySelectorAll( ':scope > .lextabcontent' ).forEach( c => c.style.display = 'none' );
                contentEl.style.display = contentEl.originalDisplay;
                scope.selected = tabEl.dataset.name;
            }

            if( scope.folding )
            {
                scope.folded = tabEl.selected;
                scope.area.root.classList.toggle( 'folded', !scope.folded );
            }

            if( options.onSelect )
            {
                options.onSelect(e, tabEl.dataset.name);
            }

            if( scope.thumb )
            {
                scope.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                scope.thumb.style.width = ( tabEl.offsetWidth ) + "px";
                scope.thumb.item = tabEl;
            }
        });

        tabEl.addEventListener("contextmenu", e => {
            e.preventDefault();
            e.stopPropagation();

            if( options.onContextMenu )
            {
                options.onContextMenu( e, tabEl.dataset.name );
            }
        });

        if( options.allowDelete ?? false )
        {
            tabEl.addEventListener("mousedown", e => {
                if( e.button == LX.MOUSE_MIDDLE_CLICK )
                {
                    e.preventDefault();
                }
            });

            tabEl.addEventListener("mouseup", e => {
                e.preventDefault();
                e.stopPropagation();
                if( e.button == LX.MOUSE_MIDDLE_CLICK )
                {
                    this.delete( tabEl.dataset[ "name" ] );
                }
            });
        }

        tabEl.setAttribute( 'draggable', true );
        tabEl.addEventListener( 'dragstart', e => {
            const sourceAsFit = !!this.thumb;
            if( tabEl.parentElement.childNodes.length == ( sourceAsFit ? 2 : 1 ) ){
                e.preventDefault();
                return;
            }
            e.dataTransfer.setData( 'source', e.target.id );
            e.dataTransfer.setData( 'fit', sourceAsFit );
        });

        // Attach content
        const indexOffset = options.indexOffset ?? -1;
        tabEl.childIndex = ( this.root.childElementCount + indexOffset );
        this.root.insertChildAtIndex( tabEl, tabEl.childIndex + 1 );
        this.area.attach( contentEl );
        this.tabDOMs[ name ] = tabEl;
        this.tabs[ name ] = content;

        setTimeout( () => {

            if( options.onCreate )
            {
                options.onCreate.call(this, this.area.root.getBoundingClientRect());
            }

            if( isSelected && this.thumb )
            {
                this.thumb.classList.add( "no-transition" );
                this.thumb.style.transform = "translate( " + ( tabEl.childIndex * tabEl.offsetWidth ) + "px )";
                this.thumb.style.width = ( tabEl.offsetWidth ) + "px";
                this.thumb.item = tabEl;
                this.thumb.classList.remove( "no-transition" );
            }

        }, 10 );
    }

    select( name ) {

        if(!this.tabDOMs[ name ] )
        return;

        this.tabDOMs[ name ].click();
    }

    delete( name ) {

        if( this.selected == name )
        {
            this.selected = null;
        }

        const tabEl = this.tabDOMs[ name ];

        if( !tabEl || tabEl.fixed )
        {
            return;
        }

        if( this.onclose )
        {
            this.onclose( name );
        }

        // Delete tab element
        this.tabDOMs[ name ].remove();
        delete this.tabDOMs[ name ];

        // Delete content
        this.tabs[ name ].remove();
        delete this.tabs[ name ];

        // Select last tab
        const lastTab = this.root.lastChild;
        if( lastTab && !lastTab.fixed )
        {
            this.root.lastChild.click();
        }
    }
}

LX.Tabs = Tabs;

export { Tabs };