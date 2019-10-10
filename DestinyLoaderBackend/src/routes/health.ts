import {Request, Response, Router} from "express";
import async = require("async");
import {DestinyDb} from "../utils/destinyDb/destinyDb";
import {Destiny} from "../utils/destiny/destiny";
import {Config} from "../utils/config/config";
import {Stat} from "../models/stat";

const debug = require('debug')('server:routes:health');


const healthRouter: Router = Router();

healthRouter.route('/')
// ====================================
// route for getting series list
// ====================================
    .get((request: Request, response: Response) => {
        debug("GET /");

        async.parallel([
                (callback) => {
                    DestinyDb.listStats((err, docs:Stat[]) => {
                        if (err) {
                            debug(err);
                            callback(new Error("DestinyDb KO"))
                        } else {
                            if (!docs) {
                                return callback(new Error("DestinyDb KO"))
                            }
                            docs.sort((a,b) => {
                                return b.date.getTime() - a.date.getTime()
                            });
                            if (docs[0] && docs[0].date) {
                                let deltaMin = (new Date().getTime()-docs[0].date.getTime())/(60 * 1000);
                                if (deltaMin > 30) {
                                    return callback(new Error("Destiny dataMiner KO"))
                                }
                            } else {
                                return callback(new Error("DestinyDb stats KO"))
                            }
                            callback(null, "Destiny stats OK")
                        }
                    })
                },
                (callback) => {
                    Destiny.queryItemByName(
                        "Thorn",
                        (err, item) => {
                            if (err) {
                                debug(err);
                                callback(new Error("Destiny API KO"));
                            } else if (!item || !item.displayProperties || (item.displayProperties.name != 'Thorn')) {
                                debug(item);
                                callback(new Error("Destiny API KO"));
                            } else {
                                callback(null, "Destiny API OK");
                            }
                        },
                        Config.getLang('en'));
                }

            ],
            (err:Error, results) => {
                if (err) {
                    if (err.message) {
                        response.status(203).json({status: 203, message: err.message});
                    } else {
                        response.status(203).json({status: 203, message: err});
                    }
                } else {
                    response.status(200).json({status: 200, message: results});
                }
            }
        )
        ;

    })
;


export {healthRouter}

