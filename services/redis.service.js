const redis = require('redis');
const redisClient = redis.createClient({port: 6379, host: '127.0.0.1'});
async function initializeRedis() {
    await redisClient.connect();
}
initializeRedis().catch(console.error);

const getKeys = async (pattern) => {
    return await client.keys(pattern)
}

const recursiveDeleteKeys = async (prefixKey, obj) => {
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj) || prefixKey == null) {
        return;
    }
    for (const [key, value] of Object.entries(obj)) {
        // if value is object
        if (value !== null &&  typeof value === 'object' && !Array.isArray(value)) {
            const childKey = `${prefixKey}:${key}`;
            await redisClient.del(childKey);
            const nowKey = (value.objectType && value.objectId) ? `${value.objectType}:${value.objectId}`: childKey;
            await recursiveDeleteKeys(nowKey, value);
        }

        // if value is array
        else if (Array.isArray(value)) {
            const childKey = `${prefixKey}:${key}`;
            await redisClient.del(childKey);

            // handle each object inside:
            for (const item of value) {
                if (item !== null && typeof item === 'object') {
                    const itemKey = (item.objectType && item.objectId)? `${item.objectType}:${item.objectId}`
                        : `${childKey}:${value.indexOf(item)}`;
                    await recursiveDeleteKeys(itemKey, item);
                }
            }
        }

        // if value is a simple value
        else if (typeof value === 'string' || typeof value === 'number') {
            const keyName = `${obj.objectType}:${obj.objectId}`;
            await redisClient.del(keyName);
        }
    }
}


//function to update redis key-value pairs:
const recursiveUpdate = async (prefixkey, newData) => {
    if (typeof newData !== 'object' || Array.isArray(newData)) {
        return;
    }
    for (const [key, value] of Object.entries(newData)){

        if (newData !== null && newData[key] !== undefined){
            if (value !== null && typeof value == 'object' && !Array.isArray(value)){
                const childKey = `${prefixkey}:${key}`;
                await redisClient.hSet(childKey, 'data', JSON.stringify(value))
                const nowKey = (value.objectType && value.objectId) ? `${value.objectType}:${value.objectId}`: childKey;
                await recursiveUpdate(nowKey, value);
            }

            if (Array.isArray(value)){
                const childKey = `${prefixkey}:${key}`;
                await redisClient.hSet(childKey, 'data', JSON.stringify(value));
                for (let item of value){
                    if (item !== null && typeof item === 'object'){
                        const itemKey = (item.objectType && item.objectId) ? `${item.objectType}:${item.objectId}`: `${childKey}:${value.indexOf(item)}`;
                        await recursiveUpdate(itemKey, item);
                    }
                }
            }

            if (typeof value === 'string' || typeof value === 'number'){
                const keyName = `${newData.objectType}:${newData.objectId}`
                await redisClient.hSet(keyName, 'data', JSON.stringify(newData))
            }
        }
    }
}


module.exports = {
    redisClient,
    recursiveUpdate,
    recursiveDeleteKeys

}