import { FactoriesObservable } from "./factories";
import { SelectionObservable } from "./selection";
import { EnabledToolsStateObservable } from "./tools";
import { TransformerStateObservable } from "./transform";

export class EditorState {
    //
    selection = new SelectionObservable();

    transform = new TransformerStateObservable();

    tools = new EnabledToolsStateObservable();

    factories = new FactoriesObservable();

    dispose() {
        this.selection.dispose();

        this.transform.dispose();

        this.tools.dispose();

        this.factories.dispose();
    }
}
