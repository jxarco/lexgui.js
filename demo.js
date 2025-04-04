import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';
import 'lexgui/components/timeline.js';
import 'lexgui/components/audio.js';

window.LX = LX;

let area = LX.init( { strictViewport: false } );

// Menubar
{
    area.addMenubar( m => {
        
        m.setButtonImage("lexgui.js", "images/icon.png", () => {window.open("https://jxarco.github.io/lexgui.js/")}, {float: "left"})
    
        m.add( "Docs", { icon: "fa-solid fa-magnifying-glass", short: "F1", callback: () => { window.open("./docs/") }});
    
        const commandButton = new LX.Button(null, "Search command...", () => { LX.setCommandbarState( true ) }, {
            width: "256px", className: "right", buttonClass: "outline left fg-tertiary bg-secondary" }
        );
        m.root.appendChild( commandButton.root );
    
        m.addButtons( [
            {
                title: "Github",
                icon: "fa-brands fa-github",
                callback:  (event) => {
                    window.open( "https://github.com/jxarco/lexgui.js/", "_blank" );
                }
            },
            {
                title: "Change Theme",
                icon: "fa-solid fa-sun",
                swap: "fa-solid fa-moon",
                callback:  (event, swapValue) => { LX.setTheme( swapValue ? "light" : "dark" ) }
            }
        ], { float: "right" });
    });
}

// Header
{
    const header = LX.makeContainer( [ null, "auto" ], "col border gap-2 p-8" );
    
    header.innerHTML = `
        <a>Get started with LexGUI.js</a>
        <h1>Build your application interface</h1>
        <p style="max-width:32rem">A set of beautifully-designed, accessible widgets and components. 
        No complex frameworks. Pure JavaScript and CSS. Open Source.</p>
    `;
    
    area.attach( header );
}

// Content
{
    const tabs = area.addTabs( { sizes: [ "auto", "auto" ], contentClass: "p-6 pt-0" } );
    tabs.root.parentElement.classList.add( "p-4" );

    // Mail
    {
        const mailContainer = LX.makeContainer( [ null, "auto" ], "col bg-primary border rounded-lg p-6" );
        tabs.add( "Mail", mailContainer, { selected: true } );
    }

    // Tasks
    {
        const tasksContainer = LX.makeContainer( [ null, "auto" ], "col bg-primary border rounded-lg p-6" );
        tabs.add( "Tasks", tasksContainer, { xselected: true } );

        const header = LX.makeContainer( [ null, "auto" ], "col rounded-lg p-6" );
        header.innerHTML = `
            <h2>Welcome back!</h2>
            <p class="fg-tertiary">Here's a list of your tasks for this month!</p>
        `;
        tasksContainer.appendChild( header );

        const tableWidget = new LX.Table(null, {
            head: ["Name", "Status", "Priority"],
            body: [
                ["Alice", "In Progress", "High"],
                ["Bob", "Backlog", "Medium"],
                ["Prince", "Canceled", "Low"],
                ["Sean", "Done", "High"],
                ["Carter", "In Progress", "Medium"],
                ["James", "Backlog", "Low"],
                ["Mickey", "Todo", "Low"],
                ["Charlie", "Canceled", "Low"],
                ["Potato", "Todo", "High"]
            ]
        }, {
            selectable: true,
            sortable: true,
            toggleColumns: true,
            filter: "Name",
            customFilters: [
                { name: "Status", options: ["Backlog", "Todo", "In Progress", "Done", "Cancelled"] },
                { name: "Priority", options: ["Low", "Medium", "High"] },
            ],
            rowActions: [
                { icon: "edit", title: "Edit Row" },
                "delete",
                "menu"
            ],
            onMenuAction: (index, tableData) => {
                return [
                    { name: "Export" },
                    { name: "Make a copy" },
                    { name: "Favourite" }
                ]
            }
        });
        tasksContainer.appendChild( tableWidget.root );
    }

    // Code
    {
        const codeContainer = LX.makeContainer( [ "auto", "850px" ], "", {
            backgroundColor: "red"
        } );

        tabs.add( "Code", codeContainer );
    }

    // Audio
    {
        const audioContainer = LX.makeContainer( [ "auto", "850px" ], "", {
            backgroundColor: "red"
        } );

        tabs.add( "Audio", audioContainer );
    }

    // Examples
    {
        const examplesContainer = LX.makeContainer( [ "auto", "850px" ], "", {
            backgroundColor: "red"
        } );

        tabs.add( "Examples", examplesContainer );
    }
}

// Footer
{
    const footer = new LX.Footer( {
        parent: LX.root,
        columns: [
            {
                title: "LexGUI",
                items: [
                    { title: "Documentation", link: "https://jxarco.github.io/lexgui.js/docs/" },
                    { title: "Source code", link: "https://github.com/jxarco/lexgui.js/" }
                ]
            },
            {
                title: "Projects",
                items: [
                    { title: "Animics", link: "https://animics.gti.upf.edu/" },
                    { title: "Performs", link: "https://performs.gti.upf.edu/" }
                ]
            },
            {
                title: "References",
                items: [
                    { title: "shadcn/ui", link: "https://ui.shadcn.com/" },
                    { title: "Radix UI", link: "https://www.radix-ui.com/" },
                ]
            }
        ],
        credits: `2019-${ new Date().getUTCFullYear() } Alex Rodríguez and contributors. Website source code on GitHub.`,
        socials: [
            { title: "Github", link: "https://github.com/jxarco/lexgui.js/", icon: `<a class="fa-brands fa-github"></a>` },
            { title: "Discord", link: "https://discord.gg/vwqVrMZBXv", icon: `<a class="fa-brands fa-discord"></a>` }
        ]
    } );
}