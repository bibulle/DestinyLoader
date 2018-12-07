
const debug = require('debug')('server:debug:grimoireGoogle');
const error = require('debug')('server:error:grimoireGoogle');
const async = require('async');
const GoogleSpreadsheet = require("google-spreadsheet");

const DOC_SHEET = 1;

const ROW_MIN = 1;
const COL_MIN = 4;

const COL_CARD_ID = 1;
const COL_STAT_NUMBER = 2;

export class GrimoireGoogle {

  public static insert (docKey, data, callback) {

    // spreadsheet key is the long id in the sheets URL
    const doc = new GoogleSpreadsheet(docKey);
    let sheet;
    let firstEmptyColumn;
    const ids = {};

    async.series([
      function setAuth (step) {
        // see notes below for authentication instructions!
        const credentials = require(__dirname + '/API Project-695e3069a8fb.json');
        // OR, if you cannot save the file locally (like on heroku)
        //var credentials_json = {
        //    client_email: 'yourserviceaccountemailhere@google.com',
        //    private_key: 'your long private key stuff here'
        //}

        doc.useServiceAccountAuth(credentials, step);
      },
      function getInfoAndWorksheets (step) {
        doc.getInfo(function (err, info) {
          if (err) {
            error(err);
            return step(err);
          }
          //debug('Loaded doc: ' + info.title + ' by ' + info.author.email);
          sheet = info.worksheets[DOC_SHEET];
          debug('sheet : "' + sheet.title + '" ' + sheet.rowCount + 'x' + sheet.colCount);
          step();
        });
      },
      function getFirstEmptyColumn (step) {
        sheet.getCells({
          'min-row': ROW_MIN + 1,
          'max-row': ROW_MIN + 1,
          'min-col': COL_MIN,
          'max-col': sheet.colCount,
          'return-empty': true
        }, function (err, cells) {
          //console.log('Cells' + cells.length);

          let cpt = 0;

          cells.some(function (cell) {
            //console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value);
            if ((cell.row === ROW_MIN + 1) && (cell.value === "")) {
              firstEmptyColumn = cell.col;
            }
            cpt++;
            return firstEmptyColumn;
          });

          if (!firstEmptyColumn) {
            step("No empty column");
          }
          //debug("firstEmptyColumn = " + firstEmptyColumn);
          step();
        });
      },
      function getIds (step) {
        sheet.getCells({
          'min-row': ROW_MIN + 2,
          'max-row': sheet.rowCount,
          'min-col': COL_CARD_ID,
          'max-col': COL_STAT_NUMBER,
          'return-empty': false
        }, function (err, cells) {
          //console.log('Cells' + cells.length);

          let cpt = 0;
          let currCardId = "";

          ids[1] = 'TOTAL';
          cells.some(function (cell) {
            //console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value);
            //debug(cell.col+" "+COL_CARD_ID);
            if (cell.col === COL_CARD_ID) {
              currCardId = cell.value;
            }
            if (cell.col === COL_STAT_NUMBER) {
              if ((currCardId != "") && (currCardId != "cardId")) {
                ids[cell.row] = currCardId + '_' + cell.value;
              }
            }
            cpt++;
            //return firstEmptyColumn;
            return;
          });
          //debug("ids = " + JSON.stringify(ids));
          step();
        });
      },
      function updateCells (step) {
        sheet.getCells({
          'min-row': ROW_MIN,
          'max-row': sheet.rowCount,
          'min-col': firstEmptyColumn,
          'max-col': firstEmptyColumn,
          'return-empty': true
        }, function (err, cells) {

          //console.log('Cells' + cells);
          //console.log('Cells' + cells.length);

          debug("Update col : " + cells[0].col);
          cells[1].value = (new Date()).toISOString().replace(/T.*/, '');

          Object.keys(ids).forEach(
            function (row) {
              const statsId = ids[row];
              if (!(statsId in data)) {
                error("Stats not found : " + statsId);
                cells[parseInt(row) - ROW_MIN].numericValue = 0;
              } else {
                //debug(statsId+" "+data[statsId]);
                cells[parseInt(row) - ROW_MIN].numericValue = data[statsId];
              }

            }
          );
          sheet.bulkUpdateCells(cells, step);

        });
      }
    ], function (err) {
      if (err) {
        error(err);
      }
      callback(err);
    });
  };
}