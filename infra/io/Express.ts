// Import required modules
import { ErrCallback, Logger, ReqRespIOUtilsCallback } from '../PublicInterfaces';
import express, { Request, Response } from 'express';
export { ErrCallback, ReqRespIOUtilsCallback } from '../PublicInterfaces'

export type ReqHandler = (queryParams: Object, body: Object, headers: Object, params: Object, resultCallback: (result: Object)=>void) => void;

export function initExpress (port: number, logger: Logger, reqRespIOUtilsCallback: ReqRespIOUtilsCallback, errCallback: ErrCallback) : void {
  const app = express();
  app.listen(port, () => {
    logger.info(`Server is listening on port ${port}`);
  });

  let existingGetRoutes: Set<string> = new Set<string>();
  function setGetRoute(route: string, reqHandler: ReqHandler, errCallback: ErrCallback) : void {
    // Check if route is already set, if so, throw an error.
    if( existingGetRoutes.has(route) ) {
      errCallback(new Error("This get route has already been set"))
    }
    existingGetRoutes.add(route);
    // Define new route handler using reqHandler function.
    app.get(route, (req: Request, res: Response) => {
     // Call reqHandler with request's query, body, headers, and params.
     // Use resultHandler to send result back to client.
     reqHandler(req.query, req.body, req.headers, req.params, (result: Object) => { res.send(result) })
    })
  }

  let existingPostRoutes: Set<string> = new Set<string>();
  function setPostRoute(route: string, reqHandler: ReqHandler, errCallback: ErrCallback) : void {
    // Check if route is already set, if so, throw an error.
    if( existingPostRoutes.has(route) ) {
      errCallback(new Error("This get route has already been set"))
    }
    existingPostRoutes.add(route);
    // Define new route handler using reqHandler function.
    app.get(route, (req: Request, res: Response) => {
     // Call reqHandler with request's query, body, headers, and params.
     // Use resultHandler to send result back to client.
     reqHandler(req.query, req.body, req.headers, req.params, (result: Object) => { res.send(result) })
    })
  }

  reqRespIOUtilsCallback({setGetRoute : setGetRoute, setPostRoute : setPostRoute})

}