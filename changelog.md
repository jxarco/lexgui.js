# lexgui.js changelog

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