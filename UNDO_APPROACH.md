# Undo/Redo Approach

## Pattern Used: Command Pattern

We implement undo/redo for **card creation**, **card deletion**, and **card movement** using an **Action History** (Command pattern). Each reversible action pushes a command onto an `undoStack`; undoing pops a command and executes its inverse; redoing re-applies the original action.

## No Full-State Cloning

We avoid copying the entire store. Instead, each command stores only the minimal data needed to perform its inverse:

- **CreateCommand**: `{ type: 'create', card }`  
  - Undo = remove the card from store + `cardApi.deleteCard(id)`  
  - Redo = add card back via `cardApi.restoreCard(card)` + update store

- **DeleteCommand**: `{ type: 'delete', card }`  
  - Undo = `cardApi.restoreCard(card)` + add card back to store  
  - Redo = remove from store + `cardApi.deleteCard(id)`

- **MoveCommand**: `{ cardId, fromColumnId, toColumnId, fromIndex, toIndex }`  
  - Undo = move card from `(toColumnId, toIndex)` back to `(fromColumnId, fromIndex)`  
  - Redo = move from `(fromColumnId, fromIndex)` to `(toColumnId, toIndex)`

## Flow

1. User performs create/delete/move → store updates optimistically and API is called.
2. A command is pushed to `undoStack`; `redoStack` is cleared (new action invalidates redo).
3. User presses Undo → pop from `undoStack`, execute inverse (update store + API), push to `redoStack`.
4. User presses Redo → pop from `redoStack`, re-apply original action, push back to `undoStack`.

## API Support

- `cardApi.restoreCard(card)` was added to support undoing a delete (re-adding a previously deleted card with full fields).

## UI

- Undo/Redo buttons in the board header.
- Keyboard shortcuts: **Ctrl+Z** (Undo), **Ctrl+Shift+Z** (Redo).
