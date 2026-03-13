const ALL_PROMPTS = [
    {
        id: "objectBackspaceDelete",
        message: (
            <>
                <span>Press</span> <i>backspace</i> <span>to delete</span>
            </>
        ),
        autoHideTimeout: 5000,
        repeats: 2,
        // shows: New user + after delete action (without backspace) has been done + on create screen
        // hides: after 2s of showing prompt + on create screen
    },
    {
        id: "editTextIndications",
        message: "Click to edit, double click to edit text",
        autoHideTimeout: 3000,
        repeats: 3,
        // shows: New user + interacting with text element in scene + on create screen
        // hides: interacted with text element + on create screen || 3s delay + repeat 3x if initial action isnt performed
    },
    {
        id: "editTextEnterToFinish",
        message: (
            <>
                Press <i>enter</i> when finished editing
            </>
        ),
        // shows: New user + editing text element in scene + on create screen
        // hides: pressed enter when editing text element + on create screen || 3s delay + repeat 3x if initial action isnt performed
    },
    {
        id: "scriptEditorSaveShortcut",
        message: (
            <>
                <i>CTRL</i> + <i>S</i> <span>to save</span>
            </>
        ),
        autoHideTimeout: 3000,
        repeats: 3,
        // shows: New user + saves using mouseclick on save button + on script screen
        // hides: used ctrl+s to save + on script screen || 3s delay + repeat 3x if initial action isnt performed
    },
    {
        id: "loadingTemplate",
        message: "Loading template",
        // TODO : @yassine: this is to add when a template is loading
        // Use : showPrompt("loadingTemplate") to show, hidePrompt("loadingTemplate") to hide when template is loading

        // repeats: no repeats
        // autoHideTimeout : no auto hide out
        // shows: When selecting a template + template not loaded yet
        // hides: template selected + loaded
    },
    {
        id: "editsAutoSaved",
        message: "Edits are auto-saved",
        autoHideTimeout: 4000,
        repeats: 1,
        // TODO : @yassine: this is to add from an event in the studio editor (when studio is "saving" a change that happened in the scene)
        // Use : showPrompt("editsAutoSaved")
        // shows: Just after editing a 3D object + New user + on create screen
        // hides: after 3seconds ?
    },
    {
        // Unused for now: needs addition of feature
        // TODO: @yassine: add this showPrompt('clickShiftUniformScale') when feature is ready
        id: "clickShiftUniformScale",
        message: "Click and hold Shift for a uniform scale",
        repeats: 3,
        autoHideTimeout: 3000,
        // shows: New user + scale mode + on create screen
        // hides: scaling using click and shift + on create screen || 3s delay + repeat 3x if initial action isnt performed
    },
    {
        // Unused for now: needs addition of feature
        // TODO: @yassine: add this showPrompt('clickShift') when feature is ready
        id: "clickShift",
        message: "Click and hold Shift for a whole number",
        repeats: 3,
        autoHideTimeout: 3000,
        // shows: New user + rotate mode + on create screen
        // hides: rotated using click and shift + on create screen || 3s delay + repeat 3x if initial action isnt performed
    },
] as const;

export default ALL_PROMPTS;
