
const express = require('express');
const controller = require('./controllers/PlanController.js');
const rabbitMQService = require('./services/rabbitmq.service');
const { createIndexWithMapping } = require('./services/elasticsearch.service');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

async function startServer() {

    try {
        // Ensure RabbitMQ connection and channel are ready
        await rabbitMQService.connectRabbitMQ();

        app.post('/demo/v1/post', controller.post);
        app.get('/demo/v1/get', controller.get);
        app.get('/demo/v1/:objectId', controller.getId);
        app.patch('/demo/v1/:objectId', controller.patchId);
        app.delete('/demo/v1/:objectId', controller.deleteId);
        await createIndexWithMapping();
        // Start listening for requests
        const server = app.listen(3000, () => {
            console.log('Server listening on port 3000');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            server.close(() => {
                console.log('Server shutdown complete.');
            });
        });
    }
    catch (error) {
            console.error('Failed to start server:', error);
    }
}

startServer();
module.exports = app;
