import { Router, Response, Request, NextFunction } from "express";

const debug = require('debug')('server:debug:routes:api');
// const error = require('debug')('server:error:routes:api');

import { DestinyDb } from "../utils/destinyDb/destinyDb";

//noinspection JSUnusedLocalSymbols
function apiRouter (passport): Router {
  const router: Router = Router();

  router.route('/')
        // ====================================
        // route for getting users listStats
        // ====================================
        .get((request: Request, response: Response) => {
          debug("GET /");

          response.setHeader('Last-Modified', (new Date()).toUTCString());

          DestinyDb.listStats(function (err, docs) {
            if (err) {
              response.send(err);
            } else {
              response.send(JSON.stringify(docs, null, 2));
            }
          });
        });

  return router;
}

export {apiRouter}
