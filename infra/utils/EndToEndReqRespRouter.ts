import { PubSubDataRouter } from "./PubSubDataRouter";

type ResponseHandler<Response extends any[]> = (...response: Response) => void;
type ReqListener<ReqData, Response extends any[]> = (reqData: ReqData, responseHandler: ResponseHandler<Response>) => void;

class EndToEndReqRespRouter<ResponderId, ReqId, ReqData, Response extends any[]> {
    private reqRouter: PubSubDataRouter<ResponderId, number, [ReqData, ResponseHandler<Response>]>;
    private pendingreqIds: Set<ReqId>;
    private id : number;

    constructor() {
        this.reqRouter = new PubSubDataRouter<ResponderId, number, [ReqData, ResponseHandler<Response>]>();
        this.pendingreqIds = new Set<ReqId>();
        this.id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    }

    registerAsResponder(responderId: ResponderId, reqListener: ReqListener<ReqData, Response>): boolean {
        return this.reqRouter.consume(responderId,
                                      this.id,
                                      (reqData: ReqData, responseHandler: ResponseHandler<Response>) => {
                                          reqListener(reqData, responseHandler);
                                      }
        );
    }

    unregisterAsResponder(responderId: ResponderId): boolean {
        return this.reqRouter.unregister(responderId, this.id);
    }

    request(responderId: ResponderId, reqId: ReqId, reqData: ReqData, responseHandler: ResponseHandler<Response>): void {
        if (this.pendingreqIds.has(reqId)) {
            throw new Error("Duplicate reqId");
        }
        this.pendingreqIds.add(reqId);
        this.reqRouter.produce(responderId, reqData, (...response: Response) => {
            if (this.pendingreqIds.has(reqId)) {
                setTimeout( function () : void { responseHandler(...response); }, 0 );
                this.pendingreqIds.delete(reqId);
            }
        });
    }

    cancelRequest(reqId: ReqId): boolean {
        return this.pendingreqIds.delete(reqId);
    }
}