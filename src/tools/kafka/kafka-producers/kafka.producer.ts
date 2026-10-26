import kafka from "../../../config/kafka";


export const kafkaProducer = {
    sendMessage: async (topic: string, message: any) => {
        const producer = kafka.producer();
        await producer.connect();
        await producer.send({
            topic: topic,
            messages: [{ value: JSON.stringify(message) }],
        });
        await producer.disconnect();
    },
};