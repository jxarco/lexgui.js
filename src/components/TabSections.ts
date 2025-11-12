// TabSections.ts @jxarco

import { LX } from './../core/Namespace';
import { BaseComponent, ComponentType } from './BaseComponent';

/**
 * @class TabSections
 * @description TabSections Component
 */

export class TabSections extends BaseComponent
{
    tabs: any[];
    tabDOMs: Record<string, HTMLElement>;

    constructor( name: string, tabs: any[], options: any = {} )
    {
        options.hideName = true;

        super( ComponentType.TABS, name, null, options );

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
                el?.toggleAttribute( "hidden" );

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

    select( name: string )
    {
        const tabEl = this.tabDOMs[ name ];

        if( !tabEl )
        {
            return;
        }

        tabEl.click();
    }
}

LX.TabSections = TabSections;