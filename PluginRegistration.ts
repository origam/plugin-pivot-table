import { PivotTablePlugin } from "plugins/implementations/plugins/src/PivotTablePlugin";
import { registerPlugin } from "plugins/tools/PluginLibrary";


export function registerPlugins() {
  registerPlugin("PivotTablePlugin", () => new PivotTablePlugin());
}
