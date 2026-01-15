# lexgui.js changelog

## dev

Fixed TextInput not updating on browser autofill.
Allow support to disable: Array, DatePicker, Layers, List, Pad, Rate, and Tags components.
Add `options.mapIcon` to change Map2D opener button icon.
Added `destructive` class support for Dropdown items.

Form Component:
- Enter key now submits the form as native behaviour.
- Added `options.skipEnterSubmit` to disable the Enter submission.
- Per entry data `entry.submit` overrides the general form options.
- Docs updated.

## 8.2.2 (master)

AssetView:
- Added suppord for custom folder names in `onBeforeCreateFolder` using 1st resolve param.
- Fixed explorer NodeTree bug selecting items with spaces in the id.

Fixed toast css in light mode.
Minor fixes Sidebar CSS.

## 8.2.1

CodeEditor:
- Fixed `options.onReady` being called before processing lines.

VideoEditor:
- Added `resizeVideo` and `resizeControls` to update area sizes. They are automatically called by resize.
- Added `controlsComponents` object that holds all buttons and timebar that will be displayed in the ui.
- Added a `createControls` function to create different button layouts. It creates all buttons and then calls a layout creator.
- Added `createControlsLayout_0` and `createControlsLayout_1` with default button layouts.
- Added `controlsLayout` option to specify which default layout to use or a custom function.
- Added `onChangeState` and `onChangeLoop` user callbacks.
- Added `resetCropBtn`. Only displayed in layout 1.

VideoEditor TimeBar:
- `mousemove` and `mouseup` events now attach to document instead of canvas, for a better user experience.
- Added `unbind` function to remove document events.
- Fixed marker grabbing when both overlapped.

Added `LX.removeSignal`.
Expose DocMaker extension in LX.
Minor CSS fixes.

## 8.2

Use Tailwind (finally) to create and compile CSS.
Removed custom utility classes, refactored theme colors and every theme variable used in LX.
Cleaned main CSS, move generic component styling to classes.
Added `LX.twMerge` and `LX.mergeClass` to merge elements class names and allow overrides.
`LX.getCSSVariable` (old `LX.getThemeColor`) now allows to get colors with applied alpha using `color/{alpha}`.
Added new Avatar Component (see docs).
Added support for primary color theming using `LX.setThemeColor`.
Avatar Component in now used in Sidebar header and footer.
Added support for `oklch` format in ColorInput, new utils `LX.oklchToHex`.
Added Select `options.side` to force dropdown list alignment.
Added Vector `options.skipLock` to skip the lock button.
Fixed modal scroll bleed.
Fixed Commandbar position when page has vertical scroll.
Minor fixes Area Tabs' and Sidebar's CSS.

NodeTree:
- Refactored Event system to be compatible with AssetView events, using also cancellable events.

AssetView:
- Removed `options.onRefreshContent`.
- Added new `refreshContent`, `beforeRefreshContent` events.
- Added new `nodeDragged`, `beforeNodeDragged` events for Explorer node movements.
- Entering a folder now selects its folder item in the Explorer.

CodeEditor:
- Fixed NextOcurrence (Ctrl+D) bug.
- Fixed some issues with deleting using multiple cursors.
- Fixed Cursor deleting bug when merging multiple cursors.
- `options.callback` renamed to `options.onReady`, which is now called once the Editor is ready and visible.
- Pair keys `(), {}, "", ...` now only pair if no next char (or space).
- Added 3rd parameter to `setText(text, langString, _detectLanguage_)` to allow forcing language detection.

Other API Changes:
- `LX.getThemeColor` and `LX.setThemeColor` renamed to `LX.getCSSVariable` and `LX.setCSSVariable`.
- `LX.setSystemTheme` renamed to `LX.setSystemMode`.
- `LX.getTheme`, `LX.setTheme`, and `LX.switchTheme` renamed to `LX.getMode`, `LX.setMode`, and `LX.switchMode`.
- ComboButtons Component `options.float` now accepts `start, center, end` instead of `left, center, right`.
- Breadcrumb items `title` renamed to `name`.

## 8.1.2

Removed legacy code `CurvesTimeline` from `editor.html` example.

VideoEditor:
- Forced area to have position relative so cropArea is correctly positioned.

Timeline:
- Automatically calls `updateTheme` color on instance creation.

## 8.1.1

Fixed Table Component bug when there's a filter but no custom filters.
Fixed AssetView `onEnterFolder` not allowing async callbacks.

## 8.1.0

AssetView:
- Added CreateFolder implementation to the MoveItem dialog button.
- Added more event attributes, added also to docs.
- `enterFolder` event can now modify data.
- Passing user parameters through `resolve` call is now allowed.

New Component: Alert Dialog.
Use `dprint` to auto-format code.
Style improvements for Sheet, Number slider, Counter, and Range Components.
Improved Icons page using Pagination Component & moved to main page Menubar.
Added Counter Component docs.
Minor mobile version fixes.

## 8.0.0

From 8.0 (changed versioning to set `8` as the major version), the full library is written in TypeScript to facilitate integrations in newer frameworks (Builds are still available as a JS module with its extensions).
Replaced Skypack for jsDelivr CDN.
Aded new Spinner and Pagination Components.
Added support for `options.submit` in Form entries.
Added new utils: `LX.stripTags`, `LX.escapeRegExp`, and `LX.wildcardToRegExp`.
Refactored `Card` Component (see docs).
Dropdown item icons can be passed as already generated icons with `LX.makeIcon`.
Area Tabs drag & drop is now working without deleting tab content.
Calendar and CalendarRange month changes now correctly.
Code Editor multiline indentation now works properly on empty lines.
Fixed line color of Timeline curve tracks in light theme.
Fixed default collapsed state using `LX.makeCollapsible`.
Fixed Button with Swap and mustConfirm.
Added support for changing Button swap icons `Button.setSwapIcon`.

AssetView:
- Now used as an extension.
- Refactor event handling API to allow cancellable events (see docs).
- Added "Create Folder" action (with cancellable event).
- Added support for `Ctrl+Wheel` to increase grid item size in AssetView.
- Replace old pagination implementation for new Pagination Component.
- Add "Go to upper folder" button, next to Back, Forward, and Refresh navigation bar.
- Assets can now be dragged into either content or explorer folders.
- Added support for native "Move" item action with Folder selection dialog.
- Replace item Old ContextMenus for Dropdowns.
- Improved clone item renaming.
- Support `Open in Editor` for Script items.
- String search filter now allows expressions using wildcards (`*` and `?`).

Table Component:
- Support for Pagination (`options.pagination` and `options.rowsPerPage`).
- Sort Date strings by date.
- Added support for `options.hiddenColumns` and `options.showSelectedNumber`.
- `options.centered` now allows column indices or names.
- Added row `idx` to `options.rowActions` callback parameters `(idx, bodyData, table, event)`.
- Calendar filters now work as expected solving some minor issues.

Sidebar:
- Fixed selected entries CSS in light theme.
- Fixed entries separator not being visible due to content shrink.

Tags Component:
- Added skipDuplicates option.
- Focus input only when writing.

VideoEditor:
- `dragCropArea` renamed to `moveCropArea`.
- `moveCropArea` and `resizeCropArea` now expect values (either pixel or normalized coords) instead of an event.
- Resize and move events now work even while dragging outside of the area's scope.
- Added `setCropAreaHandles` to specify which resize handles should be visible.
- Added `options.handleStyle` to edit resize handle's style.

General API Changes:
- `BaseComponent` enum types moved to `ComponentType`.
- `LX.emit` -> `LX.emitSignal`.
- `LX.ADD_CUSTOM_COMPONENT` -> `LX.REGISTER_COMPONENT`.
- `LX.main_area` renamed to `LX.mainArea`.
- `Element.insertChildAtIndex` -> `LX.insertChildAtIndex`.
- `Element.getParentArea` -> `LX.getParentArea`.
- `Element.listen/ignore` -> `LX.listen/ignore`.
- `Element.hasClass/addClass` -> `LX.hasClas/addClass`.
- ItemArray Component renamed to ArrayInput.
- Removed support for Blank panel component.
- NodeGraph extension renamed to GraphEditor.
- Docmaker Extension API full changed (see docs).
- Inputs Class `nobg` renamed to `bg-none` for consistency.

Pages and Styling:
- "All components" example works now on mobile devices.
- New `colors/` page in main demo page.
- Improved and extended docs.
- Main Theme colors updates.
- Improved color consistency with darker tones.
- Added "dev" icons, Vscode, Godot, Unity, UnrealEngine, Go, Css, Android, and more.
- Fixed Badge CSS minor issues.
- Use `Inter` (https://fonts.google.com/specimen/Inter) as default font.
- Tailwind color palette with classes and css variables.
- Added more utility Tailwind style classes.

## 7.15.0

Minor fixes.
Docs updated.

AssetView:
- Added support for renaming items.
- Added support for `options.onItemDragged`.
- Added support for `options.itemContextMenuOptions` to customize item context menu entries.
- Added support select and preview also from the asset explorer.
- `AssetView.addItem` (previously `_addItem`) now updates the tree using optional `updateTree` param.
- Fixed some empty folder path issues.
- Fixed `lastModifiedDate` on preview some assets.
- Fixed clearing preview panel on delete item.
- Removed not used "Properties" item context menu entry.

## 7.14.0

CodeEditor:
- Added support for add/remove multi-line indentation.
- Improved language detection on copy text.
- Few more keywords added to JS and TS highlighting.
- Fixed `charWidth` value when editor font isn't loaded.
- Fixed autocomplete box position when opened near the window limit.
- Fixed autocomplete box issue when selecting options using arrows.
- Fixed issue loading files using drag&drop.
- Fixed tab visibility bug when using explorer mode.
- Fixed line swap minor setting incorrect active line.

## 7.13.0

Added `LX.validateValueAtPattern`.
TextInput now receive `options.pattern` as an Object, instead of text.
Added support for `options.email` in `LX.buildTextPattern`.

Form Component:
- Fixed `options.secondaryActionCallback`.
- Improve validation errors by adding field-specific error messages.

CodeEditor:
- Support for JS/TS String interpolation highlighting.
- Fixed Ctrl+Arrow horizontal scroll.
- Fixed some issues reseting cursor position.
- Fixed cursor horizontal scrolling issues.

## 7.12.0

Added support column actions in Table Component.

Timeline:
- Added `setTrackLock` method.
- Renamed `onLockTrack` to `onSetTrackLock`.
- Added `updateTrackTree` parameter to `setTrackState` and `deselectAllTracks`.
- Renamed `selectTrack` to `setTrackSelection`.

NodeTree:
- Fixed styling of actions button inputs.

## 7.11.0

Fixed `Menubar.getSubItem`.

Timeline:
- Adjust scroll if left panel size changes.
- Keyframe selection now uses the correct keyframeSize values.
- Added `onTrackTreeEvent`.
- On curve tracks, `Alt` key now saves state before modifying keyframes.
- Fixed tracks resize on refresh.

NodeTree Component:
- Item actions are now standard buttons instead of icons.
- Fix select when filter is present.
- Allow null id to unselect all.

TreeEvent:
- Added event attribute to store mouse/keyboard/system.
- Homogenised calls to TreeEvent so node, value and event are consistent.

## 7.10.0

Removed Fit-Tabs thumb CSS transition on `Tabs.add`.
Added Popover documentation.
Fixed `LX.codeSnippet` linesAdded/Removed options.
Fixed `Area.extend()` and `Area.reduce()` transitions.

AssetView:
- Added support for video elements.
- Fixed support for images using url with params.
- Added more supported image extensions.
- Updated documentation.

CodeEditor:
- Added support to `options.callback` to call when the editor is completely loaded.
- Docs updated.

Timeline:
- Added `Timeline.setKeyframeSize` and `Timeline.setTrackHeight`.
- Curve keyframes are visually clamped to the tracks' boundaries.
- Fixed `Add Keyframe` option in context menu.

VideoEditor:
- Minor functions refactor.
- Speed and loop buttons added to video controls.
- Fixed resize controls area bug.

## 7.9.0

Allow wheel/middle click in menubar buttons.
Pass RadioGroup name as argument to radio option callback.

CodeEditor:
- Fixed remove old selections on Select All.
- Fixed Find next occurrence cursors (ctrl+D).
- Added `CodeEditor.setCustomSuggestions(Array)`.

VideoEditor:
- Time marker ball improved to be showed above trim markers.
- Force to load all chunks of the video.
- Loop video manually done to fix sync.

## 7.8.0

Renamed AssetView "List" view to "Compact". Added better "List" view option.
Fixed undesired scroll in AssetView.
Support for Dropdown RadioGroup item option `closeOnClick` (default true).
Minor fixes Dropdown RadioGroup.

CodeEditor:
- Added support for `options.onSelectTab` function to call when selecting tabs.
- Added close button to search line box.
- Added `CodeEditor.clear` to clear panel signals.
- Minor fixes.

Timeline:
- Add `Timeline.clear()` function.

## 7.7.0

Fixed RangeInput double-slider issue where the min slider could go past the max slider.
Fixed legacy ContextMenu reposition bug.
Fixed contents not being displayed correctly in AssetView.

CodeEditor:
- Passing `indexOffset` in onCreateFile callback is now supported.
- Added support for:
  - `options.allowClosingTabs` and `options.allowLoadingFiles`.
  - `options.onCtrlSpace` and `options.onCreateStatusPanel`.
  - `options.customSuggestions` list for autocomplete.
  - `options.defaultTab` to decide wheter add default tab at initialization.
  - `options.newTabOptions` array to use a custom Dropdown on click "New tab +" button.
  - `options.onNewTab` function to skip default action on click "New tab +" button.
  - `options.onContextMenu` function to add custom actions on opening CM at any content.
- Set new args for: `options.onFilesLoaded( editorInstance, loadedTabs, numFilesLoaded )`.
- Delete word until cursor position is now Ctrl+Backspace instead of Shift+Backspace.
- `CodeEditor.addTab` now supports passing `options.codeLines` to start with some content.
- Fixed some comment lines issues. Added Comment block using Ctrl+K+B.
- Fixed horizontal scrolling in mobile devices.
- Fixed "End" action on Apple devices.
- Docs updated.

Timeline:
- Added setScroll function.

## 7.6.0

The last color scheme applied (dark|light) is now stored.
Added `LX.setSystemTheme()` to revert back auto color scheme mode.
Callbacks are now not skipped in Form Component, instead return validation errors `callback(value, errors, event)`.
Added support for `options.indexOffset (default -1 to append last)` on adding tabs to Tabs Area class.

Sidebar:
- Fixed checkbox change order in Checkbox entries.
- Added swap value to entry callback parameters (2nd).

CodeEditor:
- Added support to use different name for URL/Path loaded files.
- Added support to load initial files async using `options.filesAsync` list.

## 7.5.0

CodeEditor:
- Hotfixed issue not processing lines in some cases.
- Minor restyle tabs and added options for closing tabs.
- Support for `options.onCreateFile` callback to modify new file options.
- Replaced old context menus for new Dropdowns.

VideoEditor:
- Added callback functions when change start/end values.

Added `options.event` to Dropdown to offset position based on event position.
Added some more CSS classes.

## 7.4.0

Added `LX.toKebabCase`.

CodeEditor:
- Added support to togge status bar items by default.
- Scopes, symbols and block comments refactor to fix instabilities.
- Improved method-calls, variable symbols detection.
- New autocomplete item icons based on Symbols.
- Minor bugs fixed.

## 7.3.0

VideoEditor:
- Minor Controls sizes refactor.
- Fixed Controls event listeners.

CodeEditor:
- Improved scope detection.
- Added basic symbols detection to feed autocomplete.
- Fixed resizing and scrollbar issues.

## 7.2.0

Fixed AssetView Filter select.
Fixed tooltips on Dialog without modal.
Exposed LX.Timebar in VideoEditor extension.

CodeEditor:
- Fixed Ctrl+Wheel to modify font size.
- Added ZoomIn/ZoomOut buttons to Info Panel to modify font size.
- Selected Font size now persists locally using `localStorage`.
- Support for showing/hiding status bar elements.
- Improved syntax highlighting consistency using new HightlightRules.
- Added support for PHP and TypeScript highlighting.
- Started work on scope detection (enums, structs, methods, classes, etc.) for syntax highlighting.
- Added support for adding new custom language.

## 7.1.0

Added support for selecting custom Min, Max range in RangeInput component.
Added value labels to RangeInput component.
`LX.asTooltip` Updates:
- Now supports `options.offsetX`, `options.offsetY` and `options.callback`.
- Change content and offsets dynamically using `trigger.dataset["tooltipContent" | "tooltipOffsetX" | "tooltipOffsetY"]`.
Fixed Popovers using `options.reference`.

## 7.0.0

General/Utils:
- "Components" have been renamed to "Extensions".
- Every elements, widget, etc. is now a "Component".
- Added support for `LX.toCamelCase` and `LX.toTitleCase`.
- Polished CSS.
- Changed LexGUI brand icons.
- Unified code fonts. Using now CascadiaCode (https://github.com/microsoft/cascadia-code).

New Components:
- Skeleton Component (Feedback)
- Breadcrumb Component (Navigation)
- Rate Component (Data Input)

New "default" | "compact" layout spacing:
- `options.spacingMode` in LX.init
- `LX.setSpacingMode` and `LX.switchSpacing`

Component Updates:
- Badges:
  - Added `options.parent` to use them as notification indicators inside an element
  - Added `options.chip` to use as notification indicators alone
  - Added `options.callback` option on click.
- Toast:
  - Allow creation at left, center and right + top/bottom using `options.position`.
- Sidebar:
  - Added subitem option `options.content` to match main items.
  - Added entry option `options.skipSelection` to avoid selections even with `displaySelected`.
  - Support swap icons in entries.
  - Fixed subentry selection.
- Dropdowns:
  - Support radio button groups.
- AssetView:
  - Improved toolbar with Dropdowns. Now refreshes icons on change sort and layout modes.
- Table:
  - Added support for Calendar Date filter in Table Component.
- Other Bugfixes:
  - Fixed Select Component above placement on filter.
  - FIxed CodeEditor 'End' horizontal scrolling.
  - Fixed CodeEditor CSS harcoded Tab height.
  - Fixed dropdown, popovers, etc within modal backdrop.
  - Fixed minor issue with CalendarRange when selecting >1 months apart.

Improved Documentation:
- Added AssetView, CodeSnippet and other small components (badge, sheet, toast, etc.).
- Added Docmaker and Video Editor extension docs.
- Added addition version to elements in sidebar.
- Added Changelog section.

## 6.12.0

Widgets:
- Button Widget now supports `options.mustConfirm` to confirm the trigger with custom options.
- Added support for LX.CalendarRange in DatePicker widget.

Timeline:
- Clips now have the active property to enable/disable the clip (only visuals).
- Clips now have the read-only attribute trackIdx.
- All "unselect" attribute have been renamed to "deselect".
- Keyframes/Clips Timelines moved to Timeline subitems in docs.

Previous Tour masks are now removed. Fixed Tour on resize window.
Added new `LX.PopConfirm`.
Fixed PlainText <> symbols in CodeEditor.
Fixed Calendar `options.fromToday` not including today's date.
Docs updated.

## 6.11.0

Widgets:
- Fixed Progress Widget value clamp and callback.
- Fixed Form data entries initial value if not an Object. Added support for Form `entryData.label`.
- Fixed Vector reset issue getting old values after reset.

Popover are now allowed to be created without a trigger element using `options.reference`.
Added support for DropdownMenu and Popover `options.sideOffset` and `options.alignOffset`.
Added support for new `LX.Tour` Component to guide users through an app.
Fixed light-dark themes in docs css.
Docs updated.

## 6.10.0

Timeline:
- Added support for cloning clips and tracks.
- Minor fixes.

Widgets:
- All `Button` widgets have now `setState` method (not only those with `swap` feature).
- Layers Widget allow `options.maxBits` to specify number of bit layers.
- If Button is selectable, the `selected` state is not sent to the callback.
- Fixed Color Picker not updating on change Hex text input.
- TabSections: Allow `item.selected` option. Add support for `select( tabName )`.
- Fixed Select Widget positioning when no space above&below.

New `AreaOverlayButtons` to improve management and support changing buttons state.
Fixed Commandbar error on checking String Menubar items.
Fixed Asset View custom title overflow.
Docs updated.

## 6.9.0

Timeline:
- `addKeyframes` now returns new indices.
- Fixed fadein/fadeout when one of them doesn't exist.
- Fix fadeout draw
- `setClip` now returns the Animation Clip.

Widgets:
- Added support for `options.iconPosition` in Button Widget (`cover` as default).
- Fixed rowId in Table Widget.
- Show "No results." row if no data in Table Widget.
- Fixed disabled NumberInput slider.
- TabSections icons can be modified using `iconClass` and `svgClass`.
- TabSection's `onCreate` now receives also the tab content HTML Container (2nd parameter).
- Fixed some Delete edge cases (key and ContextMenu) of Tree Widget.
- Select Widget now allows creating new widgets as suboptions for each select value.

Added support for Area Overlaybuttons separators.
Fixed Menubar buttons using `float: left` alignment.
Minor fixes CSS.

## 6.8.0

Widgets:
- Support `options.onCreate` on register Custom Widget.
- Table:
  - Add support for `Table.getSelectedRows`.
  - Manually sorting now emits signal `@on_table_sort`.
  - Defined property `centered` to allow dynamic changes.
  - Exposed table data.

CodeEditor:
- Default scrolling behaviour (Space key) is now prevented.
- Fix `Shift+Home` selection when first char is a space.
- Fixed hide autocomplete when tab changes.

Fixed vertical area split resize when `sizes: "auto"`.
Docs updated.
Minor CSS tweaks.

## 6.7.0

Widgets:
- Button Widget now allows `options.fileInput` to request a file on click.
- Custom Widgets now allow getter and setter options to process non-native types.

CodeEditor:
- Add `CodeEditor.closeTab` and `CodeEditor.getSelectedTabName`.
- Fixed bug using `CodeEditor._tabStorage`.
- Fixed initial tab language override.

Fixed html viewport scale issues.
Fixed Sheet zIndex.
Fix Sidebar Header/Footer arrows icon: Only added if click listener exists.
Added `MAKE_NUMBERED_LIST` to docmaker.js component.
Clean docmaker css.
Docs updated.

## 6.6.0

Fixed horizontal scroll in Table Widget.
Fixed checkbox in Dropdown item.
Callbacks in collapsable sidebar entries are now executed.
Add `docmaker.js` script (Documentation maker) as new LX component.
Added `hover:scale` CSS selectors.

## 6.5.0

Timeline:
- Refactored undo-redo.
- ClipsTimeline: added an argument on `addClip` to start search at a particular track.
- Documentation updated.
- Minor fixes.

Use sidebar inside Sheet element on mobile.
Removed LX.UTILS. Moved methods to global namespace `LX`.
Minor fixes in example demos.

## 6.4.0

Timeline:
- Paste refactor.
- `onUpdateTrack` now expects an array of track indices as argument.
- Added root.
- Added documentation.
- Fixed example.

Widgets:
- Centered Map2D initial position.

Add `Editor` demo example.
Separate source into files. Generate module using `npm rollup`.
Fixed making floating branch + docking to panel.
Fixed graph renaming bug in NodeGraph editor.
Resize fixes in VideoEditor component.

## 6.3.0

Widgets:
- New Map2D Widget (For NNI).
- Fixed `NodeTree.select` when item is not shown.
- Fixed issue corrupting table body when manual sorting in Table Widget.

Fixed `autoTheme` on start with `dark` color scheme.
Improved Context Menu docs section.
Added a few more icon solid variants.
Minor fixes.

## 6.2.0

Widgets:
- Fixed Title Widget class override.
- Fixed Select list focusout issue.
- Added `success` theme color to supported widgets.
- Table active filters are now displayed in each filter button.
- Added support for Range Filter in Table Widget.
- Fixed dragging over drag-icon location in Number&Vector Widget inputs.

Added a few more icon solid variants.
Minor CSS tweaks.

## 6.1.0

Widgets:
- Support back `options.selected` in ComboButtons Widget as `ValueType|Array<ValueType>`.
- Fixed Drag icon in Number/Vector widgets modifying layout.

Fixed some issues when resizing initially hidden Areas.
Fixed Dropdown issue sometimes opening all submenus on open Menubar entries.
Fixed Dropdown creation crash when no input items.
Fixed AssetView content on max height and scroll.
Improved robustness of `LX.getSupportedDOMName`.

## 6.0.0

`LX.init` now has to called using `await`.
Use Dropdowns elements in menubar.
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

Remove legacy:
- Removed `options.selected` in ComboButtons Widget.
- Removed FA icons.

Docs updated:
- Added interactive code examples for widgets.
- Improved widget list parameters and options.
- Added live examples for sidebar and menubar.

## 5.11.0

Widgets:
- Form: Add more custom options. Fixed issue using a String as Form field.

Added `LX.makeElement` to expand support for creating other HTML types.
Added more theme utils methods: `LX.getTheme` and `LX.switchTheme`.
Minor css fixes.

## 5.10.0

Fixed Date Calendar popover not opening.
Fixed creation of AssetView inner areas.
Fixed Sidebar content resize issue on creation.
ChangeLanguage CodeEditor commands are no longer shown if no opened editor.
Minor css fixes.

## 5.9.0

Widgets:
- Added new `DatePicker` Widget (also via `Panel.addDate` and using `LX.Calendar` class).
- Adapt `ColorPicker` as popover in ColorInput Widget.
- Minor Button CSS fixes.

Added `LX.Popover` class to create generic popovers with custom content.
Expose `LX.NodeTree` in global namespace.
Docs updated.

## 5.8.0

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

## 5.7.0

`LX.makeIcon` now accepts `options` as second parameter (`title`, `iconClass`, `svgClass`).
Exposed `LX.setStrictViewport(value)` to allow switching manually.
Fixed ColorPicker minor issues.
Fixed Examples and SourceCode links in docs.
Added more CSS class utilities.

## 5.6.0

Widgets:
- ColorInput Widget now uses a new custom `ColorPicker`.
- `selectAll` input is now checked when every row is selected in Table Widget.
- Added new OTPInput widget.
- SwapButton functionality `options.swap` supported in default Button Widget.

Added `LX.makeKbd(keys, extraClass)` to create keyboard shortcuts.
Fixed Badges theming issues.
Docs updated.

## 5.5.0

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

## 5.4.0

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

## 5.3.0

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

## 5.2.0

Table Widget:
- Fixed manual-sort not modifying inner data.
- Use Dropdown for menu actions `options.onMenuAction`.
- Added initial support for data filters. `options.filter` and `options.customFilters`.

Fixed some widget resizing issues.
No `justify` by default in inline widgets. Use `Panel.endLine(justify)` instead.
Fixed preview image in AssetView.
General styling fixes.
Docs updated.

## 5.1.0

Widgets:
- Added support for `text centering` all/specific columns in Table Widget.
- Fixed widget content size when using `options.nameWidth`. First fix for sizes in inline widgets.
- Fixed issue in Tree Widget when selecting from code using `NodeTree.select`.
- Support for closing all Node items recursively by using `Alt+Close` on a specific node.

Fixed Area tabs drag&drop when `fit` mode.
Fixed issue on open/destroy dropdown.
Fixed label text wrap on Checkbox&Toggle widgets.
Added `contrast` theme for supported Widgets.

## 5.0.0

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

## 4.2.0

Widgets:
- RadioGroup: Add name parameter (1st).
- Added `options.hideName` for supported widgets: Don't use label but add `name` to allow registering.

Sidebar subentries are now collapsable (`true` by default).
Support `options.header` and `options.footer` for custom sidebar elements.
Added `extraClass` parameter for `LX.makeIcon`.
Fixed Menubar.getButton.
Fixed some CSS icon alignment issues.

## 4.1.0

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

## 4.0.0

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

## 3.0.0

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

## 2.0.0

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

## 1.46.0

Support for creating code snippets `LX.makeCodeSnippet(options)`.
Added `swapButton.swap()` and Add `swapButton.setState(bool)`.
Fixed colored buttons in light theme.
Fixed GoogleSans.ttf usage.

## 1.45.0

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

## 1.44.0

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

## 1.43.0

CodeEditor:
- Support C and CMake highlight.
- Support C/C++ header files highlighting.

Support `options.skipRoot` on LX.init.
Support lock aspect ratio in Panel.addSize
Improved CSS for overlay buttons `Area.addOverlayButtons`.
Docs Updated. Add interactive widget examples.
Minor CSS general changes.
Minor bug fixes.

## 1.42.0

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

## 1.41.0

AssetView:
- Renamed all option parameters (remove snake case).
- Support showing `lastModified` file data.

Knob Widget:
- Support disabled option.
- Add `options.snap` = # subdivisions for value snapping.

More Timeline refactor and fixes.
Removed `LX.UTILS.clamp`. Still can be used in `LX.clamp`.
Update Fontawesome CSS to v6.7.2.

## 1.40.0

New widget: Form. Series of Text + Submit Button using form data (Object).
Fix non-unique "input-filter" id.
Improved Number/Vector mouse interaction with `pointerLock`.
Updated docs.

## 1.39.0

New widget: Pad. Bidimensional slider.
`LX.makeDraggable` now supports 'absolute' and 'fixed' positions.
Fix passing onDragStart/onMove functions to Dialogs.
Minor bug fixes.

## 1.38.0

Timeline: Fixed timeline signals and added callbacks

Number/Vector widgets:
- Support for onPress&onRelease for catching mouse events.
- Added `setLimits` for min, max, step parameters.

Added Size Widget (N dimension number widget).
Minor bug fixes.

## 1.37.0

Audio:
- Start new audio widgets (Knob wip).

Timeline:
- Major refactor of Timeline
- Fixed examples

Allow unit labels for Number widgets.
Fixed Number/Vector precision.
Fixed ContextMenu position on creation over window size.
Minor bug fixes.

## 1.36.0

Default skipCallback as `true` on emit widget signal.
Add some vec2 math functions.
`Panel.addTabs` support for onCreate (prev. `callback`) and onSelect callbacks.
Apply original `display` when showing Areatab.
Minor styling tweaks.
Documentation updates.

## 1.35.0

Fix `moveOutAction` clamping X value.
Add values in curve only with MOUSE_LEFT_CLICK.
Curve redraw and color widget styling fixes.
Minor general styling improvements.

## 1.34.0

Fix setValue on Checkbox.
Fix position of Dropdown menu when content is scrolled.
`moveOutAction` option to delete or clamp curve points.
Minor tweaks.

## 1.33.0

Work on VideoEditor UI component.
Improvements Timeline.
Allow to select multiple options in AssetViewer.
Minor bug fixes.

## 1.32.0

Timeline:
- Allow addition of widgets in top bar.
- General improvements.
- Docs started.

New VideoEditor component (still wip).
Added skipCallback for `Widget.set()`. 
Minor bug fixes.

## 1.31.0

GraphEditor:
- Graph/function renaming.
- Copy/Paste nodes.

Fixed precision in Number/Vector widgets.
Minor bug fixes.

## 1.30.0

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

## 1.29.0

GraphEditor:
- Graphs front end (Nodes, links, groups).
- Editor stuff (Panning, zoom, moving elements, serialize graph, Snapping...)
- Basic execution functionality.

Improved draggable elements.
Added "onBeforeLoad" callback in File widget.
Minor bug fixes.

## 1.28.0

GraphEditor:
- Big refactor. Almost start from scratch.

Support for adding big icons Sidebars.
General CSS fixes and improvements.

## 1.27.0

Code Editor:
- Tab key follows fixed 4 space layout indentation.
- Support for removing indentation using "Shift+Tab".
- Support for changing number of tab spaces from the info panel.
- Minor bugfixes.

Support "maxWidth" as options when creating a widget.

## 1.26.0

Code Editor:
- Search Next Ocurrence using "Ctrl+D" (Duplicate line moved to "Alt+D")
- Previous selection is restored on undo.
- Get text to search from selection.
- Reverse search bugfixes.
- Pasting content now scrolls to follow cursor.

Minor fixes.

## 1.25.0

Code Editor:
- Added Ctrl+K + C/U Shortcuts to Comment/Uncomment lines.
- Improved WGSL highlighting.
- Minor bug fixes.

Added title attribute by default to Widget Name Dom elements.
Added value getter/setter for LIST widget.
Added updateValues method for modify list options in LIST widget.

## 1.24.0

Code Editor:
- Improved single and multiple cursor usability.
- Cursor can be added or removed using "Alt+LeftClick".
- Fixed clicks outside the code area.
- Minor bug fixes.

## 1.23.0

Code Editor:
- Begin integration of multiple cursors ("Ctrl+ArrowDown").
- Code tabs have new VS Code-alike style.
- Improved CSS highlighting.
- Add Undo Steps to some actions that were missing.
- When using Ctrl+G, the selected line is now highlighted.

Minor fixes.

## 1.22.0

Code Editor:
- Added REDO using "Ctrl+Y".
- Added FontSize customization. "Ctrl+PLUS", "Ctrl+MINUS" or "Ctrl+Wheel".
- Added "Ctrl+G" to scroll to specific line.

Minor fixes.

## 1.21.0

Code Editor:
- Added "Ctrl+F" to find text in code tabs.
- "Shift+Backspace" deletes word at current position.
- Added "Markdown" syntax highlighting. 
- Improved hightlighting of tag languages (HTML, Markdown, XML).

## 1.20.0

Code Editor:
- Active line is now hightlighted.
- Using CommitMono font (https://commitmono.com/) as the font for the Code Editor. 
- Added "Rust" syntax highlighting. 
- Improved all code selections (and some bugs fixed).
- Block comments are now working again (with bugs probably).

Minor fixes.

## 1.19.0

Code Editor:
- Add file explorer to Code Editor component. 

Minor fixes.