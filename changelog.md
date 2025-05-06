# lexgui.js changelog

## dev

Widgets:
- Fixed Title Widget class override.
- Fixed Select list focusout issue.
- Added `success` theme color to supported widgets.
- Table active filters are now displayed in each filter button.

Added a few more icon solid variants.
Minor CSS tweaks.

## 0.6.1 (master)

Widgets:
- Support back `options.selected` in ComboButtons Widget as `ValueType|Array<ValueType>`.
- Fixed Drag icon in Number/Vector widgets modifying layout.

Fixed some issues when resizing initially hidden Areas.
Fixed Dropdown issue sometimes opening all submenus on open Menubar entries.
Fixed Dropdown creation crash when no input items.
Fixed AssetView content on max height and scroll.
Improved robustness of `LX.getSupportedDOMName`.

## 0.6.0

`LX.init` now has to called using `await`.
Use Dropdowns elements in menubar.
Remove legacy:
  - Removed `options.selected` in ComboButtons Widget.
  - Removed FA icons.
Added LucideIcons as main icon provider.
`LX.makeIcon`: Support for solid variants in supported icons (also using `iconName@variant`).
`LX.registerIcon`: Support for classes and attributes for svg and path elements.
Refactor `strictViewport` to `layoutMode` (app|document) in `LX.init`.
Added support for Sheet element (hiding dialog at the window sides).
Support disabling layer (zindex) update in `LX.makeDraggable` using `options.updateLayers`.
Fixed minor issues with some Nodegraph elements.
Added `className` to `LX.sameLine(numberOfWidgets, class)` to allow customization when using `numberOfWidgets`.
Added support for right sidebar.
Restyled Number Widget units to avoid layout trashing when recomputing units span location.

CodeEditor:
  - Remove language images and use SVG instead.
  - Scrolling fixes.
  - Fixed minor css issues.

Docs updated:
  - Added interactive code examples for widgets.
  - Improved widget list parameters and options.
  - Added live examples for sidebar and menubar.

## 0.5.11

Widgets:
- Form: Add more custom options. Fixed issue using a String as Form field.

Added `LX.makeElement` to expand support for creating other HTML types.
Added more theme utils methods: `LX.getTheme` and `LX.switchTheme`.
Minor css fixes.

## 0.5.10

Fixed Date Calendar popover not opening.
Fixed creation of AssetView inner areas.
Fixed Sidebar content resize issue on creation.
ChangeLanguage CodeEditor commands are no longer shown if no opened editor.
Minor css fixes.

## 0.5.9

Widgets:
- Added new `DatePicker` Widget (also via `Panel.addDate` and using `LX.Calendar` class).
- Adapt `ColorPicker` as popover in ColorInput Widget.
- Minor Button CSS fixes.

Added `LX.Popover` class to create generic popovers with custom content.
Expose `LX.NodeTree` in global namespace.
Docs updated.

## 0.5.8

Widgets:
- Added missing support for `NodeTree.refresh()` on Array data.

Timeline:
- Fix setSelectedItems.
- Keyframe colors.
- Integrate swap buttons.
- Fixed scroll bar and zoom.
- Hiding tracks on left panel also hides canvas tracks.
- Fix track lines match the left panel tree.

VideoEditor:
- Fix crop and area reload crop.
- Timebar fixes.

Fixed area resizing issues. Improved performance (less layout trashing).
Added missing support for swap functionality in OverlayButtons.
Added tracking (`letter-spacing`) CSS class utilities.
Fixed minor issues with ColorPicker mouse tracking.

## 0.5.7

`LX.makeIcon` now accepts `options` as second parameter (`title`, `iconClass`, `svgClass`).
Exposed `LX.setStrictViewport(value)` to allow switching manually.
Fixed ColorPicker minor issues.
Fixed Examples and SourceCode links in docs.
Added more CSS class utilities.

## 0.5.6

Widgets:
- ColorInput Widget now uses a new custom `ColorPicker`.
- `selectAll` input is now checked when every row is selected in Table Widget.
- Added new OTPInput widget.
- SwapButton functionality `options.swap` supported in default Button Widget.

Added `LX.makeKbd(keys, extraClass)` to create keyboard shortcuts.
Fixed Badges theming issues.
Docs updated.

## 0.5.5

Table Widget:
- Added support `options.filterValue`.
- Fixed filtering when row data contains HTML tags.

Other Widgets:
- Support for TextInput `options.fit`.
- Select Widget box alignment using custom overflow container (default is closer Area).
  - `options.overflowContainer`, `options.overflowContainerX`, `options.overflowContainerY`

Added Area Tabs option `allowDelete`, `false` by default.
Fixed some minor CodeEditor issues.
Added `LX.stripHTML(html)` to get clean text from HTML string.
Fixed all "popup" menus position in scrolled window.
Added support for options `side`, `active` and `offset` in `LX.asTooltip(trigger, content, options)`.
Allowed users to register extra icons in LX.ICONS using `LX.registerIcon`.
Icons and Customization docs updated.
Minor CSS improvements. Added more class utilities.

## 0.5.4

Widgets:
- Added support for disabling resize in TextArea Widget `options.resize: false`.
- Added support for using LX.ICONS on Button Widgets.
- Tooltips supported in Button Widget `options.tooltip`. Uses either `options.title` or `name` as content.

`LX.makeContainer` now accepts `innerHTML` and `parent` params.
Started work on tooltips `LX.asTooltip(trigger, content)`.
Added support for adding a class to LexGUI root on init `options.rootClass`.
Added support for adding a class to Sidebar/Menubar areas on `Area.addSidebar` and `Area.addMenubar`.
Added `options.asElement` to return `LX.badge` as HTMLElement instead of html string.
Support for using LX.ICONS on sidebar entry icons. Keep FA icons as legacy by now.
Minor CSS improvements. Added more class utilities.

## 0.5.3

Widgets:
- Fixed Select Widget filter issues.
- Fixed Color Widget not updating hex code on pasting value.

`Panel.endLine` now accepts `className` as first param to allow more customization.
Remove `gap` by default in inline widgets container.
Changed global font family to Geist Sans.
Started support for tailwind-like utility css classes.
Fixed Select Widget inside Dialog when opening above selector.
Improve styling for supported widgets. Better consistency.
Added new demo example showcasing all widgets.

## 0.5.2

Table Widget:
- Fixed manual-sort not modifying inner data.
- Use Dropdown for menu actions `options.onMenuAction`.
- Added initial support for data filters. `options.filter` and `options.customFilters`.

Fixed some widget resizing issues.
No `justify` by default in inline widgets. Use `Panel.endLine(justify)` instead.
Fixed preview image in AssetView.
General styling fixes.
Docs updated.

## 0.5.1

Widgets:
- Added support for `text centering` all/specific columns in Table Widget.
- Fixed widget content size when using `options.nameWidth`. First fix for sizes in inline widgets.
- Fixed issue in Tree Widget when selecting from code using `NodeTree.select`.
- Support for closing all Node items recursively by using `Alt+Close` on a specific node.

Fixed Area tabs drag&drop when `fit` mode.
Fixed issue on open/destroy dropdown.
Fixed label text wrap on Checkbox&Toggle widgets.
Added `contrast` theme for supported Widgets.

## 0.5.0

Widgets:
- Created classes for each widget to create them at any place.
- `Panel.addTabs`: Renamed to `addTabSections`. Added name parameter (1st). Returns `TabSections` widget instance.
- `Panel.addDropdown`: Renamed to `addSelect`. Returns `Select` widget instance.
- Added support for labels in Select Widget.
- `Panel.addContent` and `Panel.addImage` now accepts name as first parameter.
- Title: `Panel.addTitle` now returns `Title` widget instance, not its inner title HTMLElement.
- Tree: `Panel.addTree` now returns `Tree` widget instance, not its inner `NodeTree`.
- Table: Added support for `options.sortable` rows and `title` for row action icons.

Fixed Select Widget overflow inside dialog.
New `DropdownMenu` class.
Added `displaySelected` option to Sidebar to display selected entry.
Started Notifications docs.
Added Icons/ page in docs.
Fixed Menubar entries auto-open when menubar is focused.
Minor CSS tweaks.

## 0.4.2

Widgets:
- RadioGroup: Add name parameter (1st).
- Added `options.hideName` for supported widgets: Don't use label but add `name` to allow registering.

Sidebar subentries are now collapsable (`true` by default).
Support `options.header` and `options.footer` for custom sidebar elements.
Added `extraClass` parameter for `LX.makeIcon`.
Fixed Menubar.getButton.
Fixed some CSS icon alignment issues.

## 0.4.1

Widgets:
- Text: Skip callback if no changes.

Updated NodeGraph Editor sidebar.
Expose `Sidebar.update` to rebuild from current items.
Added `force` option to force sidebar collapse status in `Sidebar.toggleCollapsed(force)`.
Added Sidebar search bar to filter entries.
Set overflow ellipsis on large toast texts.
Fixed Menubar menus with scroll > 0.
Removed padding when no PocketDialog content.
Sidebar docs updated.

## 0.4.0

Widgets:
- Support new RadioGroup Widget.
- Support Checkbox `options.label`.
- Fixed Uncheck selectAll on uncheck row (TableWidget).

Removed hardcoded font-sizes. Added media queries for screeen size and ppi.
Start support for `LX.makeCollapsible`.
Started adding LX.ICONS to avoid using external libs for icons.
Updated Sidebar. Cooler and better customization.
Fixed AssetView navigation buttons.
Fixed few dialog dragging issues.
Removed debug clog.
Minor CSS tweaks.

## 0.3.0

Widgets:
- Support toggle mode and button disabled in ComboButtons Widget.
- Added new Range Slider Widget.

Support for toasts `LX.toast(title, description, options)`;
Improve Menubar menus look & feel.
Fixed menubar buttons vertical alignment.
Fixed menubar entries when adding `OverlayButtons` in the area below.
Restyled area tabs (row mode).
Dialog tweaks. Renamed `class` to `className` for Dialog options.
Timeline theme updated support light scheme color.
Minor CSS tweaks.
Minor bug fixes.

## 0.2.0

Widgets:
- Support for new Table Widget `Panel.addTable()`.
- Fixed dropdown horizontal overflow through limits.
- Improved style of ComboButtons Widget.
- Support for disabled Dropdown and other improvements.

Add `options.strictViewport` to LX.init().
Improve dialog animations.
CodeSnippet: Allow hiding line number `lineNumbers`.
Renamed "Global search bar" to "Command bar";
Added `LX.registerCommandbarEntry()` to add entries to the command bar (Ctrl+Space).
Added `LX.setCommandbarState()` to show the command bar from code.
Command bar animated (as others dialogs).
Added wip for `LX.makeContainer()` to create default containers with specific class options.
Force dark color scheme by default.
Support `autoTheme` at LX.init options.
Add minified build versions.
Docs updated.
Minor bug fixes.

## 0.1.46

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