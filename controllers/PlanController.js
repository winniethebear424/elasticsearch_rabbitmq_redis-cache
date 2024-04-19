const client = require('./JWT');
const { Validator } = require('jsonschema');
const etag = require('etag');
const { isEqual } = require('lodash');

const schema = require('../services/Schema.json');
const validator = new Validator();
const validateSchema =(data) => validator.validate(data, schema);
const {recursiveUpdate, deleteKeys, redisClient, recursiveDeleteKeys} = require('../services/redis.service');
const {updatingData, retrieveData, deleteSavedPlan} = require('../services/plan.service');
const { getStoredData, saveStoredData, clearStoredData } = require('../plans/planStored');
const { createIndexWithMapping, updateElasticSearch, insertData } = require('../services/elasticsearch.service');
const { convertDate } = require('../utils/utils');
const { connectRabbitMQ } = require('../services/rabbitmq.service');
const Client = require('../services/elasticsearch.service');
async function startMessaging(){
    const channel = await connectRabbitMQ();
}
startMessaging();


const post = async (req, res) => {
    // using google idp signed bearer token to authenticate the user
    const token = req.headers.authorization?.split(' ')[1];
    if (!token){
        res.status(401).send({"message":"Unauthorized~"});
    }
    try {
        // Convert the request body to a dictionary
        const validationResults = validateSchema(req.body, schema);   // boolean
        if (validationResults.valid === true) { // check if the data matches the schema format
            try {

                // Convert creationDate to the acceptable format before saving
                if (req.body.creationDate) {
                    req.body.creationDate = convertDate(req.body.creationDate);
                }
                getStoredData()[req.body.objectId] = req.body;
                const data = req.body;
                const eTag = etag(JSON.stringify(req.body));
                res.setHeader('ETag', eTag);
                const baseKey = `${data.objectType}:${data.objectId}`;
                await redisClient.hSet(baseKey, 'data', JSON.stringify(data));

                //recursion
                const storeDataInRedis = async (prefixKey, obj) => {
                    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
                        return;
                    }
                    for (const [key, value] of Object.entries(obj)) {

                        // if value is object
                        if (value !== null &&  typeof value === 'object' && !Array.isArray(value)) {
                            const childKey = `${prefixKey}:${key}`;
                            await redisClient.hSet(childKey, 'data', JSON.stringify(value));
                            const nowKey = (value.objectType && value.objectId) ? `${value.objectType}:${value.objectId}`: childKey;
                            await storeDataInRedis(nowKey, value);
                        }

                        // if value is array
                        else if (Array.isArray(value)) {
                            const childKey = `${prefixKey}:${key}`;
                            await redisClient.hSet(childKey, 'data', JSON.stringify(value));

                            // handle each object inside:
                            for (const item of value) {
                                if (item !== null && typeof item === 'object') {
                                    const itemKey = (item.objectType && item.objectId)? `${item.objectType}:${item.objectId}`
                                        : `${childKey}:${value.indexOf(item)}`;
                                    await storeDataInRedis(itemKey, item);
                                }
                            }
                        }

                        // if value is a simple value
                        else if (typeof value === 'string' || typeof value === 'number') {
                            const keyName = `${obj.objectType}:${obj.objectId}`;
                            await redisClient.hSet(keyName, 'data', JSON.stringify(value));
                        }

                    }
                }
                await storeDataInRedis(baseKey, data);
                await saveStoredData(data.objectId, req.body);
                // insert into elasticsearch
                // await createIndexWithMapping(data);
                console.log('hereee before rabbitmq');
                // Publish to RabbitMQ after saving
                connectRabbitMQ().then(channel => {
                    const msg = { type: 'new_plan_created', data: req.body };
                    channel.sendToQueue('plan_updates', Buffer.from(JSON.stringify(msg)));
                });
                await insertData(req.body);
                console.log('hereee inserting');
                res.status(200).send({"message": "Data stored successfully"});
            }
            catch (error) {
                res.status(500).send("storing error1 in redis" + error.message);
            }
        }
        else{
            return res.status(400).send({"message": "Data type does not match the specified schema"});
        }
    }
    catch (error) {
        res.status(500).send("storing error2 in redis" + error.message);
    }
};

const get = async (req, res) => {
    const storedData = getStoredData();
    console.log('storedData tese',storedData);

    const token = req.headers.authorization?.split(' ')[1];
    if (!token){
        res.status(401).send({"message":"Unauthorized~"});
    }
    else if (Object.keys(getStoredData()).length === 0){
        res.status(404).send({"message":"No data found"});
    }

    // send access log to RabitMQ
    connectRabbitMQ().then(channel => {
        const msgs = {type: 'plan_accessed', accessed: Date.now()};
        channel.sendToQueue('access_logs', Buffer.from(JSON.stringify(msgs)));
    })
    console.log('her here here')
    res.send(storedData);
};

const getId = async(req, res)=> {
    const objectId = req.params.objectId;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token){
        return res.status(401).send({"message":"Unauthorizedb"});
    }
    
    if (getStoredData()[objectId]){
        const dataEtag = etag(JSON.stringify(getStoredData()[objectId]));
        res.setHeader('ETag', dataEtag);
        if (req.headers['if-none-match'] === dataEtag) {
            return res.status(304).send({ "message": "Not Modified" });
        }
        // send access log to RabitMQ
        connectRabbitMQ().then(channel =>{
            const msgs = {type:'plan_detail_accessed', accessed: Date.now()};
            channel.sendToQueue('detail_access_logs', Buffer.from(JSON.stringify(msgs)));
        })
        res.status(200).send(getStoredData()[objectId]);
    }
    else{
        res.status(404).send({"message":"Data not found"});
    }
};

const deleteId = async(req, res) => {
    const objectId = req.params.objectId;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token){
        return res.status(401).send({"message":"Unauthorizedc"});
    }
    const DataToModify = getStoredData()[objectId];
    if (!DataToModify){
        return res.status(404).send({"message":"Data not found oh"});
    }
    const baseKey = `${DataToModify.objectType}:${DataToModify.objectId}`
    await recursiveDeleteKeys(baseKey, DataToModify);
    
    const deletionResult = await deleteSavedPlan(objectId);
    if (deletionResult.success) {

        // Notify other services of deletion
        connectRabbitMQ().then(channel => {
            const msg = { type: 'plan_deleted', objectId: objectId };
            channel.sendToQueue('plan_deletions', Buffer.from(JSON.stringify(msg)));
        });
        res.status(200).send({"message": "Data deleted successfully"});
    }
    else if( deletionResult.notFound){
        res.status(404).send({"message": "Data not found"});
    }

};

const patchId = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token){
        return res.status(401).send({"message":"Unauthorizedd"});
    }
    const objectId = req.params.objectId;
    const allData = getStoredData();
    const planToModify = await retrieveData(objectId);
    if (!planToModify){
        return res.status(404).send({"message":"Data not found"});
    }
    const validationResults = validateSchema(req.body, schema);
    if (validationResults.valid === false){
        return res.status(400).send({"message": "Data type does not match the specified schema"});
    }
    try{

        const baseKey = `${planToModify.objectType}:${planToModify.objectId}`;
        await updatingData(objectId, req.body);
        await recursiveUpdate(baseKey, req.body);
        res.status(200).send({"message": "Data updated successfully"});
        await updatingData(objectId, req.body);

        // Notify other services of the update
        connectRabbitMQ().then(channel => {
            const updateMsg = { type: 'post_update_plan', objectId: objectId, updates: req.body };
            channel.sendToQueue('plan_updates', Buffer.from(JSON.stringify(updateMsg)));
        });
        await updateElasticSearch({
            objectId: req.params.id,
            changes: req.body
        });

    }
    catch (error) {
        console.error(error); // 可以在控制台输出错误信息，方便调试
        res.status(500).send({"message": "Internal Server Error!"});
    }

}

module.exports = {
    post,
    get,
    getId,
    deleteId,
    patchId
}