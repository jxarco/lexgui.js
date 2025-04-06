import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';
import 'lexgui/components/timeline.js';
import 'lexgui/components/audio.js';

window.LX = LX;

const area = LX.init( { strictViewport: false, rootClass: "wrapper" } );

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
    const header = LX.makeContainer( [ null, "auto" ], "flex flex-col border border-l-0 border-r-0 gap-2 p-8" );
    
    header.innerHTML = `
        <a>Get started with LexGUI.js</a>
        <h1>Build your application interface</h1>
        <p class="font-light" style="max-width:32rem">A set of beautifully-designed, accessible widgets and components.
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
        const mailContainer = LX.makeContainer( [ null, "800px" ], "flex flex-col bg-primary border rounded-lg" );
        tabs.add( "Mail", mailContainer, { selected: true } );

        const mailArea = new LX.Area({ className: "rounded-lg" });
        mailContainer.appendChild( mailArea.root );
        // const customHeader = document.createElement('div');
        // customHeader.innerHTML = "Custom simple header";
        const badgeClass = "ml-auto no-bg font-medium";

        const sidebar = mailArea.addSidebar( m => {
            m.add( "Inbox", { icon: "inbox", content: LX.badge("128", badgeClass, { asElement: true }) } );
            m.add( "Drafts", { icon: "file", content: LX.badge("9", badgeClass, { asElement: true }) } );
            m.add( "Sent", { icon: "paper-plane" } );
            m.add( "Junk", { icon: "box-archive", content: LX.badge("23", badgeClass, { asElement: true }) } );
            m.add( "Trash", { icon: "trash-can" } );
            m.add( "Archive", { icon: "box-archive" } );
            m.separator();
            m.add( "Social", { icon: "user", content: LX.badge("972", badgeClass, { asElement: true }) } );
            m.add( "Updates", { icon: "circle-info", content: LX.badge("342", badgeClass, { asElement: true }) } );
            m.add( "Forums", { icon: "comments", content: LX.badge("96", badgeClass, { asElement: true }) } );
            m.add( "Shopping ", { icon: "shopping-cart" } );
            m.add( "Promotions", { icon: "box-archive", content: LX.badge("21", badgeClass, { asElement: true }) } );
        }, { 
            // collapseToIcons: false,
            className: "border border-l-0 border-t-0 border-b-0",
            parentClass: "rounded-lg",
            headerTitle: "jxarco",
            headerSubtitle: "alexroco.30@gmail.com",
            headerImage: "https://raw.githubusercontent.com/jxarco/lexgui.js/refs/heads/master/images/icon.png",
            // header: customHeader,
            skipFooter: true,
            onHeaderPressed: (e, element) => {
                new LX.DropdownMenu( element, [
                    "My Account",
                    null,
                    { name: "Profile", short: "P", icon: "user" },
                    { name: "Billing", disabled: true, icon: "credit-card" },
                    { name: "Settings", short: "S" },
                    null,
                    { name: "Team" },
                    { name: "Invite users", icon: "search" },
                    null,
                    { name: "Github", icon: "github" },
                    { name: "Support", submenu: [
                        { name: "Email", icon: "envelope" },
                        { name: "Message", submenu: [
                            { name: "Whatsapp" },
                            { name: "iMessage" },
                        ]},
                    ]  }
                ], { side: "right", align: "end" });
            }
        });

        const inboxArea = sidebar.siblingArea;
        inboxArea.root.classList.add( "rounded-lg" );

        var [ left, right ] = inboxArea.split({ sizes:["50%","50%"] });

        // Manage Inbox
        {
            const inboxTabs = left.addTabs({ parentClass: "p-3 items-end border border-t-0 border-l-0 border-r-0", sizes: [ "auto", "auto" ], float: "end" });

            const allMailContainer = LX.makeContainer( [ "100%", "100%" ], "flex flex-col" );
            inboxTabs.add( "All mail", allMailContainer, { selected: true } );

            // Filter
            {
                const allMailFilter = LX.makeContainer( [ "100%", "64px" ], "p-2" );
                allMailContainer.appendChild( allMailFilter );
                const filterInput = new LX.TextInput(null, "", null, 
                    { inputClass: "outline", width: "100%", icon: "fa fa-magnifying-glass", placeholder: "Search..." } 
                );
                allMailFilter.appendChild( filterInput.root );
            }

            // Content
            {
                const allMailContent = LX.makeContainer( [ "100%", "calc(100% - 64px)" ], "flex flex-col p-4 gap-2 overflow-scroll" );
                allMailContainer.appendChild( allMailContent );

                const addMail = ( sender, subject, content, date, tags ) => {
                    const msgContent = LX.makeContainer( [ "100%", "auto" ], 
                        "flex flex-col border p-3 rounded-lg gap-2 select-none" );
                    allMailContent.appendChild( msgContent );

                    // Name, subject, date
                    {
                        const msgInfo = LX.makeContainer( [ "100%", "auto" ], "flex flex-col gap-0.5" );
                        msgContent.appendChild( msgInfo );

                        const msgNameDate = LX.makeContainer( [ "100%", "auto" ], "flex flex-row" );
                        msgInfo.appendChild( msgNameDate );

                        // Name + Date
                        {
                            const msgName = LX.makeContainer( [ "auto", "auto" ], "font-semibold text-md" );
                            msgName.innerHTML = sender;
                            msgNameDate.appendChild( msgName );

                            const msgDate = LX.makeContainer( [ "auto", "auto" ], "fg-tertiary text-sm ml-auto self-center" );
                            msgDate.innerHTML = date;
                            msgNameDate.appendChild( msgDate );
                        }

                        const msgSubject = LX.makeContainer( [ "100%", "auto" ], "font-semibold text-sm" );
                        msgSubject.innerHTML = subject;
                        msgInfo.appendChild( msgSubject );
                    }
                    const msgText = LX.makeContainer( [ "100%", "auto" ], "text-sm line-clamp-2 fg-tertiary" );
                    msgText.innerHTML = content;
                    msgContent.appendChild( msgText );
                    const msgTags = LX.makeContainer( [ "100%", "auto" ], "flex flex-row gap-0.5 font-semibold" );
                    for( const tag of tags )
                    {
                        msgTags.appendChild( LX.badge( tag, "sm", { asElement: true } ) );
                    }
                    msgContent.appendChild( msgTags );
                };

                LX.requestJSON( "data/example_mail_data.json", (data) => {
                    for( const item of data )
                    {
                        addMail( item.name, item.subject, item.content, item.date, item.tags );
                    }
                } )
            }

            inboxTabs.add( "Unread", document.createElement('div'));
        }

        // Manage Message Preview
        {
            right.root.className += " rounded-lg";
        }
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