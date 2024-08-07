import { action, observable } from "mobx";
import React from "react";
import PivotTableUI from 'react-pivottable/PivotTableUI';
import PivotTable from 'react-pivottable/PivotTable';
import 'react-pivottable/pivottable.css';
import { observer } from "mobx-react";
import "./PivotTablePlugin.module.scss";
import S from "./PivotTablePlugin.module.scss";
import CustomTableRenderers, { setTranslationFunction } from './CustomTableRenderers'
import Plot from 'react-plotly.js';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import { IListViewItem, SimpleListView } from "./SimpleListView";
import { v4 as uuidv4 } from 'uuid';
import { SimpleInput } from "./SimpleInput";
import cx from "classnames";
import { localizations } from "./PivotTablePluginLocalization";
import ReactToPrint from "react-to-print";
import { PivotTableTranslator } from "./PivotTableTranslator";
import { IPersistAbleState, ITableState } from "./interfaces";
import { IPluginDataView } from "plugins/interfaces/IPluginDataView";
import { IPluginTableRow } from "plugins/interfaces/IPluginTableRow";
import { IPluginProperty } from "plugins/interfaces/IPluginProperty";
import { ISectionPluginData } from "plugins/interfaces/ISectionPluginData";
import { ILocalization } from "plugins/interfaces/ILocalization";
import { ILocalizer } from "plugins/interfaces/ILocalizer";
import { Button } from "gui/Components/Button/Button";
import { ISectionPlugin } from "plugins/interfaces/ISectionPlugin";
import { EventHandler } from "utils/EventHandler";

const PlotlyRenderers = createPlotlyRenderers(Plot);

export class PivotTablePlugin implements ISectionPlugin {
  $type_ISectionPlugin: 1 = 1; // required by the isISectionPlugin function
  id: string = ""

  onSessionRefreshed() {
    this.refreshHandler.call();
  }

  initialize(xmlAttributes: { [key: string]: string }): void {
    this.initialized = true;
  }

  getScreenParameters: (() => { [p: string]: string }) | undefined;

  @observable
  initialized = false;

  refreshHandler = new EventHandler();

  @observable
  tableState = [];

  @action
  onTableChange(tableState: any) {
    this.tableState = tableState;
  }

  getPropertyValues(dataView: IPluginDataView, row: IPluginTableRow, properties: IPluginProperty[]) {
    return dataView.properties.map(prop => dataView.getCellText(row, prop.id));
  }

  getComponent(data: ISectionPluginData, createLocalizer: (localizations: ILocalization[]) => ILocalizer): JSX.Element {
    let dataView = data.dataView;
    let localizer = createLocalizer(localizations);
    const tableData = [dataView.properties.map(prop => prop.name)];
    const booleanPropertyIndices = dataView.properties
      .filter(prop => prop.type === "CheckBox")
      .map(prop => dataView.properties.indexOf(prop));
    for (const row of dataView.tableRows) {
      const values = this.getPropertyValues(dataView, row, dataView.properties);
      if (booleanPropertyIndices.length > 0) {
        for (const index of booleanPropertyIndices) {
          values[index] = values[index]?.toString() ?? "null";
        }
      }
      tableData.push(values);
    }
    setTranslationFunction((key: string, parameters?: { [key: string]: any; }) => localizer.translate(key, parameters))
    return <PivotTableComponent
      data={tableData}
      pluginData={data}
      localizer={localizer}
    />
  }
}

@observer
export class PivotTableComponent extends React.Component<{
  data: string[][],
  pluginData: ISectionPluginData,
  localizer: ILocalizer,
}> {
  T =  this.props.localizer.translate.bind(this.props.localizer);
  readonly tableViewNameTemplate = this.props.localizer.translate("newTableViewTemplate");
  dataView: IPluginDataView;

  @observable
  views: TableView[] = [];

  @observable
  currentView: TableView;

  @observable
  showEditMode = false;

  @observable
  viewNameErrorMessage: string | undefined;

  printComponentRef = React.createRef<HTMLDivElement>();

  translator: PivotTableTranslator;

  constructor(props: any) {
    super(props);
    this.translator =  new PivotTableTranslator(this.props.localizer,  this.props.pluginData.dataView.properties);
    this.dataView = this.props.pluginData.dataView;
    const config = this.getPersistedConfig();
    if (!config) {
      this.currentView = this.createTableView();
    } else {
      this.views = config.map(viewConfig =>
        new TableView(
          viewConfig.name,
          uuidv4(),
          viewConfig.tableState,
          this.translator
        )
      );
      this.currentView = this.views[0];
    }
  }

  translate(key: string, parameters?: {
    [key: string]: any;
  }) {
    return this.props.localizer.translate(key, parameters);
  }

  getPersistedConfig() {
    const configStr = this.dataView.getConfiguration("PivotTablePlugin");
    if (!configStr) {
      return undefined;
    }
    const config = JSON.parse(configStr) as IPersistAbleState[];
    return config.length === 0
      ? undefined
      : config;
  }

  createTableView() {
    let newName = this.tableViewNameTemplate;
    for (let i = 0; i < 1000; i++) {
      if (this.views.map(view => view.name).includes(newName)) {
        newName = `${this.tableViewNameTemplate} (${i})`;
      } else {
        let tableView = new TableView(
          newName,
          uuidv4(),
          {},
          this.translator
        );
        this.views.push(tableView);
        return tableView;
      }
    }
    throw new Error("Could not create new TableView")
  }

  *deleteCurrentTableView() {

    const reallyDelete = (yield this.props.pluginData.guiHelper.askYesNoQuestion(
        "Delete view",
        "Do you really want to delete this view?")
    ) as boolean;

    if (!reallyDelete) {
      return;
    }

    let newViewIndex = this.views.indexOf(this.currentView);

    this.deleteTableView(this.currentView);

    if (newViewIndex > this.views.length - 1) {
      newViewIndex = this.views.length - 1;
    }
    if (newViewIndex < 0) {
      this.currentView = this.createTableView();
    } else {
      this.currentView = this.views[newViewIndex];
    }
    this.showEditMode = false
    yield this.persistViews();
  }

  @action
  deleteTableView(tableView: TableView) {
    const index = this.views.indexOf(tableView);
    if (index > -1) {
      this.views.splice(index, 1);
    }
  }

  @action
  async newTableView() {
    this.currentView = this.createTableView();
    this.showEditMode = true;
    await this.persistViews();
  }

  @action
  onTableChange(tableState: any) {
    this.currentView.currentLocalizedTableState = tableState;
  }

  @action
  async onSave() {
    await this.persistViews();
    this.showEditMode = false;
  }

  private async persistViews() {
    this.currentView.updatePersistedState();
    // debugger;
    // this.aggregatorTranslator
    // this.views.map(view => this.aggregatorTranslator.view.persistedState.tableState)
    let json = JSON.stringify(this.views.map(view => view.persistedNormalizedState));
    await this.dataView.saveConfiguration("PivotTablePlugin", json);
  }

  @action
  onCancel() {
    this.currentView.restoreToSavedState();
    this.showEditMode = false;
  }

  @action
  onEdit() {
    this.showEditMode = true;
    this.onNameChange(this.currentView.name);
  }

  @action
  onEditItemClicked(item: TableView) {
    this.currentView = item;
    this.onEdit();
  }

  onNameChange(value: string) {
    this.viewNameErrorMessage = !value
      ? "Name cannot be empty"
      : undefined;
    this.currentView.name = value;
  }

  renderEditMode() {
    return <div className={S.tableContainer}>
      <div className={S.topToolbar}>
        <SimpleInput
          errorMessage={this.viewNameErrorMessage}
          className={S.input}
          value={this.currentView.name}
          onChange={event => this.onNameChange(event.target.value)}
          placeholder="View name"/>
        <Button
          className={cx(S.button, !this.viewNameErrorMessage ? S.greenButton : "")}
          label={this.T("save")}
          disabled={!!this.viewNameErrorMessage}
          onClick={async () => await this.onSave()}/>
        <Button
          className={S.button}
          label={this.T("cancel")}
          onClick={() => this.onCancel()}/>
        <Button
          className={cx(S.button, S.redButton)}
          label={this.views.length === 1 && this.currentView.name === this.tableViewNameTemplate
            ? this.T("clear")
            : this.T("delete")}
          onClick={async () => await (this.props.pluginData as any).guiHelper.runGeneratorInFlowWithHandler(this.deleteCurrentTableView())}/>
      </div>
      <PivotTableUI
        data={this.props.data}
        onChange={tableState => this.onTableChange(tableState)}
        aggregators={this.translator.translatedAggregators}
        aggregatorName={Object.keys(this.translator.translatedAggregators)[0]}
        renderers={Object.assign({}, CustomTableRenderers, PlotlyRenderers)}
        {...this.currentView.currentLocalizedTableState}
      />
    </div>
  }

  renderDisplayMode() {
    debugger;
    return <div className={S.editModeRoot}>
      <div className={cx(S.listViewContainer, S.noPrint)}>
        <ReactToPrint
          trigger={() =>
            <Button
              className={S.button}
              label={this.T("print")}
              onClick={() => {}}/>
          }
          content={() => this.printComponentRef.current}
        />
        <SimpleListView
          items={this.views}
          onSelectionChanged={item => this.currentView = item}
          onEditItemClicked={item => this.onEditItemClicked(item)}
          onNewItemClicked={async () => await this.newTableView()}
          selectedItem={this.currentView}
          localizer={this.props.localizer}
        />
      </div>
      <div ref={this.printComponentRef}>
        <h1 className={S.printOnly}>{this.currentView.name}</h1>
        <PivotTable
          aggregators={this.translator.translatedAggregators}
          data={this.props.data}
          renderers={Object.assign({}, CustomTableRenderers, PlotlyRenderers)}
          {...this.currentView.currentLocalizedTableState}
        />
      </div>
    </div>
  }

  render() {
    return (
      this.showEditMode
        ? this.renderEditMode()
        : this.renderDisplayMode()
    );
  }
}

class TableView implements IListViewItem {
  @observable
  name = ""

  @observable
  currentLocalizedTableState: ITableState = {};

  persistedNormalizedState: IPersistAbleState;

  private translator: PivotTableTranslator;

  constructor(
    name: string,
    public id: string,
    state: ITableState,
    aggregatorTranslator: PivotTableTranslator
   ) {
    const localize = aggregatorTranslator.localize.bind(aggregatorTranslator);
    this.name = name;
    this.currentLocalizedTableState = localize(state);
    this.translator = aggregatorTranslator;
    this.persistedNormalizedState = this.normalize(this.currentLocalizedTableState);
  }

  private normalize(tableState: ITableState) {
    const normalizeTableState = this.translator.normalize.bind(this.translator);
    return {
      name: this.name,
      tableState: normalizeTableState(tableState)
    }
  }

  updatePersistedState() {
    this.persistedNormalizedState = this.normalize(this.currentLocalizedTableState);
  }

  restoreToSavedState() {
    const localize =  this.translator.localize.bind(this.translator);
    this.currentLocalizedTableState = localize(this.persistedNormalizedState.tableState);
    this.name = this.persistedNormalizedState.name;
  }
}
