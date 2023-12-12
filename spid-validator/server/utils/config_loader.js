require('dotenv').config();

const replaceEnvVariableConfig = (configJson,envMap) => {
    Object.entries(envMap).forEach(([prop,envVar]) => {
        if(process.env[envVar]) configJson[prop] = process.env[envVar];
    });
    return configJson;
}

const serverConfig = () => {
    const envMap = {
        'host': 'SERVER_HOST',
        'useProxy': 'SERVER_PROXY_ACTIVE'
    }
    let config = require("../../config/server.json");
    return replaceEnvVariableConfig(config,envMap);
}

const idpConfig = () => {
    const envMap = {
        'entityID': 'IDP_ENTITY_ID'
    }
    let config = require("../../config/idp.json");
    return replaceEnvVariableConfig(config,envMap);
}

const idpDemoConfig = () => {
    const envMap = {
        'entityID': 'DEMO_ENTITY_ID'
    }
    let config = require("../../config/idp_demo.json");
    return replaceEnvVariableConfig(config,envMap);
}

module.exports = {
    getFromEnv: replaceEnvVariableConfig,
    server: serverConfig,
    idp: idpConfig,
    idpDemo: idpDemoConfig
}