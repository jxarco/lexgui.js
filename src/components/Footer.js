// Footer.js @jxarco
import { LX } from './core.js';

/**
 * @class Footer
 */

class Footer {
    /**
     * @param {Object} options:
     * columns: Array with data per column { title, items: [ { title, link } ]  }
     * credits: html string
     * socials: Array with data per item { title, link, icon }
     * className: Extra class to customize
    */
    constructor( options = {} ) {

        const root = document.createElement( "footer" );
        root.className = "lexfooter" + ` ${ options.className ?? "" }`;

        const wrapper = document.createElement( "div" );
        wrapper.style.minHeight = "48px";
        wrapper.className = "w-full";
        root.appendChild( wrapper );

        // const hr = document.createElement( "hr" );
        // wrapper.appendChild( hr );

        if( options.columns && options.columns.constructor == Array )
        {
            const cols = document.createElement( "div" );
            cols.className = "columns";
            cols.style.gridTemplateColumns = "1fr ".repeat( options.columns.length );
            wrapper.appendChild( cols );

            for( let col of options.columns )
            {
                const colDom = document.createElement( "div" );
                colDom.className = "col";
                cols.appendChild( colDom );

                const colTitle = document.createElement( "h2" );
                colTitle.innerHTML = col.title;
                colDom.appendChild( colTitle );

                if( !col.items || !col.items.length )
                {
                    continue;
                }

                const itemListDom = document.createElement( "ul" );
                colDom.appendChild( itemListDom );

                for( let item of col.items )
                {
                    const itemDom = document.createElement( "li" );
                    itemDom.innerHTML = `<a class="" href="${ item.link }">${ item.title }</a>`;
                    itemListDom.appendChild( itemDom );
                }
            }
        }

        if( options.credits || options.socials )
        {
            const creditsSocials = document.createElement( "div" );
            creditsSocials.className = "credits-and-socials";
            wrapper.appendChild( creditsSocials );

            if( options.credits )
            {
                const credits = document.createElement( "p" );
                credits.innerHTML = options.credits;
                creditsSocials.appendChild( credits );
            }

            if( options.socials )
            {
                const socials = document.createElement( "div" );
                socials.className = "socials flex flex-row gap-1 my-2 justify-end";

                for( let social of options.socials )
                {
                    const socialIcon = LX.makeIcon( social.icon, { title: social.title, svgClass: "xl" } );
                    socialIcon.href = social.link;
                    socialIcon.target = "_blank";
                    socials.appendChild( socialIcon );
                }

                creditsSocials.appendChild( socials );
            }
        }

        // Append directly to body
        const parent = options.parent ?? document.body;
        parent.appendChild( root );

        // Set always at bottom
        root.previousElementSibling.style.flexGrow = "1";

        this.root = root;
    }
}

LX.Footer = Footer;

export { Footer };