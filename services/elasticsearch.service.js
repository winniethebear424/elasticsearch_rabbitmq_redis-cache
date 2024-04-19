const { Client } = require('@elastic/elasticsearch');
const client = new Client({ node: 'http://localhost:9200' });

//
async function createIndexWithMapping() {
//     const indexName = 'plans';
//     try {
//         const { body: indexExists } = await client.indices.exists({ index: indexName });
//         if (!indexExists) {
//             await client.indices.update({
//                 index: indexName,
//                 body: {
//                     settings: {
//                         number_of_shards: 1,
//                         number_of_replicas: 1
//                     },
//                     mappings: {
//                         properties: {
//                             planCostShares: {type: 'object'},
//                             linkedPlanServices: {
//                                 type: 'nested', // Use 'nested' for nested objects
//                                 properties: {
//                                     linkedService: {type: 'object'},
//                                     planserviceCostShares: {type: 'object'}
//                                 }
//                             },
//                             _org: {type: 'keyword'},
//                             objectId: {type: 'keyword'},
//                             objectType: {type: 'keyword'},
//                             planType: {type: 'keyword'},
//                             creationDate: {
//                                 type: 'date',
//                                 format: "dd-MM-yyyy"
//                             }
//                         }
//                     }
//                 }
//             });
//             console.log('Index created with mappings');
//         } else {
//             console.log('Index already exists');
//         }
//     } catch (error) {
//         console.error('Failed to create index:', error);
//     }
}

async function updateElasticSearch(data) {
    try {
        console.log('this is the data', data,'client', client),
        await client.index({
            index: 'plans',
            id: data.objectId,
            body: {
                doc: data.changes
            }
        });
    } catch (error) {
        console.error('Failed to update document in Elasticsearch:', error);
        // Consider rethrowing the error or handling it depending on your application's needs
    }
}

async function insertData(data) {
    if (!data || !data.objectId) {
        console.error('Invalid data or missing objectId:', data);
        throw new Error('Invalid input data or missing objectId');
    }
    try {
        console.log('try la');
        const response = await client.index({
            index: 'plans',
            id: data.objectId, // 确保每个文档都有一个唯一的ID
            body: data
        });
        console.log('try wan le', data);
        await client.indices.refresh({ index: 'plans' }); // 确保新插入的数据可以立即被搜索到
        console.log('Document inserted:', response);
    } catch (error) {
        console.error('Error inserting data into Elasticsearch:', error);
        throw error; // 重新抛出错误，或者根据需要进行错误处理
    }
}


module.exports = {
    createIndexWithMapping,
    updateElasticSearch, insertData };
