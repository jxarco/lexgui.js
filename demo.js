// init library and get main area
let area = LX.init();

// change global properties after init
// LX.DEFAULT_NAME_WIDTH = "10%";
// LX.DEFAULT_SPLITBAR_SIZE = 15;
// LX.OPEN_CONTEXTMENU_ENTRY = 'mouseover';

// LX.message("I'm in another position", null, { position: [10, 10] });
// LX.message("Welcome to Lexgui", "Welcome!", { draggable: true })

// menu bar
area.addMenubar( m => {

    // {options}: callback, icon, short

    m.add( "Scene/New Scene", () => { console.log("New scene created!") });
    m.add( "Scene/Open Scene", { icon: "fa-solid fa-folder-open", short: "CTRL + O" } );
    m.add( "Scene/Open Recent/hello.scene", () => { console.log("Opening 'hello.scene'") });
    m.add( "Scene/Open Recent/goodbye.scene" );
    m.add( "Project/Project Settings" );
    m.add( "Project/Export", { icon: "fa-solid fa-download" });
    m.add( "Project/Export/DAE", { icon: "fa-solid fa-cube", short: "D" } );
    m.add( "Project/Export/GLTF", { short:  "G" } );
    m.add( "Editor/Settings", { icon: "fa-solid fa-gears" } );
    m.add( "Help", { short:  "F1" } );
    m.add( "Help/Search Help", { icon: "fa-solid fa-magnifying-glass" });
    m.add( "Help/Support LexGUI/Please", { icon: "fa-solid fa-heart" } );
    m.add( "Help/Support LexGUI/Do it" );
});

// split main area
area.split({sizes:["70%","30%"]});
var [left,right] = area.sections;

// split left area
left.split({type: 'vertical', sizes:["80vh","20vh"]});
var [up, bottom] = left.sections;

// split right area
right.split({type: 'vertical', sizes:["70vh","30vh"]});
var [rup, rbottom] = right.sections;

// another menu bar
rbottom.addMenubar( m => {
    m.add( "Skeleton", e => { console.log(e); fillRightBottomPanel( side_bottom_panel, e.name ); });
    m.add( "Blendshapes", e => { console.log(e); fillRightBottomPanel( side_bottom_panel, e.name ); });
    m.add( "Test3rd", e => { console.log(e); });
}, { float: 'center' } );

// add canvas to left upper part
var canvas = document.createElement('canvas');
canvas.width = up.root.clientWidth;
canvas.height = up.root.clientHeight;
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.backgroundColor = "#666";
up.attach( canvas );

let scene_data = {
    'id': 'root',
    'children': [
        {
            'id': 'node_1',
            'children': [
                {
                    'id': 'node_1_1',
                    'visible': false,
                    'children': []
                },
                {
                    'id': 'node_1_2',
                    'children': [],
                    'actions': [
                        {
                            'name': 'Open script',
                            'icon': 'fa-solid fa-scroll',
                            'callback': function() {
                                console.log("Script opened!")
                            }
                        }
                    ]
                }
            ]
        },
        {
            'id': 'node_2',
            'children': []
        }
    ]
};

// add panels
var side_panel = rup.addPanel();
fillPanel( side_panel );

var side_bottom_panel = rbottom.addPanel();
fillRightBottomPanel( side_bottom_panel, 'Skeleton' );

var bottom_panel = bottom.addPanel();
fillBottomPanel( bottom_panel );

function loop() {
    
    var ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = side_panel.getValue('Font size') + "px Monospace";

    // Get values from panel widgets (e.g. color value)
    ctx.fillStyle = side_panel.getValue('Background');

    const pos_2d = side_panel.getValue('2D Position');
    ctx.fillText("This is a 2d canvas", pos_2d[0], pos_2d[1]);
    ctx.fillText("Lexgui.js @jxarco", pos_2d[0] + 6, pos_2d[1] + 48);

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanel( panel ) {
    
    // add data tree

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
                    console.log(event.node.id + " selected"); 
                    break;
                case LX.TreeEvent.NODE_DBLCLICKED: 
                    console.log(event.node.id + " dbl clicked"); 
                    break;
                case LX.TreeEvent.NODE_CONTEXTMENU: 
                    LX.addContextMenu( "Node", event.value, m => {

                        // {options}: callback, color

                        m.add( "Select Children", () => console.log("select children") );
                        m.add( "Clone", { callback: () => console.log("Clone"), color: "#0d5" } );
                        m.add( "Components/Transform");
                        m.add( "Components/MeshRenderer");
                        m.add( "Move before sibling" );
                        m.add( "Move after sibling" );
                        m.add( "Move to parent" );
                        m.add( "Delete", { color: "#f33" });
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
        },
    });    

    // add widgets to panel branch
    panel.branch("Preferences", {icon: "fa-solid fa-gear", filter: true});
    panel.addColor("Background", [1, 0.1, 0.6], (value, event) => {
        console.log("Color: ", value);
    });
    panel.addText("Extensions", "", null, {placeholder: "e.g. ColorPicker"});
    panel.addButton(null, "Apply changes");
    panel.merge();

    // another branch
    panel.branch("Other things");
    panel.addDropdown("Pages", ["Federico", "Garcia", "Lorca"], "Garcia", (value, event) => {
        console.log(value);
    });
    panel.addNumber("Font size", 36, (value, event) => {
        console.log(value);
    }, { min: 1, max: 48 });
    panel.addVector2("2D Position", [350, 450], (value, event) => {
        console.log(value);
    }, { min: 0, max: 1024 });
    panel.addVector3("Velocity", [0.1, 0.4, 0.5], (value, event) => {
        console.log(value);
    });
    panel.addVector4("Shader color", [0.3, 0.3, 0.5, 1], (value, event) => {
        console.log(value);
    });
    panel.addSeparator();
    panel.addTitle("Configuration");
    panel.addCheckbox("Enable", true, (value, event) => {
        console.log(value);
    });
    panel.addCheckbox("This is disabled", false, null, {disabled: true});
    panel.end();
}

function fillRightBottomPanel( panel, tab ) {
    
    panel.clear();

    if(tab == 'Skeleton')
    {
        panel.branch("Skeleton widgets", {icon: "fa-solid fa-table-list"});
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
            }
        ], { vertical: false /*, showNames: true */});

         // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1 });
    }
    else if(tab == 'Blendshapes')
    {
        panel.branch("Blendshapes widgets", {icon: "fa fa-table-list"});
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
            }
        ]);

         // update panel values uising widget name
        panel.addNumber("HeadRoll Value", 0, (value, event) => {
            panel.setValue('HeadRoll', value);
        }, { min: -1, max: 1, step: 0.1 });
        panel.addProgress("HeadRoll", 0, { min: -1, max: 1 });
    }

    panel.end();
   
}

function fillBottomPanel( panel ) {
    
    // add widgets to panel branch
    panel.branch("Information", {icon: "fa fa-circle-info"});
    panel.addText("Camera", "Canon EOS 80D", null, {disabled: true}); 
    panel.addText("Serial number", "194E283DD", (value, event) => {
        console.log(value);
    });
    panel.addText(null, "This has a console.log callback", (value, event) => {
        console.log(value);
    }, { trigger: 'input' });
    panel.addButton("Apply", "Print event", (value, event) => {
        console.log(event);
    });
    panel.merge();

    panel.branch("A collapsed branch", {closed: true});
    panel.addText(null, "Nothing here", null, {disabled: true});
    panel.end();
}






