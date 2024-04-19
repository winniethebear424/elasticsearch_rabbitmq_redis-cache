
const {getKeyType, setETag, addSetValue, hSet, getKeys, deleteKeys, getAllValuesByKey, sMembers}  = require  ('./redis.service')

const { getStoredData, saveStoredData, refreshData } = require('../plans/planStored')

const retrieveData = async (key) => {
    // alldata is an array with objects, we need to find the object that with objectId = key
    const allData = Object.values(getStoredData())
    console.log('this is the allData', allData)
    for (const item of allData){
        console.log('this is the item', item, 'its id',item.objectId, 'key:', key)
        if (item.objectId === key){
            return item
        }
    }
    console.log('nah nah nah')
    return null
}

const deleteSavedPlan = async (objKey) => {
    let allData = getStoredData();
    if (allData[objKey]) {
        delete allData[objKey]; // Delete the entry if it exists
        await refreshData(allData); // Save the updated data
        return {
            success: true
        }
    }
    else
        {
            return {notFound: true, message: 'Object not found'};
        }

}

const updatingData = async (reqId, newData) => {
    let planStored = Object.values(getStoredData());
    let existingData = findDataWithObjectId(planStored, reqId);

    console.log('this is the existingData', reqId, 'plans:',planStored,'exing dt:', existingData)
    async function recursiveUpdateData(currentData, newData) {
        if (currentData.objectId === newData.objectId) {
            for (const key of Object.keys(newData)) {
                const newValue = newData[key];
                console.log('this is the key', key, 'newData[key]', newData[key], 'cur val', newValue)

                if (typeof newValue === 'object' && newValue !== null  && !Array.isArray(newValue)) {
                    console.log('this is the object', newValue, 'currentData[key]', currentData[key])
                    if (newValue.objectId && currentData[key] && currentData[key].objectId === newValue.objectId) {
                        currentData[key] = newValue;
                    } else {
                        // Add new object
                        currentData_list = [currentData[key], newValue]
                        currentData[key] = currentData_list
                        // append(newValue)
                    }
                }
                else if (Array.isArray(newValue)) {
                    console.log('this is the array', newValue)
                    // check the objectId of that level first
                    if (currentData[key] && currentData[key].objectId === newValue.objectId) {

                        // Replace the whole array if the structure is too complex or does not involve identifiable objects
                        newValue.forEach((item, index) => {
                            if (item && typeof item === 'object' && item.objectId) {
                                let existingItem = currentData[key].find(x => x.objectId === item.objectId);
                                if (existingItem) {
                                    recursiveUpdateData(existingItem, item);
                                }
                                else {
                                    currentData[key].push(item);
                                }
                            }
                            else {
                                // Handle non-object or non-identifiable items
                                if (currentData[key][index]) {
                                    currentData[key][index] = item;
                                } else {
                                    currentData[key].append(item) ; // Add item if no corresponding index
                                }
                            }
                        });
                    }

                }

                else {
                    console.log('this is the primitive', newValue)
                    // Update primitive types directly
                    currentData[key] = newValue;
                }

            }console.log('now Data', currentData)
        } else{
            console.log('not mathed')
            currentData[key].push(newValue);
        }
        saveStoredData(reqId, currentData)
        console.log('done! this is the currentData', currentData)
    }
    await recursiveUpdateData(existingData, newData);
};

function findDataWithObjectId(data, objectId) {
    for (const key in data) {
        const item = data[key];
        if (item.objectId === objectId) {
            return item;
        }
        else if (Array.isArray(item) || typeof item === 'object') {
            // Recursively search in arrays or nested objects
            const found = findDataWithObjectId(item, objectId);
            if (found) {
                return found;
            }
        }
    }
    return null; // Return null if no matching object is found
}


module.exports = {
    retrieveData,
    deleteSavedPlan,
    updatingData,
}
