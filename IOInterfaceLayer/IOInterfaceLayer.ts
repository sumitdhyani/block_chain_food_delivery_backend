import { QueueUtilsCallback, ReqRespIOUtilsCallback, ErrCallback, Logger, MessageCallback } from "../infra/PublicInterfaces"
import { createKafkaLibrary } from "../infra/io/kafka"
import { initExpress } from "../infra/io/Express"
export enum IOInterfaceType {
    middleware,
    reqresponse
}

export enum ServiceGroup {
    dummy
}

export enum IOInterface {
    kafka,
    express
}

enum Middleware {
    kafka = IOInterface.kafka
}

enum ReqResponse {
    express = IOInterface.express
}




let ioInterfaceMetaData = new Map<ServiceGroup, Map<IOInterfaceType, IOInterface>>()
ioInterfaceMetaData[ServiceGroup.dummy] = new Map<IOInterfaceType, IOInterface>([
    [IOInterfaceType.middleware, IOInterface.kafka],
    [IOInterfaceType.reqresponse, IOInterface.express],
])

export function getMiddleware(serviceGroup: ServiceGroup,
                            messageCallback: MessageCallback,
                            queueUtilsCallback : QueueUtilsCallback,
                            errCallback: ErrCallback,
                            connParams: Map<string, string>,
                            logger: Logger): void {
    if (ioInterfaceMetaData.has(serviceGroup) &&
        ioInterfaceMetaData[serviceGroup].has(IOInterfaceType.middleware))
    {
        switch(ioInterfaceMetaData[serviceGroup].get(IOInterfaceType.middleware)) {
            case Middleware.kafka:
                try {
                    let brokerArr: string[] = (connParams["brokers"]).split(',')
                    createKafkaLibrary(brokerArr,
                                    connParams["appId"],
                                    connParams["appGroup"],
                                    messageCallback,
                                    queueUtilsCallback,
                                    errCallback,
                                    logger)
                } catch (error) { 
                    errCallback(error)
                }
                break
        }
    }


}

export function getReqResponse(serviceGroup: ServiceGroup,
                                reqResponse: ReqResponse,
                                reqRespIOUtilsCallback : ReqRespIOUtilsCallback,
                                errCallback: ErrCallback,
                                connParams: Map<string, string>,
                                logger: Logger
                                ) : void {
    if (ioInterfaceMetaData.has(serviceGroup) &&
        ioInterfaceMetaData[serviceGroup].has(IOInterfaceType.middleware))
    {
        switch(ioInterfaceMetaData[serviceGroup].get(IOInterfaceType.reqresponse)) {
            case ReqResponse.express:
                try {
                    initExpress(parseInt(connParams["port"]),
                                logger,
                                reqRespIOUtilsCallback,
                                errCallback)
                } catch (error) { 
                    errCallback(error)
                }
                break
        }
    }
} 

