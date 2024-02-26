import { Kafka, EachMessagePayload } from 'kafkajs';

interface KafkaLibrary {
  produce: (topic: string, message: string) => Promise<void>;
  subscribeAsGroupMember: (topics: string[], callback: (message: KafkaMessage) => void) => Promise<void>;
  subscribeAsGroupIndividual: (topics: string[], callback: (message: KafkaMessage) => void) => Promise<void>;
  unsubscribe: (topics: string[]) => Promise<void>;
}

interface KafkaMessage {
  topic: string;
  partition: number;
  offset: string;
  value: string;
}

export const createKafkaLibrary = async (brokers: string[],
                                  appId: string,
                                  appGroup: string,
                                  callback: (methods: KafkaLibrary)=>void): Promise<void> => {
  const kafka = new Kafka({
    clientId: appId,
    brokers: brokers,
  });

  const producer = kafka.producer();
  const consumer = kafka.consumer({ groupId: appId });

  const groupMemberSubscriptions = new Set<string>();
  const individualSubscriptions = new Set<string>();

  const produce = async (topic: string, message: string): Promise<void> => {
    try {
      const { offset } = await producer.send({
        topic: topic,
        messages: [{ value: message }],
      });
      console.log(`Produced message to ${topic} with offset ${offset}`);
    } catch (error) {
      console.error(`Error producing message: ${error.message}`);
    }
  };

  const subscribeAsGroupMember = async (topics: string[], callback: (message: KafkaMessage) => void): Promise<void> => {
    for (const topic of topics) {
      if (individualSubscriptions.has(topic)) {
        throw new Error(`Topic '${topic}' is already subscribed as an individual`);
      }
    }

    try {
      await consumer.subscribe({ topics, groupId: appGroup });
      topics.forEach(topic => groupMemberSubscriptions.add(topic));
      await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          callback({
            topic,
            partition,
            offset: message.offset,
            value: message.value.toString(),
          });
        },
      });
      console.log(`Subscribed to topics: ${topics} as group member of ${appGroup}`);
    } catch (error) {
      console.error(`Error subscribing as group member: ${error.message}`);
    }
  };

  const subscribeAsGroupIndividual = async (topics: string[], callback: (message: KafkaMessage) => void): Promise<void> => {
    for (const topic of topics) {
      if (groupMemberSubscriptions.has(topic)) {
        throw new Error(`Topic '${topic}' is already subscribed as a group member`);
      }
    }

    try {
      await consumer.subscribe({ topics, groupId: appId });
      topics.forEach(topic => individualSubscriptions.add(topic));
      await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          callback({
            topic,
            partition,
            offset: message.offset,
            value: message.value.toString(),
          });
        },
      });
      console.log(`Subscribed to topics: ${topics} as individual member of ${appId}`);
    } catch (error) {
      console.error(`Error subscribing as individual member: ${error.message}`);
    }
  };

  const unsubscribe = async (topics: string[]): Promise<void> => {
    try {
      await consumer.unsubscribe({ topics });
      topics.forEach(topic => {
        groupMemberSubscriptions.delete(topic);
        individualSubscriptions.delete(topic);
      });
      console.log(`Unsubscribed from topics: ${topics}`);
    } catch (error) {
      console.error(`Error unsubscribing from topics: ${error.message}`);
    }
  };

  try {
    await producer.connect();
    await consumer.connect();
  } catch (error) {
    throw new Error(`Failed to connect to Kafka cluster: ${error.message}`);
  }

  callback({produce,
          subscribeAsGroupMember,
          subscribeAsGroupIndividual,
          unsubscribe});
};