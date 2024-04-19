
let storedData = {};
const { deepCopyObject } = require('../services/utilities');

const getStoredData = () => {
    console.log("Retrieving stored data: ", storedData);
    return JSON.parse(JSON.stringify(storedData));
}

const saveStoredData = (key, value) => {
    const data = getStoredData();
    console.log("Before update: ", storedData, data);
    data[key] = deepCopyObject(value);
    storedData = data;
    console.log("After update: ", storedData);
}

const refreshData = (data) => {
    console.log("Refreshing data: ", data);
    storedData = {};
    for (const item of Object.entries(data)){
        storedData[item[0]] = deepCopyObject(item[1]);
    }
    console.log("Data refreshed: ", storedData);
}

module.exports = {
    getStoredData,
    saveStoredData,
    refreshData
};
