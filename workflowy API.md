WorkFlowy Extension API

- Official API
  > Please note that the new API is **experimental**. Email [support@workflowy.com](mailto:support@workflowy.com) with any feedback.
  - **Tree traversal**
    - WF.rootItem(): Item
      > Get the root node.
    - Item.getChildren(): Item[]
      > To traverse the tree downwards.
    - Item.getVisibleChildren(): Item[]
      > Like getChildren() but takes into account the current search and the “show completed” setting. **Note**: introduced in Dec 18 release.
    - Item.getParent(): Item | null
      > To traverse the tree upwards.
    - Item.getNextVisibleSibling(ignoreSearch = false): Item | null
      > **Note**: new in the May 28th release.
    - Item.getPreviousVisibleSibling(ignoreSearch = false): Item | null
      > **Note**: new in the May 28th release.
    - Item.getNextPotentiallyVisibleSibling(ignoreSearch = false): Item | null
      > **Note**: deprecated in the May 28th release. Renamed to Item.getNextVisibleSibling()
    - Item.getPreviousPotentiallyVisibleSibling(ignoreSearch = false): Item | null
      > **Note**: deprecated in the May 28th release. Renamed to Item.getPreviousVisibleSibling()
  - **Tree querying**
    - WF.getItemById(id: string): Item
  - **Item information**
    - Item.getId(): string
      > Get a node’s ID.
    - Item.getUrl(): string
      > **Note**: new in the May 28th release.
    - Item.equals(item: Item): boolean
      > **Note**: new in the May 28th release.
    - Item.getName(): string
      > Get the raw name, complete with html markup such as <b>Some bolded text</b>.
    - Item.getNameInPlainText(): string
      > Plain text name, with markup tags stripped away.
    - Item.getNote(): string
      > Get the raw note, complete with html markup such as <b>Some bolded text</b>.
    - Item.getNoteInPlainText(): string
      > Plain text note, with markup tags stripped away.
    - Item.isCompleted(): boolean
    - Item.isShared(): boolean
    - Item.getPriority(): number
    - Item.getSharedUrl(): string
    - Item.getLastModifiedByUserId(): number
    - Item.getLastModifiedDate(): Date
    - Item.getCompletedDate(): Date
    - Item.getNumDescendants(maxCount: number): number
      > Counts up to maxCount, then stops.
    - Item.isMainTreeRoot(): boolean
      > **Note**: deprecated as of May 28th. Use Item.isMainDocumentRoot().
    - Item.isMainDocumentRoot(): boolean
      > **Note**: new in the May 28th release.
    - Item.isReadOnly(): boolean
      > **Note**: new in the May 28th release.
    - Item.getElement(): HTMLElement | null
      > Returns the matching DOM element, if it exists. **Note**: new in the May 28th release.
  - **Document state**
    - WF.currentItem(): Item
      > Current zoomed in item.
    - WF.focusedItem(): Item
      > The item that currently has keyboard focus.
  - **Navigation**
    - WF.zoomIn(item: Item)
      > Zooms into an item, with animation. This only works when the item provided is on screen.
    - WF.zoomOut()
      > Zooms out to the parent item, with animation.
    - WF.zoomTo(item: Item, search?: string)
      > Navigates directly to an item, without animation.
  - **Tags**
    - WF.getItemTags(item: Item): Array<{index: number, tag: string}>
      > Alias of WF.getItemNameTags(item: Item): Array<{index: number, tag: string}>
    - WF.getItemNameTags(item: Item): Array<{index: number, tag: string}>
      > Gets the list of tags in the name of an item.
    - WF.getItemNoteTags(item: Item): Array<{index: number, tag: string}>
      > Gets the list of tags in the notes for an item.
  - **Starring**
    - WF.starredItems(): Item[]
      > **Deprecated**: use WF.starredLocations().
    - WF.starredLocations(): {item: Item, search: string | null}[]
      > **Note**: introduced in May 7th release.
    - WF.isCurrentLocationStarred(): boolean
      > **Note**: introduced in May 7th release.
    - WF.toggleCurrentLocationStarred(): boolean
      > **Note**: introduced in May 7th release.
  - **Editing**
    > All these operations create their own undo/redo edit group, that means each call will be undone individually. If you want to group multiple edits together so they get undone as a unit, use WF.editGroup().
    - WF.createItem(parent: Item, priority: number): Item | null
    - WF.deleteItem(item: Item)
    - WF.duplicateItem(item: Item): Item | null
    - WF.expandItem(item: Item)
    - WF.collapseItem(item: Item)
    - WF.completeItem(item: Item)
      > Toggles the completed state of an item.
    - WF.moveItems(Items: Item[], newParent: Item, priority: number)
    - WF.setItemName(item: Item, content: string)
    - WF.setItemNote(item: Item, content: string)
    - WF.insertText(content: string)
      > Inserts the given content at cursor.
    - WF.editGroup(callback: () => void)
      > Perform multiple edits as part of the same edit group (for undo/redo purposes).
    - WF.save()
    - WF.undo()
    - WF.redo()
  - **Selection**
    - WF.getSelection(): Item[]
    - WF.setSelection(items: Item[])
  - **Cursor**
    - WF.editItemName(item: Item)
      > Moves cursor to the end of the item’s name.
    - WF.editItemNote(item: Item)
      > Moves cursor to the end of the item’s note.
  - **Search**
    - WF.search(query: string)
    - WF.currentSearchQuery(): string | null
    - WF.clearSearch()
  - **Settings**
    - WF.completedVisible(): boolean
    - WF.toggleCompletedVisible()
  - **Sharing and Exporting**
    - WF.showShareDialog(item: Item)
    - WF.showExportDialog(items: Item[])
    - WF.exportText(items: Item[]): string
    - WF.exportHTML(items: Item[]): string
    - WF.exportOPML(items: Item[]): string
  - **Messages and Alerts**
    - WF.showMessage(html: string, isError?: boolean)
    - WF.hideMessage()
    - WF.showAlertDialog(html: string, title?: string)
    - WF.hideDialog()
  - **Interop**
    - WF.getItemDOMElement(item: Item): HTMLElement
      > **Note: **deprecated as of May 28th. Use Item.getElement().
  - **Events**
    > **Warning: **very experimental and likely to change!
    - Define a global function WFEventListener(eventName: string). This will be called on when a bunch of interesting events happen.
    - Some example event names:
      > These are likely to change in the future!
      - document_ready
      - zoom--in
      - zoom--out
      - expand
      - collapse
      - edit
      - bullet-menu--opened
      - bullet-menu--closed
- Roadmap
  - A way to get search results
  - A way to perform search in the background
  - Change WF.insertText() to behave like paste, i.e. support rich text and OPML
  - WF.toggleBold(), WF.toggleItalic(), WF.toggleUnderline()
  - Make all starred functions work for saved searches
  - Add search parameter to WF.zoomTo()
  - #bug WF.zoomIn breaks when item is not on screen
    - Possible solution: remove the argument and always zoom in on focused item.
  - #bug WF.setItemName/WF.setItemNote don't work when item is not on screen
  - #bug WF.clearSearch() doesn't work when the search query is only whitespace
  - #bug WF.setSelection retains focus on previous item
  - #bug WF.createItem(item, -1) creates an item at priority 0 location, but sync errors show up until the new item is deleted (have not tested if moving the item, changing text, etc. might also fix whatever is going wrong)
  - #utility Functions to convert between the full IDs and the short IDs used in the URLs
  - Rename WF.completeItem() to WF.toggleCompleted()
  - Option to search a list of items by ID
  - Option to select all search results
- Deprecated – use provided replacement
  - undo_redo.startOperationBatch
    - use WF.editGroup(() => {...})
  - undo_redo.finishOperationBatch
    - use WF.editGroup(() => {...})
  - getSelectedItems
    - Use WF.getSelection()
  - addToItemSelection
    - Use WF.setSelection()
  - clearItemSelection
    - Use WF.setSelection()
  - focusFirstChildOfSelected
    - Use WF.editItemName
  - addItemToTopOfSelected
    - Use WF.createItem
  - childrenAreInReadOnlyTree
    - Only used in sorting script to generate an error message to the user.  A nice-to-have, but not required.
    - Use Item.isReadOnly()
  - getPlainText: method on ContentText
    - Use WF.getNameInPlainText and WF.getNoteInPlainText
- Deprecated – will provide replacement before removing
  - SOURCE_VERSION
  - eventEmitter: location_history.eventEmitter
  - getMatchingKnownProjectIdForTruncatedProjectId: method on AllProjectTreesHelper
    - getAllProjectTreesHelper().getMatchingKnownProjectIdForTruncatedProjectId(truncatedId)
  - applyLocalMoveForProjectReferences
  - blurFocusedContent
  - htmlEscapeText
  - htmlEscapeTextForContent
  - selectOnActivePage
  - getRootDescendantTagCounts
  - tagInfoMap: property on TagCounter
  - Item.getTagManager().descendantTagCounts
  - descendentTagCounts.tagInfoMap[tagName].canonicalName
- Will be removed soon – if you need these, please comment describing your use case
  - getProjectReferenceFromDomProject
  - getActivePage
  - getAllProjectTreesHelper
- Removed – if you need these, please comment describing your use case 
  - JQuery.getProject
  - JQuery.moveCursorToEnd
  - JQuery.getVisibleChildren
  - JQuery.hasVisibleChildren
  - $("#searchBox")
  - IS_IOS
  - IS_CHROME
  - IS_FIREFOX
  - IS_MOBILE
  - IS_MAC_OS
- Comments
  - Requests from FreezerburnVinny
    - Instead of modifying WF.insertText, add something such as "WF.insertRichText" that will behave like paste, interpreting the contents to support things like OPML
      > This way, there's always a way to insert raw text into the tree without having to worry about something being interpreted in a way that the developer didn't want
    - WF.getItemTags should return a concatenation of WF.getItemNameTags and WF.getItemNoteTags
      > The name implies that all tags from the item will be returned, and it seems odd to have an alias for another function in the API
    - Ability to generate a customized "view" of existing nodes
      > Kind of like a custom way to provide search, The plugin can pick nodes that will show up in the custom view based on whatever criteria it wants
    - Ability to create an item that has the same projectid as another item, and place it into the tree such that when editing it/its children, both items with the same projectid will be edited
  - by michi
    - Insert text at caret .
      - I want the same function as Ctrl(⌘)+v of PC shortcut key or "Paste" on mobile context menu.
      - For example
        - WF.insertAtCaret(String)
          - String is plain text or OPML text.
        - Before
          - item[CARET]1 
          - item2
        - After use WF.insertAtCaret("A\nitem3\n item4\n  ITEM")
          > A
          > item3
          >  item4
          >   ITEM
          - itemA
          - item3
            - item4
              - ITEM[CARET]1
          - item2
      - There are bugs in Paste function now.
        - Even if there is a space at the beginning of the line, it is not indented. All items are pasted at the same level.
          - Clipboard contents
            > item1
            >  item2
            >   item3
          - After current paste
            - item1
            - item2
            - item3
          - After past paste
            - item1
              - item2
                - item3
        - If paste multiple lines text, caret move to end of last item. Caret should be at beginning of the last item.
          - Before paset
            - aaa[CARET]AAA
            - bbb
          - Clipboard contents
            > CCC
            > DDD
          - After paset
            - aaaCCC
            - DDD
            - AAA[CARET]
            - bbb
          - My hope
            - aaaCCC
            - DDD
            - [CARET]AAA
            - bbb
        - If paste multiple lines text at Item with children,  It is pasted in a place different from Caret.
          - Before paset
            - item1[CARET] 
              - item2
          - Clipboard contents
            > CCC
            > DDD
          - After current paste
            - item1 
              - item2
            - CCC
            - DDD[CARET]
          - After past paste
            > "DDD" may have been under "item2"
            - item1CCC
              - DDD[CARET]
              - item2

