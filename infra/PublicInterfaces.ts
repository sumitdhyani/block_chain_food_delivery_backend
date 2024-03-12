export type Callback<T extends any[]> = (...val: T) => void
export type ErrCallback = Callback<[Error]>
export type MessageCallback = Callback<[string, string]>
export type VanillaCallback = Callback<[]>

export type QueueUtils = {
    produce : (msg: string,
                topic: string,
                successCallback: VanillaCallback,
                errCallback: ErrCallback) => void,

    consumeAsGroup: (queues: string[],
                    successCallback: VanillaCallback,
                    errCallback: ErrCallback) => void,

    consumeAsIndividual: (queues: string[],
                        successCallback: VanillaCallback,
                        errCallback: ErrCallback) => void,

    unsubscribe: (queues: string[],
                successCallback: VanillaCallback,
                errCallback: ErrCallback) => void
}

export type ReqHandler = (queryParams: Object, body: Object, headers: Object, params: Object, resultHandler: (Object)=>void) => void;
export type ReqRespIOUtils = {
    setGetRoute: (route: string, reqHandler: ReqHandler, errCallback: ErrCallback) => void
    setPostRoute: (route: string, reqHandler: ReqHandler, errCallback: ErrCallback) => void
}

export type ReqRespIOUtilsCallback = Callback<[ReqRespIOUtils]>
export type QueueUtilsCallback = Callback<[QueueUtils]>
export type Logger = { debug: Callback<[string]>,
    info: Callback<[string]>,
    warn: Callback<[string]>,
    error: Callback<[string]>,
}
