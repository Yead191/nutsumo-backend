import { userConsumer } from "./user.consumer";

export async function loadConsumer() {
    await Promise.all([userConsumer()]);
    console.log("consumer loaded");
}