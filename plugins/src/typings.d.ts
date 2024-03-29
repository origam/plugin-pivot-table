/*
Copyright 2005 - 2021 Advantage Solutions, s. r. o.

This file is part of ORIGAM (http://www.origam.org).

ORIGAM is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

ORIGAM is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with ORIGAM. If not, see <http://www.gnu.org/licenses/>.
*/


declare module 'react-pivottable/PivotTableUI'{
  export default class PivotTableUI extends React.Component<{
    data: any,
    renderers: any;
    aggregators: any;
    aggregatorName: string;
    onChange(event: any): void;
  }> {
  }
}

declare module 'react-pivottable/PivotTable'{
  export default class PivotTable extends React.Component<{
    data: any,
    renderers: any,
    aggregators?: any;
  }> {
  }
}

declare module 'react-pivottable/TableRenderers'{
}

declare module 'react-pivottable/Utilities'{
  export class PivotData {
    constructor(props: any)
  }

  export const aggregators : any;
}

declare module 'react-plotly.js'{
}

declare module 'react-pivottable/PlotlyRenderers'{
  export default function  createPlotlyRenderers(plot: any): any;
}



