import { kafkaConsumer } from "../kafka-producers/kafka.consumer"

export const userConsumer = async ()=>{
    await kafkaConsumer({groupId:"user",topic:"user",cb:(data:any)=>{
        console.log(data);
    }})
}