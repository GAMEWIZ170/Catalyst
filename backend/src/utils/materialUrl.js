module.exports = (material) => material.url || (material.file && material.file.url) || material.linkUrl;
