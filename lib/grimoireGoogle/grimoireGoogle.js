var logger = require('../logger');
var async = require('async');
var GoogleSpreadsheet = require("google-spreadsheet");

var DOC_SHEET = 1;

var ROW_MIN = 1;
var COL_MIN = 4;

var COL_CARD_ID = 1;
var COL_STAT_NUMBER = 2;

//------------------------------------

var insert = function (docKey, data, callback) {

    // spreadsheet key is the long id in the sheets URL
    var doc = new GoogleSpreadsheet(docKey);
    var sheet;
    var firstEmptyColumn;
    var ids = {};

    async.series([
        function setAuth(step) {
            // see notes below for authentication instructions!
            var creds = require(__dirname + '/API Project-695e3069a8fb.json');
            // OR, if you cannot save the file locally (like on heroku)
            //var creds_json = {
            //    client_email: 'yourserviceaccountemailhere@google.com',
            //    private_key: 'your long private key stuff here'
            //}

            doc.useServiceAccountAuth(creds, step);
        },
        function getInfoAndWorksheets(step) {
            doc.getInfo(function (err, info) {
                if (err) {
                    logger.error(err);
                    return step(err);
                }
                //logger.info('Loaded doc: ' + info.title + ' by ' + info.author.email);
                sheet = info.worksheets[DOC_SHEET];
                logger.info('sheet : "' + sheet.title + '" ' + sheet.rowCount + 'x' + sheet.colCount);
                step();
            });
        },
        function getFirstEmptyColumn(step) {
            sheet.getCells({
                'min-row': ROW_MIN+1,
                'max-row': ROW_MIN+1,
                'min-col': COL_MIN,
                'max-col': sheet.colCount,
                'return-empty': true
            }, function (err, cells) {
                //console.log('Cells' + cells.length);

                var cpt = 0;

                cells.some(function (cell) {
                    //console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value);
                    if ((cell.row === ROW_MIN+1) && (cell.value === "")) {
                        firstEmptyColumn = cell.col;
                    }
                    cpt++;
                    return firstEmptyColumn;
                });

                if (!firstEmptyColumn) {
                    step("No empty column");
                }
                //logger.info("firstEmptyColumn = " + firstEmptyColumn);
                step();
            });
        },
        function getIds(step) {
            sheet.getCells({
                'min-row': ROW_MIN + 2,
                'max-row': sheet.rowCount,
                'min-col': COL_CARD_ID,
                'max-col': COL_STAT_NUMBER,
                'return-empty': false
            }, function (err, cells) {
                //console.log('Cells' + cells.length);

                var cpt = 0;
                var currCardId = "";

                ids[1] = 'TOTAL';
                cells.some(function (cell) {
                    //console.log('Cell R' + cell.row + 'C' + cell.col + ' = ' + cell.value);
                    //logger.info(cell.col+" "+COL_CARD_ID);
                    if (cell.col === COL_CARD_ID) {
                        currCardId = cell.value;
                    }
                    if (cell.col === COL_STAT_NUMBER) {
                        if((currCardId !="") && (currCardId !="cardId")) {
                            ids[cell.row] = currCardId + '_' + cell.value;
                        }
                    }
                    cpt++;
                    //return firstEmptyColumn;
                    return;
                });
                //logger.info("ids = " + JSON.stringify(ids));
                step();
            });
        },
        function updateCells(step) {
            sheet.getCells({
                'min-row': ROW_MIN,
                'max-row': sheet.rowCount,
                'min-col': firstEmptyColumn,
                'max-col': firstEmptyColumn,
                'return-empty': true
            }, function (err, cells) {

                //console.log('Cells' + cells);
                //console.log('Cells' + cells.length);

                logger.info("Update col : " + cells[0].col);
                cells[1].value = (new Date()).toISOString().replace(/T.*/,'');

                Object.keys(ids).forEach(
                    function(row) {
                        statsId = ids[row];
                        if (!(statsId in data)) {
                            logger.error("Stats not found : " + statsId);
                            cells[row-ROW_MIN].numericValue = 0;
                        } else {
                            //logger.info(statsId+" "+data[statsId]);
                            cells[row-ROW_MIN].numericValue = data[statsId];
                        }

                    }
                );
                sheet.bulkUpdateCells(cells, step);

            });
        }
    ], function (err) {
        if (err) {
            logger.error(err);
        }
        callback(err);
    });
}

//------------------------------------

module.exports = {};

module.exports.insert = insert;

//------------------------------------

