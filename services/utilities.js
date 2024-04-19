const deepCopyObject = obj => {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (error) {
        console.error("Failed to copy object:", error);
        return null;
    }
};

module.exports = { deepCopyObject };
