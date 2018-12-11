import { Router, Response, Request, NextFunction } from "express";

const debug = require('debug')('server:debugLogger:routes:index');
//const error = require('debugLogger')('server:error:routes:index');

//noinspection JSUnusedLocalSymbols
function defaultRouter (passport): Router {
  const router: Router = Router();

  router.route('/')
        .get((request: Request, response: Response) => {
          debug("GET /");
          response.render('index1', {title: 'Light level'});
        });
  router.route('/index.html')
        .get((request: Request, response: Response) => {
          debug("GET /index.html'");
          response.render('index1', {title: 'Light level'});
        });
  router.route('/index1.html')
        .get((request: Request, response: Response) => {
          debug("GET /index1.html");
          response.render('index1', {title: 'Light level'});
        });

  return router;
}

export { defaultRouter }
