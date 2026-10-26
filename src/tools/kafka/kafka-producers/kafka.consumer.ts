import kafka from "../../../config/kafka";

export const kafkaConsumer = async ({groupId,topic,cb}:{groupId:string,topic:string,cb:Function}) => {
    try {
            const consumer = kafka.consumer({ groupId: groupId });
    await consumer.connect();
    await consumer.subscribe({ topic: topic, fromBeginning: true });
    await consumer.run({ eachBatch: async ({ batch, heartbeat,resolveOffset, commitOffsetsIfNecessary }) => {

        batch.messages.forEach(async (message) => {
            const data = JSON.parse(message.value?.toString() as string);

            await cb(data);
            
            resolveOffset(message.offset)
        });
        await commitOffsetsIfNecessary();

        heartbeat();

    } });
    } catch (error) {
        console.log(error);
        
    }
}