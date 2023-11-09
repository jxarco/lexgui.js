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
    m.setButtonImage("lexgui.js", "data/icon_godot_version.png", () => {window.open("https://github.com/jxarco/lexgui.js/")}, {float: "left"})
});

// split main area
var [_left,right] = area.split({sizes:["83%","17%"]});

// split main area
var [left,middle] = _left.split({sizes:["20%","80%"]});

// split left area
var [up, bottom] = middle.split({type: 'vertical', sizes:["70vh","30vh"]});

const bottom_tabs = bottom.addTabs({folding: "up"});

// Output
const output_area = new LX.Area({width: "calc(100% - 8px)", height: "calc(100% - 8px)"});
output_area.root.style.backgroundColor = LX.getThemeColor('global-color-secondary');
output_area.root.style.margin = "4px";
output_area.root.style.borderRadius = "6px";

const output_panel = output_area.addPanel();
output_panel.addTextArea(null, "Godot Engine v4.1.stable.official (c) 2007-present Juan Linietsky, Ariel Manzur & Godot Contributors.", null, {
    height: "100%",
    disabled: true,
    style: {
        'font-family': 'Inconsolata, monospace',
        'border': 'none',
        'resize': 'none'
    }
});

// Debugger
const debugger_area = new LX.Area({width: "calc(100% - 8px)", height: "calc(100% - 8px)"});
const debugger_tabs = debugger_area.addTabs();

debugger_tabs.add( "Stack Trace",  document.createElement('div'));
debugger_tabs.add( "Errors",  document.createElement('div'));

// const debug_tabs = output_area.addTabs();

bottom_tabs.add( "Output", output_area);
bottom_tabs.add( "Debugger", debugger_area);
bottom_tabs.add( "Search Results", document.createElement('div'));
bottom_tabs.add( "Audio", document.createElement('div'));
bottom_tabs.add( "Animation", document.createElement('div'));
bottom_tabs.add( "Shader Editor", document.createElement('div'));

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

top_tabs.area.addOverlayButtons( [ 
    [
        {
            name: "Select",
            icon: "fa fa-arrow-pointer",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Move",
            icon: "fa-solid fa-arrows-up-down-left-right",
            img: "https://webglstudio.org/latest/imgs/mini-icon-gizmo.png",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Rotate",
            icon: "fa-solid fa-rotate-right",
            callback: (value, event) => console.log(value),
            selectable: true
        },
        {
            name: "Unselect",
            icon: "fa-solid fa-x",
            callback: (value, event) => console.log(value),
            selectable: true
        }
    ]
], { float: "vtl" } );

// add widgets
fillRightSide( right );
fillLeftSide( left );

const img = new Image();
img.src = "data/godot_canvas.png";
img.onload = () => {
    requestAnimationFrame(loop);
}

function drawImageScaled(img, ctx) {
    var hRatio = canvas.width  / img.width    ;
    var vRatio =  canvas.height / img.height  ;
    var ratio  = Math.min ( hRatio, vRatio );
    var centerShift_x = ( canvas.width - img.width*ratio ) / 2;
    var centerShift_y = ( canvas.height - img.height*ratio ) / 2;  
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(img, 0,0, img.width, img.height,
                       centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);  
 }

function loop(dt) {
    
    var ctx = canvas.getContext("2d");
    drawImageScaled(img, ctx);
    // var aspect = img.width / img.height;
    // ctx.drawImage(img, 0, 0, canvas.width * aspect, canvas.height);
    requestAnimationFrame(loop);
}

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

    panel.addFile("Mesh");
    panel.branch("Skeleton");
    panel.addText("Skin", "...");
    panel.addNumber("NUMBER", 12);
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

