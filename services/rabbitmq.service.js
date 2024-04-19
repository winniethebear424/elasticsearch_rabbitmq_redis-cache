const amqp = require('amqplib');
const elasticsearchService = require('./elasticsearch.service');

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect('amqp://localhost:5672');
        const channel = await connection.createChannel();
        const queueName = 'planUpdatesQueue';
        await channel.assertQueue(queueName, { durable: true });
        // Sending a message
        const message = JSON.stringify({ objectId: "123", changes: { deductible: 500 } });
        channel.sendToQueue(queueName, Buffer.from(message));
        console.log("Sent:", message);

        // Receiving a message
        console.log("Waiting for messages in queue...");
        channel.consume(queueName, async (message) => {
            console.log("Received:", message.content.toString());
            try {
                const updateData = JSON.parse(message.content.toString());
                // await elasticsearchService.updateElasticSearch(updateData);
                channel.ack(message);
            }catch (error) {
                console.error("Failed to process message:", error);
            }
        });

        // Handling graceful shutdown
        process.on('SIGINT', async () => {
            await channel.close();
            await connection.close();
            console.log('RabbitMQ connection closed');
        });

        return channel;
    } catch (error) {
        console.error("Error connecting to RabbitMQ:", error);
    }
}

module.exports = { connectRabbitMQ };
