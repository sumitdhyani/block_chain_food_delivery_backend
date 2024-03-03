import { Kafka, EachMessagePayload } from 'kafkajs'
import { Callback, MessageCallback, VanillaCallback, QueueUtils, QueueUtilsCallback, ErrCallback, Logger } from '../PublicInterfaces'
export { ErrCallback, MessageCallback, VanillaCallback } from '../PublicInterfaces'

export function createKafkaLibrary (brokers: string[],
                                  appId: string,
                                  appGroup: string,
                                  messageCallback: MessageCallback,
                                  queueUtilsCallback: QueueUtilsCallback,
                                  errCallback: ErrCallback,
                                  logger: Logger): void {
  const kafka = new Kafka({
    clientId: appId,
    brokers: brokers,
  })

  const producer = kafka.producer()
  const consumer = kafka.consumer({ groupId: appId })

  const groupMemberSubscriptions = new Set<string>()
  const individualSubscriptions = new Set<string>()

    function produce (msg: string,
                      topic: string,
                      successCallback: VanillaCallback,
                      errCallback: ErrCallback): void {
        producer.send({
          topic: topic,
          messages: [{ value: msg }],
        })
        .then((offset: Number): void => { successCallback() })
        .catch((error: Error): void => { errCallback(error) })
    }

    function subscribeAsGroupMember (queues: string[],
                                    successCallback: VanillaCallback,
                                    errCallback: ErrCallback) : void {
        for (const topic of queues) {
            if (individualSubscriptions.has(topic)) {
                errCallback(new Error(`Topic '${topic}' is already subscribed as an individual`))
            }
        }

        consumer.subscribe({ queues, groupId: appGroup })
        .then((): void => {
            queues.forEach(queue => groupMemberSubscriptions.add(queue))
            successCallback()
        })
        .catch((error: Error): void => { 
            errCallback(error) 
        })
    }

    function subscribeAsIndividual (queues: string[],
                                    successCallback: VanillaCallback,
                                    errCallback: ErrCallback) : void {
        for (const topic of queues) {
            if (groupMemberSubscriptions.has(topic)) {
                errCallback(new Error(`Topic '${topic}' is already subscribed as a group`))
            }
        }

        consumer.subscribe({ queues, groupId: appId })
        .then((): void => {
            queues.forEach(queue => groupMemberSubscriptions.add(queue))
            successCallback()
        })
        .catch((error: Error): void => { 
            errCallback(error) 
        })
    }

    function unsubscribe (queues: string[],
                        successCallback: VanillaCallback,
                        errCallback: ErrCallback) : void {
        consumer.unsubscribe({ queues })
        .then(() => {
            queues.forEach(topic => {
                groupMemberSubscriptions.delete(topic)
                individualSubscriptions.delete(topic)
            })
            successCallback()
        })
        .catch((error: Error): void => {
            errCallback(error) 
        })
    }

    consumer.run({
        eachMessage: async ({ topic, partition, message, heartbeat, pause }) => {
            messageCallback(topic, message)
        },
    }).then(()=>{
        queueUtilsCallback(
            {
                produce : produce,
                consumeAsGroup: subscribeAsGroupMember,
                consumeAsIndividual: subscribeAsIndividual,
                unsubscribe : unsubscribe
            }
        )
    }).catch((error: Error) => {
        errCallback(error)
    })
}