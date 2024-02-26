import { PubSubDataRouter } from "./PubSubDataRouter";

type ResponseHandler<Response extends any[]> = (...response: Response) => void;
type ReqListener<ReqData, Response extends any[]> = (reqData: ReqData, responseHandler: ResponseHandler<Response>) => void;

export class GenericReqRespRouter<ResponderId, ReqType, ReqId, ReqData, Response extends any[]> {
  private reqRouter: PubSubDataRouter<ReqType, number, [ReqData, ResponseHandler<Response>]>;
  private pendingReqIds: Set<ReqId>;
  private responderBook: Map<ReqType, ResponderId>;

  constructor() {
    this.reqRouter = new PubSubDataRouter();
    this.pendingReqIds = new Set();
    this.responderBook = new Map();
  }

  registerAsResponder(responderId: ResponderId, reqType: ReqType, reqListener: ReqListener<ReqData, Response>): boolean {
    if (!this.responderBook.has(reqType)) {
      this.responderBook.set(reqType, responderId);
      this.reqRouter.consume(reqType, this as any, reqListener);
      return true;
    } else {
      return false;
    }
  }

  unregisterAsResponder(responderId: ResponderId, reqType: ReqType): boolean {
    if (this.responderBook.has(reqType)) {
      this.responderBook.delete(reqType);
      this.reqRouter.unregister(reqType, this as any);
      return true;
    } else {
      return false;
    }
  }

  request(reqId: ReqId, reqType: ReqType, reqData: ReqData, responseHandler: ResponseHandler<Response>): boolean {
    if (this.pendingReqIds.has(reqId)) {
      return false;
    }
    this.pendingReqIds.add(reqId);
    this.reqRouter.produce(reqType, reqData, (...response: Response) => {
      if (this.pendingReqIds.has(reqId)) {
        responseHandler(...response);
        this.pendingReqIds.delete(reqId);
      }
    });
    return true;
  }

  cancelRequest(reqId: ReqId): boolean {
    return this.pendingReqIds.delete(reqId);
  }
}

//Tests
//function demoGenericReqRespRouter () : void {
//	type RespHandler = (num1: number, num2: number) => void;
//	let responder1 = function (num: number, callback: RespHandler) {
//		callback(num*num, num*num*num);
//	};
//
//	let responder2 = function (num: number, callback: RespHandler) {
//		callback(num*2, num*3);
//	};
//
//    let responders = [responder1, responder2];
//	
//	//template<class ResponderId, class ReqType, class ReqId, class ReqData, class... Response>
//	let reqRespRouter = new GenericReqRespRouter<number, number, number, number, [number, number]>() ;
//	reqRespRouter.registerAsResponder(0, 0, responder1);
//	reqRespRouter.registerAsResponder(1, 1, responder2);
//	let reqId = 1;
//	function resultHandler (res1: number, res2: number) : void {
//		console.log(`ReqId: ${reqId} , Results: ${res1} , ${res2}`);
//		if (reqId++ < 100) {
//            console.log(`Sending ReqId: ${reqId}`);
//			reqRespRouter.request(reqId, reqId%2, reqId, resultHandler);
//		}
//	};
//
//	reqRespRouter.request(reqId, reqId%2, reqId, resultHandler);
//}
//
//demoGenericReqRespRouter()
