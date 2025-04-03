import { LX } from 'lexgui';
import 'lexgui/components/codeeditor.js';

window.LX = LX;

// Init library and get main area
let area = LX.init();

// split main area
var [ middle, right ] = area.split({ sizes:["67%","33%"], minimizable: true });

// split left area
var [left, center] = middle.split({ sizes:["50%", null], minimizable: true });

// add panels
var sidePanel = left.addPanel();
fillPanel( sidePanel );

// **** **** **** **** **** **** **** **** **** **** **** **** 

function fillPanel( panel ) {
    
    // Test buttons
    {
        panel.branch("Classic Buttons", { closed: true });
        panel.addButton(null, "Classic", null);
        panel.addButton(null, "Primary", null, { buttonClass: "primary" });
        panel.addButton(null, "Secondary", null, { buttonClass: "secondary" });
        panel.addButton(null, "Accent", null, { buttonClass: "accent" });
        panel.addButton(null, "Contrast", null, { buttonClass: "contrast" });
        panel.addButton(null, "Warning", null, { buttonClass: "warning" });
        panel.addButton(null, "Error", null, { buttonClass: "error" });
        panel.branch("Outline Buttons", { closed: true });
        panel.addButton(null, "Classic Outline", null, { buttonClass: "outline" });
        panel.addButton(null, "Primary Outline", null, { buttonClass: "primary outline" });
        panel.addButton(null, "Secondary Outline", null, { buttonClass: "secondary outline" });
        panel.addButton(null, "Accent Outline", null, { buttonClass: "accent outline" });
        panel.addButton(null, "Contrast Outline", null, { buttonClass: "contrast outline" });
        panel.addButton(null, "Warning Outline", null, { buttonClass: "warning outline" });
        panel.addButton(null, "Error Outline", null, { buttonClass: "error outline" });
        panel.branch("Dashed Buttons", { closed: true });
        panel.addButton(null, "Classic Dashed", null, { buttonClass: "dashed" });
        panel.addButton(null, "Primary Dashed", null, { buttonClass: "primary dashed" });
        panel.addButton(null, "Secondary Dashed", null, { buttonClass: "secondary dashed" });
        panel.addButton(null, "Accent Dashed", null, { buttonClass: "accent dashed" });
        panel.addButton(null, "Contrast Dashed", null, { buttonClass: "contrast dashed" });
        panel.addButton(null, "Warning Dashed", null, { buttonClass: "warning dashed" });
        panel.addButton(null, "Error Dashed", null, { buttonClass: "error dashed" });
        panel.branch("Disabled Buttons", { closed: true });
        panel.addButton(null, "Classic", null, { disabled: true});
        panel.addButton(null, "Primary", null, { disabled: true, buttonClass: "primary" });
        panel.addButton(null, "Secondary", null, { disabled: true, buttonClass: "secondary" });
        panel.addButton(null, "Accent", null, { disabled: true, buttonClass: "accent" });
        panel.addButton(null, "Contrast", null, { disabled: true, buttonClass: "contrast" });
        panel.addButton(null, "Warning", null, { disabled: true, buttonClass: "warning" });
        panel.addButton(null, "Error", null, { disabled: true, buttonClass: "error" });
        panel.branch("Advanced Buttons", { xclosed: true });
        panel.addButton("Icon Button", "Not used", null, { icon: "fa fa-skull" });
        panel.addButton(null, LX.makeIcon( "circle-plus" ).innerHTML + "Button with Icon Start", null);
        panel.addButton(null, "Button with Icon End" + LX.makeIcon( "circle-plus" ).innerHTML, null);
        panel.addButton(null, "With a Badge" + LX.badge("+99", "accent sm"));
        panel.addArray("Array Opener Button", [1, 2, 3]);
        panel.addComboButtons("Alignment", [
            {
                value: 'left',
                selected: true,
                icon: 'fa fa-align-left',
                callback: (value, event) => {
                    console.log(value);
                }
            }, {
                value: 'center',
                icon: 'fa fa-align-center',
                callback: (value, event) => {
                    console.log(value);
                }
            }, {
                value: 'right',
                disabled: true,
                icon: 'fa fa-align-right',
                callback: (value, event) => {
                    console.log(value);
                }
            }
        ], { /* toggle: true, noSelection: true */ });
    }
}