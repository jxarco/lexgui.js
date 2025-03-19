# lexgui.js changelog

## 0.1.47 (dev)

- CodeSnippet: Allow hiding line number `lineNumbers`.
- Force dark color scheme by default.
- Support `autoTheme` at LX.init options.

## 0.1.46 (master)

Support for creating code snippets `LX.makeCodeSnippet(options)`.
Added `swapButton.swap()` and Add `swapButton.setState(bool)`.
Fixed colored buttons in light theme.
Fixed GoogleSans.ttf usage.

## 0.1.45

Widgets:
- New Counter Widget added `Panel.addCounter`.
- Support for colored and sized buttons.
- Fixed editable Progress Widget.
- Added 'pattern' and 'required' options to Text Widget.
- Form Widget now uses entry validation (pattern) before callback.
- Improved Tags Widget style.

Added initial support for creating footers.
Added `LX.buildTextPattern(options)` for Input validation.
Allow changing light/dark schemes manually `LX.setTheme`.
Start support for swap icons (now at `Menubar.addButtons`).
Started theme customization docs page.
Added theme-swap button to demo and docs.

## 0.1.44

VideoEditor:
- Support cropping video area.

Added new `Toggle` Widget (same usage as Checkbox).
Adding support for inline HTML badges `LX.badge(text)`.
Checkbox, Progressbar, FileInput css updated.
Improved Form widget.
Begin support for light-scheme appearance.
Fix ContextMenu position when scroll > 0.
Minor bug fixes.
Docs Updated.

## 0.1.43

CodeEditor:
- Support C and CMake highlight.
- Support C/C++ header files highlighting.

Support `options.skipRoot` on LX.init.
Support lock aspect ratio in Panel.addSize
Improved CSS for overlay buttons `Area.addOverlayButtons`.
Docs Updated. Add interactive widget examples.
Minor CSS general changes.
Minor bug fixes.

## 0.1.42

AssetView:
- Support custom element title on hover for Content layout mode `options.useNativeTitle`
- AssetView onRefreshContent option

CodeEditor:
- Renamed all option parameters (remove snake case).
- Fixed tab language override.
- Support addTab() and loadFile() with options (`options.language`)
- Fixed XML highlighting

Support options.title in Panel.addButton.
[Area] `options.no_append` -> `options.skipAppend`.
[Area] `options.skip_default_area` -> `options.skipDefaultArea`.
Minor bug fixes.

## 0.1.41

AssetView:
- Renamed all option parameters (remove snake case).
- Support showing `lastModified` file data.

Knob Widget:
- Support disabled option.
- Add `options.snap` = # subdivisions for value snapping.

More Timeline refactor and fixes.
Removed `LX.UTILS.clamp`. Still can be used in `LX.clamp`.
Update Fontawesome CSS to v6.7.2.

## 0.1.40

New widget: Form. Series of Text + Submit Button using form data (Object).
Fix non-unique "input-filter" id.
Improved Number/Vector mouse interaction with `pointerLock`.
Updated docs.

## 0.1.39

New widget: Pad. Bidimensional slider.
`LX.makeDraggable` now supports 'absolute' and 'fixed' positions.
Fix passing onDragStart/onMove functions to Dialogs.
Minor bug fixes.

## 0.1.38

Timeline: Fixed timeline signals and added callbacks

Number/Vector widgets:
    - Support for onPress&onRelease for catching mouse events.
    - Added `setLimits` for min, max, step parameters.

Added Size Widget (N dimension number widget).
Minor bug fixes.

## 0.1.37

Audio:
- Start new audio widgets (Knob wip).

Timeline:
- Major refactor of Timeline
- Fixed examples

Allow unit labels for Number widgets.
Fixed Number/Vector precision.
Fixed ContextMenu position on creation over window size.
Minor bug fixes.

## 0.1.36

Default skipCallback as `true` on emit widget signal.
Add some vec2 math functions.
`Panel.addTabs` support for onCreate (prev. `callback`) and onSelect callbacks.
Apply original `display` when showing Areatab.
Minor styling tweaks.
Documentation updates.

## 0.1.35

Fix `moveOutAction` clamping X value.
Add values in curve only with MOUSE_LEFT_CLICK.
Curve redraw and color widget styling fixes.
Minor general styling improvements.

## 0.1.34

Fix setValue on Checkbox.
Fix position of Dropdown menu when content is scrolled.
`moveOutAction` option to delete or clamp curve points.
Minor tweaks.

## 0.1.33

Work on VideoEditor UI component.
Improvements Timeline.
Allow to select multiple options in AssetViewer.
Minor bug fixes.

## 0.1.32

Timeline:
- Allow addition of widgets in top bar.
- General improvements.
- Docs started.

New VideoEditor component (still wip).
Added skipCallback for `Widget.set()`. 
Minor bug fixes.

## 0.1.31

GraphEditor:
- Graph/function renaming.
- Copy/Paste nodes.

Fixed precision in Number/Vector widgets.
Minor bug fixes.

## 0.1.30

GraphEditor:
- Snap Multiplier (x1, x2, x3)
- Added Sidebar to change between graphs/functions.
- Start/Stop graph buttons in top buttons.
- Initial support for creating Graph Functions.
- Improved performance hiding nodes outside the viewport.
- Groundwork for graph/function renaming.
- Support "Autoconnect" nodes.
- Import/Export Groups + Move groups inside groups.

Support adding class to overlay buttons.
Add custom "title" on hover for Sidebar elements.
Added Sidebar.select method.
Improved select animation "fit" tabs.
Doc updates.
Minor bug fixes.

## 0.1.29

GraphEditor:
- Graphs front end (Nodes, links, groups).
- Editor stuff (Panning, zoom, moving elements, serialize graph, Snapping...)
- Basic execution functionality.

Improved draggable elements.
Added "onBeforeLoad" callback in File widget.
Minor bug fixes.

## 0.1.28

GraphEditor:
- Big refactor. Almost start from scratch.

Support for adding big icons Sidebars.
General CSS fixes and improvements.

## 0.1.27

Code Editor:
- Tab key follows fixed 4 space layout indentation.
- Support for removing indentation using "Shift+Tab".
- Support for changing number of tab spaces from the info panel.
- Minor bugfixes.

Support "maxWidth" as options when creating a widget.

## 0.1.26

Code Editor:
- Search Next Ocurrence using "Ctrl+D" (Duplicate line moved to "Alt+D")
- Previous selection is restored on undo.
- Get text to search from selection.
- Reverse search bugfixes.
- Pasting content now scrolls to follow cursor.

Minor fixes.

## 0.1.25

Code Editor:
- Added Ctrl+K + C/U Shortcuts to Comment/Uncomment lines.
- Improved WGSL highlighting.
- Minor bug fixes.

Added title attribute by default to Widget Name Dom elements.
Added value getter/setter for LIST widget.
Added updateValues method for modify list options in LIST widget.

## 0.1.24

Code Editor:
- Improved single and multiple cursor usability.
- Cursor can be added or removed using "Alt+LeftClick".
- Fixed clicks outside the code area.
- Minor bug fixes.

## 0.1.23

Code Editor:
- Begin integration of multiple cursors ("Ctrl+ArrowDown").
- Code tabs have new VS Code-alike style.
- Improved CSS highlighting.
- Add Undo Steps to some actions that were missing.
- When using Ctrl+G, the selected line is now highlighted.

Minor fixes.

## 0.1.22

Code Editor:
- Added REDO using "Ctrl+Y".
- Added FontSize customization. "Ctrl+PLUS", "Ctrl+MINUS" or "Ctrl+Wheel".
- Added "Ctrl+G" to scroll to specific line.

Minor fixes.

## 0.1.21

Code Editor:
- Added "Ctrl+F" to find text in code tabs.
- "Shift+Backspace" deletes word at current position.
- Added "Markdown" syntax highlighting. 
- Improved hightlighting of tag languages (HTML, Markdown, XML).

## 0.1.20

Code Editor:
- Active line is now hightlighted.
- Using CommitMono font (https://commitmono.com/) as the font for the Code Editor. 
- Added "Rust" syntax highlighting. 
- Improved all code selections (and some bugs fixed).
- Block comments are now working again (with bugs probably).

Minor fixes.

## 0.1.19

Code Editor:
- Add file explorer to Code Editor component. 

Minor fixes.