export class Graph {

  static DATE_MIN: Date[] = [];
  static MIN_VALUES: number[] = [];
  static MAX_VALUES: number[] = [];
  static Y_TICK_VALUES: number[][] = [];
  static POW_VALUES: number[] = [];
  static Y_LABEL: string[] = [];
}

export enum GraphTypeKey {
  LIGHT, RATIO, TRIUMPH, GLORY
}

Graph.DATE_MIN[GraphTypeKey.LIGHT] = new Date(2017, 1, 1);
Graph.DATE_MIN[GraphTypeKey.RATIO] = new Date(2017, 1, 1);
Graph.DATE_MIN[GraphTypeKey.TRIUMPH] = new Date(2017, 10, 1);
Graph.DATE_MIN[GraphTypeKey.GLORY] = new Date(2017, 10, 1);

Graph.MIN_VALUES[GraphTypeKey.LIGHT] = 0;
Graph.MIN_VALUES[GraphTypeKey.RATIO] = 0;
Graph.MIN_VALUES[GraphTypeKey.TRIUMPH] = 0;
Graph.MIN_VALUES[GraphTypeKey.GLORY] = 0;

Graph.MAX_VALUES[GraphTypeKey.LIGHT] = 600;
Graph.MAX_VALUES[GraphTypeKey.RATIO] = 1;
Graph.MAX_VALUES[GraphTypeKey.TRIUMPH] = 30000;
Graph.MAX_VALUES[GraphTypeKey.GLORY] = 5500;

Graph.Y_TICK_VALUES[GraphTypeKey.LIGHT] = [500, 700, 800, 850, 900, 950, 960, 1000];
Graph.Y_TICK_VALUES[GraphTypeKey.RATIO] = null;
Graph.Y_TICK_VALUES[GraphTypeKey.TRIUMPH] = null;
Graph.Y_TICK_VALUES[GraphTypeKey.GLORY] = [200, 1050, 2100, 3500, 5450, 5500];

Graph.POW_VALUES[GraphTypeKey.LIGHT] = 10;
Graph.POW_VALUES[GraphTypeKey.RATIO] = 1;
Graph.POW_VALUES[GraphTypeKey.TRIUMPH] = 1;
Graph.POW_VALUES[GraphTypeKey.GLORY] = 1;

Graph.Y_LABEL[GraphTypeKey.LIGHT] = 'label.light';
Graph.Y_LABEL[GraphTypeKey.RATIO] = 'label.ratio';
Graph.Y_LABEL[GraphTypeKey.TRIUMPH] = 'label.triumph';
Graph.Y_LABEL[GraphTypeKey.GLORY] = 'label.glory';
