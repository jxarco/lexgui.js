// init library and get main area
let area = LX.init();

// menu bar
area.addMenubar( m => {

    // {options}: callback, icon, short

    m.add( "Add/");
    m.add( "Scene/New Scene", () => { console.log("New scene created!") });
    m.add( "Scene/");
    m.add( "Scene/Open Scene", { icon: "fa-solid fa-folder-open", short:  "S", callback: () => { console.log("Opening SCENE Dialog") } } );
    m.add( "Scene/Open Recent/hello.scene", name => { console.log("Opening " + name) });
    m.add( "Scene/Open Recent/goodbye.scene", name => { console.log("Opening " + name) });
    m.add( "Project/Project Settings" );
    m.add( "Project/Export", { icon: "fa-solid fa-download" });
    m.add( "Project/Export/DAE", { icon: "fa-solid fa-cube", short: "D", callback: () => { console.log("Exporting DAE...") }} );
    m.add( "Project/Export/GLTF", { short:  "G" } );
    m.add( "Debug/Search Help", { icon: "fa-solid fa-magnifying-glass", short:  "F1", callback: () => { window.open("./docs/") }});
    m.add( "Debug/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
    m.add( "Debug/Support LexGUI/Do it" );
   
    m.addButtons( [
        {
            title: "Play",
            icon: "fa-solid fa-play",
            callback:  (domEl) => { 
                console.log("play!"); 
                domEl.classList.toggle('fa-play'), domEl.classList.toggle('fa-stop');
            }
        },
        {
            title: "Pause",
            icon: "fa-solid fa-pause",
            disabled: true,
            callback:  (domEl) => { console.log("pause!") }
        },
        {
            icon: "fa-solid fa-magnifying-glass",
            callback:  (domEl) => { console.log("glass!") }
        }
    ]);
    
    m.setButtonIcon("Github", "fa-brands fa-github", () => {window.open("https://github.com/jxarco/lexgui.js/")})
    m.setButtonImage("lexgui.js", "images/icon_godot_version.png", () => {window.open("https://github.com/jxarco/lexgui.js/")}, {float: "left"})
});

// split main area
var [_left,right] = area.split({sizes:["83%","17%"]});

// split main area
var [left,middle] = _left.split({sizes:["20%","80%"]});

// split left area
var [up, bottom] = middle.split({type: 'vertical', sizes:["70vh","30vh"]});

var kfTimeline = null;
var clipsTimeline = null;
var curvesTimeline = null;

bottom.onresize = bounding => {
    if(kfTimeline) kfTimeline.resize( [ bounding.width, bounding.height ] );
    if(clipsTimeline) clipsTimeline.resize( [ bounding.width, bounding.height ] );
    if(curvesTimeline) curvesTimeline.resize( [ bounding.width, bounding.height ] );
}

// another menu bar
bottom.addMenubar( m => {
    m.add( "Output", e => { 
        console.log(e); 
    });
    m.add( "Debugger", e => { 
        console.log(e); 
    });
    m.add( "Search Results", e => { 
        console.log(e); 
    });
    m.add( "Audio", e => { 
        console.log(e); 
    });
    m.add( "Animation", e => { 
        console.log(e); 
    });
    m.add( "Shader Editor", e => { 
        console.log(e); 
    });
} );

var bottom_panel = bottom.addPanel({id: "bottom-panel"});
fillBottomPanel( bottom_panel ); 

// Get new content area to fill it
const top_tabs = up.addTabs();

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.style.width = "100%";
canvas.style.height = "100%";

const resize_canvas = ( bounding ) => {
    canvas.width = bounding.width;
    canvas.height = bounding.height;
};

top_tabs.add( "Node_3D", canvas, true, resize_canvas );
top_tabs.add( "Scene_1", document.createElement('div'));

// add on resize event to control canvas size
top_tabs.area.onresize = resize_canvas;

// add widgets
fillRightSide( right );
fillLeftSide( left );

const img = new Image();
img.src = "images/godot_canvas.png";

function loop(dt) {
    
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillRightSide( area ) {
    
    const tabs = area.addTabs({ fit: true });

    var inspector_panel = panel = new LX.Panel();
    var node_panel = new LX.Panel();
    var history_panel = new LX.Panel();
    
    LX.ADD_CUSTOM_WIDGET( 'Skeleton', {
        // icon: "fa-dice-d6",
        default: {
            'position': [0, 0],
            'velocity': [0, 0, 0],
            'color': [0, 0, 0, 0],
            'hex_color': '#000',
            'high_res': false
        }
    });

    const skeleton_instance = {
        'hex_color': '#f5f505',
        'high_res': true
    };

    panel.addTitle("Mesh Instance 3D", {icon: "fa-brands fa-hashnode"});

    panel.branch("Skeleton");
    panel.addText("Skin", "...");
    panel.addSkeleton("Skeleton", skeleton_instance);
    panel.merge();

    panel.addTitle("Geometry Instance 3D", {icon: "fa-regular fa-square-full", icon_color: "#d63434"});
    panel.branch("Geometry", {closed: true});
    panel.branch("Global Illumination", {closed: true});
    panel.branch("Visibility Range", {closed: true});
    panel.merge();
    panel.addTitle("Node 3D", {icon: "fa-regular fa-circle", icon_color: "#fff"});
    panel.branch("Transform", {closed: true});
    panel.branch("Visibility", {closed: true});
    panel.merge();
    
    tabs.add( "Inspector", inspector_panel );
    tabs.add( "Node", node_panel );
    tabs.add( "History", history_panel );
}

function fillLeftSide( area ) {
    
    const tabs = area.addTabs({ fit: true });

    var scene_panel = panel = new LX.Panel();
    var import_panel = new LX.Panel();
    var files_panel = new LX.Panel();

    tabs.add( "Scene", scene_panel );
    tabs.add( "Import", import_panel );
    tabs.add( "Files", files_panel );

    // add data tree

    let scene_data = {
        'id': 'Node 3D',
        'children': [
            {
                'id': 'WorldEnvironment',
                'icon': 'fa-solid fa-globe',
                'closed': true,
                'children': [
                    {
                        'id': 'node_1_1',
                        'icon': 'fa-solid fa-cube',
                        'children': [],
                        'actions': [
                            {
                                'name': 'Open script',
                                'icon': 'fa-solid fa-scroll',
                                'callback': function(node) {
                                    console.log(node.id + ": Script opened!")
                                }
                            }
                        ]
                    }
                ]
            },
            {
                'id': 'AnimatedSprite3D',
                'icon': 'fa-solid fa-film',
                'closed': true,
                'children': [
                    {
                        'id': 'node_2_1',
                        'icon': 'fa-solid fa-circle',
                        'children': []
                    }
                ]
            }
        ]
    };

    // this is optional!
    const tree_icons = [
        {
            'name':'Add node',
            'icon': 'fa-solid fa-plus',
            'callback': () => { console.log("Node added!") }
        },
        {
            'name':'Instantiate scene',
            'icon': 'fa-solid fa-link',
            'callback': () => { console.log("Scene instantiated!") }
        }
    ];

    window.tree = panel.addTree("Scene Tree", scene_data, { 
        icons: tree_icons, 
        // filter: false,
        onevent: (event) => { 
            console.log(event.string());

            switch(event.type) {
                case LX.TreeEvent.NODE_SELECTED: 
                    if(event.multiple)
                        console.log("Selected: ", event.node); 
                    else
                        console.log(event.node.id + " selected"); 
                    break;
                case LX.TreeEvent.NODE_DBLCLICKED: 
                    console.log(event.node.id + " dbl clicked"); 
                    break;
                case LX.TreeEvent.NODE_CONTEXTMENU: 
                    LX.addContextMenu( event.multiple ? "Selected Nodes" : event.node.id, event.value, m => {

                        // {options}: callback, color

                        m.add( "Select Children", () => console.log("select children") );
                        m.add( "Clone", { callback: () => console.log("Clone"), color: "#0d5" } );
                        m.add( "Components/Transform");
                        m.add( "Components/MeshRenderer");
                        m.add( "Move before sibling" );
                        m.add( "Move after sibling" );
                        m.add( "Move to parent" );
                        m.add( "Delete" );
                    });
                    break;
                case LX.TreeEvent.NODE_DRAGGED: 
                    console.log(event.node.id + " is now child of " + event.value.id); 
                    break;
                case LX.TreeEvent.NODE_RENAMED:
                    console.log(event.node.id + " is now called " + event.value); 
                    break;
                case LX.TreeEvent.NODE_VISIBILITY:
                    console.log(event.node.id + " visibility: " + event.value); 
                    break;
            }
        }
    });    
}

function fillRightBottomPanel( panel, tab ) {
    
    panel.clear();

    panel.branch("Bottom", {icon: "fa-solid fa-table-list"});

    if(tab == 'Empty')
    {
        panel.addText(null, "Some Disabled Text", null, { disabled: true })

        // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1, showValue: true, editable: true, callback: (value, event) => {
            panel.setValue('HeadRoll Value', value);
        } });
    }
    else if(tab == 'Horizontal')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                callback: p => {
                    p.addTitle("Discord tab");
                    p.addButton(null, "Connect");
                }
            },
            { 
                name: "Second tab",
                icon: "fa-brands fa-twitter",
                callback: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            { 
                name: "Third tab",
                icon: "fa-brands fa-github",
                callback: p => {
                    p.addTitle("Github tab");
                    p.addButton(null, "Go", () => {window.open("https://github.com/jxarco/lexgui.js/")});
                }
            }
        ], { vertical: false /*, showNames: true */});

        panel.addText(null, "Widgets below are out the tabs", null, { disabled: true })

        // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1, showValue: true, editable: true, callback: (value, event) => {
            panel.setValue('HeadRoll Value', value);
        } });
    }
    else if(tab == 'Vertical')
    {
        panel.addTabs([
            { 
                name: "First tab",
                icon: "fa-brands fa-discord",
                callback: (p, content) => {
                    p.addTitle("Discord tab");
                    p.addButton("Apply", "Add button to branch", (value, event) => {
                        p.queue( content );
                        p.addButton(null, "Hello");
                        p.clearQueue();
                    });
                }
            },
            { 
                name: "Second tab",
                icon: "fa-brands fa-twitter",
                callback: p => {
                    p.addTitle("Twitter tab");
                    p.addText("Tweet", "", null, {placeholder: "Tyler Rake 2"});
                }
            },
            { 
                name: "Third tab",
                icon: "fa-brands fa-github",
                callback: p => {
                    p.addTitle("Github tab");
                    p.addButton(null, "Go", (value, event) => {window.open("https://github.com/jxarco/lexgui.js/")});
                }
            }
        ]);

        /************** */
        // Custom Widget

        LX.ADD_CUSTOM_WIDGET( 'Shader', {
            // icon: "fa-dice-d6",
            default: {
                'position': [0, 0],
                'velocity': [0, 0, 0],
                'color': [0, 0, 0, 0],
                'hex_color': '#000',
                'high_res': false
            }
        });

        const shader_instance = {
            'hex_color': '#f5f505',
            'high_res': true
        };

        panel.addShader( "PBR Shader", shader_instance, (instance) => { console.log(instance) } );
        panel.addShader( "Empty", null );

        /************** */
    }

    panel.merge();
}

function fillBottomPanel( panel ) {
    
    // add widgets to panel branch
    panel.branch("Information", {icon: "fa fa-circle-info"});
    panel.addText("Camera", "Canon EOS 80D", null, {disabled: true}); 
    panel.addText("Serial number", "194E283DD", (value, event) => {
        console.log(value);
    });
    panel.addTextArea("Notes", "", (value, event) => {
        console.log(value);
    }, { placeholder: 'Some notes...' });
    panel.addButton("Apply", "Add button to branch", (value, event) => {
        const branch = panel.getBranch("Information");
        panel.queue( branch.content );
        panel.addButton(null, "Hello");
        panel.clearQueue();
    });

    panel.branch("A collapsed branch", {closed: true});
    panel.addText(null, "Nothing here", null, {disabled: true});
    panel.merge();
}

function createAssetDialog() {

    let dialog = new LX.Dialog('Non Manual Features lexemes', (p) => {

        const preview_actions = [
            {
                name: 'Print Clip',
                type: 'clip',
                callback: ( item ) => {
                    console.log(item);
                }
            },
            {
                name: 'Print Image',
                type: 'image',
                callback: ( item ) => {
                    console.log(item);
                }
            },
            {
                name: 'Common',
                callback: ( item ) => {
                    console.log(item);
                }
            }
        ];

        asset_browser = new LX.AssetView({ 
            skip_browser: true,
            skip_navigation: true,
            preview_actions: preview_actions
        });

        p.attach( asset_browser );
        let asset_data = [];
        const values = ['brow_lowerer.png', 'lexgui.png', 'icon.png', 'json.png'];

        for(let i = 0; i < values.length; i++){
            let data = {
                id: values[i], 
                type: "clip",
                src: "images/" + values[i].toLowerCase(),
            }
            asset_data.push(data);
        }

        asset_data.push({
            id: "script.png", 
            type: "image",
            src: "images/script.png",
        });
        
        asset_browser.load( asset_data, (e,v) => {
            switch(e.type) {
                case LX.AssetViewEvent.ASSET_SELECTED: 
                    if(e.multiple)
                        console.log("Selected: ", e.item); 
                    else
                        console.log(e.item.id + " selected"); 
                    break;
                case LX.AssetViewEvent.ASSET_DELETED: 
                    console.log(e.item.id + " deleted"); 
                    break;
                case LX.AssetViewEvent.ASSET_CLONED: 
                    console.log(e.item.id + " cloned"); 
                    break;
                case LX.AssetViewEvent.ASSET_RENAMED:
                    console.log(e.item.id + " is now called " + e.value); 
                    break;
            }
        })
    },{ title:'Lexemes', close: true, minimize: false, size: ["80%"], scroll: true, resizable: true, draggable: true });
   
}