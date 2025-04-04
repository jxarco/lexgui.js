import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';

window.LX = LX;

// Init library and get main area
let area = LX.init();

area.addMenubar( m => {
    m.addButtons( [
        {
            title: "Toggle Sections",
            icon: "fa-solid fa-eye",
            callback:  (event, swapValue) => { closedDefault = !closedDefault; fillPanels(); }
        },
        {
            title: "Change Theme",
            icon: "fa-solid fa-moon",
            swap: "fa-solid fa-sun",
            callback:  (event, swapValue) => { LX.setTheme( swapValue ? "light" : "dark" ) }
        }
    ]);
    
    m.setButtonIcon("Github", "fa-brands fa-github", () => {window.open("https://github.com/jxarco/lexgui.js/")})
    m.setButtonImage("lexgui.js", "images/icon.png", () => {window.open("https://jxarco.github.io/lexgui.js/")}, {float: "left"})
}, { sticky: false });

var [ middle, right ] = area.split({ sizes:["70%","30%"], minimizable: true });
var [ left, center ] = middle.split({ sizes:["50%", null], minimizable: true });

// add panels
var panelA = left.addPanel();
var panelB = center.addPanel();
var panelC = right.addPanel();

let closedDefault = false;

fillPanels();

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanels() {
    
    panelA.root.innerHTML = "";
    panelB.root.innerHTML = "";
    panelC.root.innerHTML = "";

    const comboValues = [
        { value: 'left', selected: true, icon: 'fa fa-align-left' },
        { value: 'center', icon: 'fa fa-align-center' },
        { value: 'right', icon: 'fa fa-align-right' }
    ];

    const selectValues = ["Godot", "Unity", "Unreal Engine", "Visual Studio", "Visual Studio Code"];
    const selectValuesWithLabels = ["@Engines", "Godot", "Unity", "Unreal Engine", "@Apps", "Visual Studio", "Visual Studio Code"];

    const loremText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

    // Test buttons
    {
        const buttonsArea = new LX.Area( { width: "100%", height: "auto" } );
        var [ buttonsLeft, buttonsRight ] = buttonsArea.split({ sizes:["50%","50%"] });
        panelA.attach( buttonsArea.root );

        const buttonsLeftPanel = buttonsLeft.addPanel();
        const buttonsRightPanel = buttonsRight.addPanel();

        buttonsLeftPanel.branch("Classic Buttons", { closed: closedDefault });
        buttonsLeftPanel.addButton(null, "Classic", null);
        buttonsLeftPanel.addButton(null, "Primary", null, { buttonClass: "primary" });
        buttonsLeftPanel.addButton(null, "Secondary", null, { buttonClass: "secondary" });
        buttonsLeftPanel.addButton(null, "Accent", null, { buttonClass: "accent" });
        buttonsLeftPanel.addButton(null, "Contrast", null, { buttonClass: "contrast" });
        buttonsLeftPanel.addButton(null, "Warning", null, { buttonClass: "warning" });
        buttonsLeftPanel.addButton(null, "Error", null, { buttonClass: "error" });
        buttonsLeftPanel.branch("Disabled Buttons", { closed: closedDefault });
        buttonsLeftPanel.addButton(null, "Classic", null, { disabled: true});
        buttonsLeftPanel.addButton(null, "Primary", null, { disabled: true, buttonClass: "primary" });
        buttonsLeftPanel.addButton(null, "Secondary", null, { disabled: true, buttonClass: "secondary" });
        buttonsLeftPanel.addButton(null, "Accent", null, { disabled: true, buttonClass: "accent" });
        buttonsLeftPanel.addButton(null, "Contrast", null, { disabled: true, buttonClass: "contrast" });
        buttonsLeftPanel.addButton(null, "Warning", null, { disabled: true, buttonClass: "warning" });
        buttonsLeftPanel.addButton(null, "Error", null, { disabled: true, buttonClass: "error" });
        buttonsLeftPanel.branch("Advanced Buttons", { closed: closedDefault });
        buttonsLeftPanel.addButton("Icon Button", "Not used", null, { icon: "fa fa-skull" });
        buttonsLeftPanel.addButton(null, LX.makeIcon( "circle-plus" ).innerHTML + "Button with Icon Start", null);
        buttonsLeftPanel.addButton(null, "Button with Icon End" + LX.makeIcon( "circle-plus" ).innerHTML, null);
        buttonsLeftPanel.addButton(null, "With a Badge" + LX.badge("+99", "accent sm"));
        buttonsRightPanel.branch("Outline Buttons", { closed: closedDefault });
        buttonsRightPanel.addButton(null, "Classic Outline", null, { buttonClass: "outline" });
        buttonsRightPanel.addButton(null, "Primary Outline", null, { buttonClass: "primary outline" });
        buttonsRightPanel.addButton(null, "Secondary Outline", null, { buttonClass: "secondary outline" });
        buttonsRightPanel.addButton(null, "Accent Outline", null, { buttonClass: "accent outline" });
        buttonsRightPanel.addButton(null, "Contrast Outline", null, { buttonClass: "contrast outline" });
        buttonsRightPanel.addButton(null, "Warning Outline", null, { buttonClass: "warning outline" });
        buttonsRightPanel.addButton(null, "Error Outline", null, { buttonClass: "error outline" });
        buttonsRightPanel.branch("Dashed Buttons", { closed: closedDefault });
        buttonsRightPanel.addButton(null, "Classic Dashed", null, { buttonClass: "dashed" });
        buttonsRightPanel.addButton(null, "Primary Dashed", null, { buttonClass: "primary dashed" });
        buttonsRightPanel.addButton(null, "Secondary Dashed", null, { buttonClass: "secondary dashed" });
        buttonsRightPanel.addButton(null, "Accent Dashed", null, { buttonClass: "accent dashed" });
        buttonsRightPanel.addButton(null, "Contrast Dashed", null, { buttonClass: "contrast dashed" });
        buttonsRightPanel.addButton(null, "Warning Dashed", null, { buttonClass: "warning dashed" });
        buttonsRightPanel.addButton(null, "Error Dashed", null, { buttonClass: "error dashed" });
        buttonsRightPanel.branch("Combo Buttons", { closed: closedDefault });
        buttonsRightPanel.addComboButtons("Classic Combo", comboValues);
        buttonsRightPanel.addComboButtons("Toggle Combo", comboValues, { toggle: true });
        buttonsRightPanel.addComboButtons("No Selection Combo", comboValues, { noSelection: true });
    }

    const checkArea = new LX.Area( { width: "100%", height: "auto" } );
    var [ checkLeft, checkRight ] = checkArea.split({ sizes:["50%","50%"] });
    panelA.attach( checkArea.root );

    const checkLeftPanel = checkLeft.addPanel();
    const checkRightPanel = checkRight.addPanel();

    // Test Checkboxes
    {
        checkLeftPanel.branch("Checkboxes", { closed: closedDefault });
        checkLeftPanel.addCheckbox(null, true, null, { className: "x", label: "Classic" });
        checkLeftPanel.addCheckbox(null, true, null, { className: "primary", label: "Primary" });
        checkLeftPanel.addCheckbox(null, true, null, { className: "secondary", label: "Secondary" });
        checkLeftPanel.addCheckbox(null, true, null, { className: "accent", label: "Accent" });
        checkLeftPanel.addCheckbox(null, true, null, { className: "contrast", label: "Contrast" });
        checkLeftPanel.addCheckbox(null, true, null, { className: "warning", label: "Warning" });
        checkLeftPanel.addCheckbox(null, true, null, { className: "error", label: "Error" });
    }

    // Radiogroup
    {
        checkLeftPanel.branch("Radio Group", { closed: closedDefault });
        checkLeftPanel.addRadioGroup( null, "Notify me about...", [ "All new messages", "Direct messages and mentions", "Nothing" ], null, { className: "accent", xdisabled: true, selected: 1 } );
        checkLeftPanel.addRadioGroup( null, "Disabled Options...", [ "All new messages", "Direct messages and mentions", "Nothing" ], null, { disabled: true, selected: 1 } );
    }

    // Test Toggles
    {
        checkRightPanel.branch("Classic Toggles", { closed: closedDefault });
        checkRightPanel.addToggle(null, true, null, { label: "Classic" });
        checkRightPanel.addToggle(null, true, null, { className: "primary", label: "Primary" });
        checkRightPanel.addToggle(null, true, null, { className: "secondary", label: "Secondary" });
        checkRightPanel.addToggle(null, true, null, { className: "accent", label: "Accent" });
        checkRightPanel.addToggle(null, true, null, { className: "contrast", label: "Contrast" });
        checkRightPanel.addToggle(null, true, null, { className: "warning", label: "Warning" });
        checkRightPanel.addToggle(null, true, null, { className: "error", label: "Error" });
        checkRightPanel.branch("Outline Toggles", { closed: closedDefault });
        checkRightPanel.addToggle(null, true, null, { label: "Classic" });
        checkRightPanel.addToggle(null, true, null, { className: "primary outline", label: "Primary" });
        checkRightPanel.addToggle(null, true, null, { className: "secondary outline", label: "Secondary" });
        checkRightPanel.addToggle(null, true, null, { className: "accent outline", label: "Accent" });
        checkRightPanel.addToggle(null, true, null, { className: "contrast outline", label: "Contrast" });
        checkRightPanel.addToggle(null, true, null, { className: "warning outline", label: "Warning" });
        checkRightPanel.addToggle(null, true, null, { className: "error outline", label: "Error" });
    }

    // Test Inputs
    {
        panelB.branch("Text Inputs", { closed: closedDefault });
        panelB.addText(null, "Classic", null);
        panelB.addText(null, "Outline", null, { inputClass: "outline" });
        panelB.addText(null, "Dashed", null, { inputClass: "dashed" });
        panelB.addText(null, "Disabled TextInput", null, { disabled: true });
        panelB.branch("TextArea Inputs", { closed: closedDefault });
        panelB.addTextArea("TextArea", loremText, null, { placeholder: 'Some notes...' });
        panelB.addTextArea("Fit Height TextArea", loremText, null, { placeholder: 'Some notes...', fitHeight: true });
        // panelB.addText(null, "Warning TextInput", null, { warning: true });
        panelB.branch("Number Inputs", { closed: closedDefault });
        panelB.addNumber("Classic", 0, null);
        panelB.addNumber("Disabled", 0, null, { disabled: true });
        panelB.addNumber("With Units", 12, null, { units: "px" });
        panelB.addNumber("With Slider", 0, null, { min: 1, max: 48, step: 1});
        panelB.branch("Vector Inputs", { closed: closedDefault });
        panelB.addVector2("Classic Vec2", [0, 0], null);
        panelB.addVector3("Disabled Vec3", [0, 0, 0], null, { disabled: true });
        panelB.addVector4("Classic Vec4", [0, 0, 0, 0], null);
        panelB.branch("Color Inputs", { closed: closedDefault });
        panelB.addColor("From Hex Color", "#b7a9b1");
        panelB.addColor("From RGB Color", [1, 0.1, 0.6]);
        panelB.addColor("Disabled Color", "#b7a9b1", null, { disabled: true });
        panelB.branch("Range Inputs", { closed: closedDefault });
        panelB.addRange("Classic", 1, null, { min: 0, max: 10, step: 1 });
        panelB.addRange("Primary", 7, null, { min: 0, max: 10, step: 1, className: "primary" });
        panelB.addRange("Secondary", 4, null, { min: 0, max: 10, step: 1, className: "secondary" });
        panelB.addRange("Accent", 3, null, { min: 0, max: 10, step: 1, className: "accent" });
        panelB.addRange("Contrast", 5, null, { min: 0, max: 10, step: 1, className: "contrast" });
        panelB.addRange("Warning", 2, null, { min: 0, max: 10, step: 1, className: "warning" });
        panelB.addRange("Error", 6, null, { min: 0, max: 10, step: 1, className: "error" });
        panelB.addRange("Inverted", 22, null, { min: 20, max: 48, step: 1, left: true});
        panelB.addRange("NoFill", 10, null, { min: 1, max: 48, step: 1, fill: false});
        panelB.addRange("Disabled", 29, null, { min: 1, max: 48, step: 1, disabled: true});
        panelB.branch("Select Inputs", { closed: closedDefault });
        panelB.addSelect("Classic", selectValues, "Unity", null);
        panelB.addSelect("With Labels", selectValuesWithLabels, "Unity", null);
        panelB.addSelect("With Filter", selectValuesWithLabels, "Godot", null, {filter: true, placeholder: "Search tools..."});
        panelB.addSelect("Custom Empty Msg", selectValuesWithLabels, "Unreal Engine", null, {filter: true, emptyMsg: "No tools found.", placeholder: "Search tools..."});
        panelB.addSelect("With Images", [{value:"Godot", src: "https://godotengine.org/assets/press/logo_vertical_color_light.png"}, {value: "Unity", src: "https://logos-world.net/wp-content/uploads/2023/01/Unity-Logo.png"}, {value:"Unreal Engine", src: "https://cdn2.unrealengine.com/ue-logo-stacked-unreal-engine-w-677x545-fac11de0943f.png"}], "Godot", null);
        panelB.addSelect("With Gifs", [{value:"Godot", src: "https://i.redd.it/4vepr95bye861.gif"}, {value: "Unity", src: "https://i.gifer.com/origin/db/db3cb258e9bbb78c5851a000742e5468_w200.gif"}, {value:"Unreal Engine", src: "https://d3kjluh73b9h9o.cloudfront.net/original/4X/e/0/d/e0deb23c10cc7852c6ab91c28083e27f9c8228f8.gif"}], "Godot", null);
        panelB.branch("File Inputs", { closed: closedDefault });
        panelB.addFile("Classic" );
        panelB.addFile("Disabled", null, { disabled: true } );
    }

    // Tree
    {
        panelC.branch("Data Tree", { closed: closedDefault });
        let sceneData = {
            'id': 'root',
            'children': [
                {
                    'id': 'node_1',
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
                    'id': 'node_2',
                    'icon': 'fa-solid fa-circle-play',
                    'children': []
                },
                {
                    'id': 'node_3',
                    'children': [
                        {
                            'id': 'node_3_1',
                            'icon': 'fa-solid fa-cube',
                            'children': []
                        },
                        {
                            'id': 'node_3_2',
                            'icon': 'fa-solid fa-cube',
                            'children': []
                        }
                    ]
                }
            ]
        };
    
        // This is optional!
        const treeIcons = [
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
    
        panelC.addTree(null, sceneData, { 
            icons: treeIcons, 
            addDefault: true,
            onevent: (event) => { 
                switch(event.type) {
                    case LX.TreeEvent.NODE_CONTEXTMENU: 
                        const m = event.panel;
                        m.add( "Components/Transform");
                        m.add( "Components/MeshRenderer");
                        break;
                }
            }
        });
    }

    // Table
    {
        panelC.branch("Tables", { closed: closedDefault });
        panelC.addTable(null, {
            head: [ "Name", "Status", "Priority" ],
            body: [
                [ "Alice", "In Progress", "High" ],
                [ "Bob", "Backlog", "Medium" ],
                [ "Prince", "Canceled", "Low" ],
                [ "Sean", "Done", "High" ],
                [ "Carter", "In Progress", "Medium" ],
                [ "James", "Backlog", "Low" ],
                [ "Mickey", "Todo", "Low" ],
                [ "Charlie", "Canceled", "Low" ],
                [ "Potato", "Todo", "High" ]
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
            onMenuAction: ( index, tableData ) => {
                return [
                    { name: "Export" },
                    { name: "Make a copy" },
                    { name: "Favourite" }
                ]
            }
        });
    }

    // Tags
    {
        panelC.branch("Tags", { closed: closedDefault });
        panelC.addTags("Game Tags", "2d, karate, ai, engine, ps5, console");
    }

    // Layers
    {
        panelC.branch("Layers", { closed: closedDefault });
        panelC.addLayers("Layers", 10);
    }
}