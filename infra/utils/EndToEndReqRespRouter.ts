import { Map, Set } from "typescript-collections";
import { PubSubDataRouter } from "./PubSubDataRouter";

type ResponseHandler<Response extends any[]> = (...response: Response) => void;
type ReqListener<ReqData, Response extends any[]> = (reqData: ReqData, responseHandler: ResponseHandler<Response>) => void;

class EndToEndReqRespRouter<ResponderId, ReqId, ReqData, Response extends any[]> {
    private reqRouter: PubSubDataRouter<ResponderId, number, [ReqData, ResponseHandler<Response>]>;
    private pendingreqIds: Set<ReqId>;

    constructor() {
        this.reqRouter = new PubSubDataRouter<ResponderId, number, [ReqData, ResponseHandler<Response>]>();
        this.pendingreqIds = new Set<ReqId>();
    }

    registerAsResponder(responderId: ResponderId, reqListener: ReqListener<ReqData, Response>): boolean {
        return this.reqRouter.consume(responderId,
                                      this.hashCode(),
                                      (reqData: ReqData, responseHandler: ResponseHandler<Response>) => {
                                          reqListener(reqData, responseHandler);
                                      }
        );
    }

    unregisterAsResponder(responderId: ResponderId): boolean {
        return this.reqRouter.unregister(responderId, this.hashCode());
    }

    request(responderId: ResponderId, reqId: ReqId, reqData: ReqData, responseHandler: ResponseHandler<Response>): void {
        if (this.pendingreqIds.contains(reqId)) {
            throw new Error("Duplicate reqId");
        }
        this.pendingreqIds.add(reqId);
        this.reqRouter.produce(responderId, reqData, (...response: Response) => {
            if (this.pendingreqIds.contains(reqId)) {
                setTimeout( function () : void { responseHandler(...response); }, 0 );
                this.pendingreqIds.remove(reqId);
            }
        });
        
    }

    cancelRequest(reqId: ReqId): boolean {
        if (this.pendingreqIds.contains(reqId)) {
            this.pendingreqIds.remove(reqId);
            return true;
        }
        return false;
    }

    private hashCode(): number {
        // A simple hash function for the sake of example.
        // In a real-world scenario, a more robust hash function should be used.
        return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    }
}


