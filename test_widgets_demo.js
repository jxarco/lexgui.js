import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';

window.LX = LX;

// Init library and get main area
let area = LX.init();

area.addMenubar( m => {
    m.addButtons( [
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

// split main area
var [ middle, right ] = area.split({ sizes:["67%","33%"], minimizable: true });

// split left area
var [left, center] = middle.split({ sizes:["50%", null], minimizable: true });

// add panels
var panelA = left.addPanel();
var panelB = center.addPanel();
var panelC = right.addPanel();

fillPanels();

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanels() {
    
    const comboValues = [
        { value: 'left', selected: true, icon: 'fa fa-align-left' },
        { value: 'center', icon: 'fa fa-align-center' },
        { value: 'right', icon: 'fa fa-align-right' }
    ]

    // Test buttons
    {
        panelA.branch("Classic Buttons", { closed: true });
        panelA.addButton(null, "Classic", null);
        panelA.addButton(null, "Primary", null, { buttonClass: "primary" });
        panelA.addButton(null, "Secondary", null, { buttonClass: "secondary" });
        panelA.addButton(null, "Accent", null, { buttonClass: "accent" });
        panelA.addButton(null, "Contrast", null, { buttonClass: "contrast" });
        panelA.addButton(null, "Warning", null, { buttonClass: "warning" });
        panelA.addButton(null, "Error", null, { buttonClass: "error" });
        panelA.branch("Outline Buttons", { closed: true });
        panelA.addButton(null, "Classic Outline", null, { buttonClass: "outline" });
        panelA.addButton(null, "Primary Outline", null, { buttonClass: "primary outline" });
        panelA.addButton(null, "Secondary Outline", null, { buttonClass: "secondary outline" });
        panelA.addButton(null, "Accent Outline", null, { buttonClass: "accent outline" });
        panelA.addButton(null, "Contrast Outline", null, { buttonClass: "contrast outline" });
        panelA.addButton(null, "Warning Outline", null, { buttonClass: "warning outline" });
        panelA.addButton(null, "Error Outline", null, { buttonClass: "error outline" });
        panelA.branch("Dashed Buttons", { closed: true });
        panelA.addButton(null, "Classic Dashed", null, { buttonClass: "dashed" });
        panelA.addButton(null, "Primary Dashed", null, { buttonClass: "primary dashed" });
        panelA.addButton(null, "Secondary Dashed", null, { buttonClass: "secondary dashed" });
        panelA.addButton(null, "Accent Dashed", null, { buttonClass: "accent dashed" });
        panelA.addButton(null, "Contrast Dashed", null, { buttonClass: "contrast dashed" });
        panelA.addButton(null, "Warning Dashed", null, { buttonClass: "warning dashed" });
        panelA.addButton(null, "Error Dashed", null, { buttonClass: "error dashed" });
        panelA.branch("Disabled Buttons", { closed: true });
        panelA.addButton(null, "Classic", null, { disabled: true});
        panelA.addButton(null, "Primary", null, { disabled: true, buttonClass: "primary" });
        panelA.addButton(null, "Secondary", null, { disabled: true, buttonClass: "secondary" });
        panelA.addButton(null, "Accent", null, { disabled: true, buttonClass: "accent" });
        panelA.addButton(null, "Contrast", null, { disabled: true, buttonClass: "contrast" });
        panelA.addButton(null, "Warning", null, { disabled: true, buttonClass: "warning" });
        panelA.addButton(null, "Error", null, { disabled: true, buttonClass: "error" });
        panelA.branch("Advanced Buttons", { closed: true });
        panelA.addButton("Icon Button", "Not used", null, { icon: "fa fa-skull" });
        panelA.addButton(null, LX.makeIcon( "circle-plus" ).innerHTML + "Button with Icon Start", null);
        panelA.addButton(null, "Button with Icon End" + LX.makeIcon( "circle-plus" ).innerHTML, null);
        panelA.addButton(null, "With a Badge" + LX.badge("+99", "accent sm"));
        panelA.addArray("Array Opener Button", [1, 2, 3]);
        panelA.addComboButtons("Classic Combo", comboValues);
        panelA.addComboButtons("Toggle Combo", comboValues, { toggle: true });
        panelA.addComboButtons("No Selection Combo", comboValues, { noSelection: true });
    }

    // Test Inputs
    {
        panelA.branch("Classic TextInputs", { xclosed: true });
        panelA.addText(null, "Classic", null);
        panelA.addText(null, "Primary", null, { inputClass: "primary" });
        panelA.addText(null, "Secondary", null, { inputClass: "primary" });
        panelA.addText(null, "Accent", null, { inputClass: "primary" });
        panelA.addText(null, "Contrast", null, { inputClass: "primary" });
        panelA.addText(null, "Warning", null, { inputClass: "primary" });
        panelA.addText(null, "Error", null, { inputClass: "primary" });
    }

    // Test Checkboxes
    {
        panelB.branch("Checkboxes", { closed: true });
        panelB.addCheckbox(null, true, null, { className: "x", label: "Classic" });
        panelB.addCheckbox(null, true, null, { className: "primary", label: "Primary" });
        panelB.addCheckbox(null, true, null, { className: "secondary", label: "Secondary" });
        panelB.addCheckbox(null, true, null, { className: "accent", label: "Accent" });
        panelB.addCheckbox(null, true, null, { className: "contrast", label: "Contrast" });
        panelB.addCheckbox(null, true, null, { className: "warning", label: "Warning" });
        panelB.addCheckbox(null, true, null, { className: "error", label: "Error" });
    }

    // Test Toggles
    {
        panelB.branch("Classic Toggles", { closed: true });
        panelB.addToggle(null, true, null, { label: "Classic" });
        panelB.addToggle(null, true, null, { className: "primary", label: "Primary" });
        panelB.addToggle(null, true, null, { className: "secondary", label: "Secondary" });
        panelB.addToggle(null, true, null, { className: "accent", label: "Accent" });
        panelB.addToggle(null, true, null, { className: "contrast", label: "Contrast" });
        panelB.addToggle(null, true, null, { className: "warning", label: "Warning" });
        panelB.addToggle(null, true, null, { className: "error", label: "Error" });
        panelB.branch("Outline Toggles", { xclosed: true });
        panelB.addToggle(null, true, null, { label: "Classic" });
        panelB.addToggle(null, true, null, { className: "primary outline", label: "Primary" });
        panelB.addToggle(null, true, null, { className: "secondary outline", label: "Secondary" });
        panelB.addToggle(null, true, null, { className: "accent outline", label: "Accent" });
        panelB.addToggle(null, true, null, { className: "contrast outline", label: "Contrast" });
        panelB.addToggle(null, true, null, { className: "warning outline", label: "Warning" });
        panelB.addToggle(null, true, null, { className: "error outline", label: "Error" });
    }
}