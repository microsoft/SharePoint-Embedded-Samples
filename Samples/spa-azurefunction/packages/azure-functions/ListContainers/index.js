const msal = require('@azure/msal-node');
const jwt = require('jsonwebtoken')
const jwksClient = require('jwks-rsa');
require('isomorphic-fetch'); // required for graph library and SharePoint calls
const Graph = require('@microsoft/microsoft-graph-client');
const { getGraphToken } = require('../utils/auth.js');

const DISCOVERY_KEYS_ENDPOINT = process.env["DISCOVERY_KEYS_ENDPOINT"];
const config = {
    auth: {
        clientId: process.env["APP_CLIENT_ID"],
        authority: process.env["APP_AUTHORITY"],
        audience: process.env["APP_AUDIENCE"],
        clientSecret: process.env["APP_CLIENT_SECRET"]
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        }
    }
};
const cca = new msal.ConfidentialClientApplication(config);

const isJwtValid = (token) => {
    if (!token) {
        return false;
    }
    const validationOptions = {
        algorithms: ['RS256'],
        audience: config.auth.audience, // v2.0 token
        issuer: config.auth.issuer // v2.0 token
        // Also verify JWT has the Container.Manage scope 
    }
    jwt.verify(token, getSigningKeys, validationOptions, (err, payload) => {
        if (err) {
            console.log(err);
            return false;
        }
        return true;
    });
}

const getSigningKeys = (header, callback) => {
    var client = jwksClient({
        jwksUri: DISCOVERY_KEYS_ENDPOINT
    });

    client.getSigningKey(header.kid, function (err, key) {
        var signingKey = key.publicKey || key.rsaPublicKey;
        console.log('Signing key: ' + signingKey);
        callback(null, signingKey);
    });
}

module.exports = async function (context, req) {
    if (!req.headers.authorization) {
        context.res = {
            status: 401,
            body: 'No access token provided'
        };
        return;
    }
    const [bearer, token] = req.headers.authorization.split(' ');
    /*
    if (!isJwtValid(token)) {
        context.res = {
            status: 403,
            body: 'Provided access token is invalid'
        };
        return;
    }
    */

    // Get Graph Token
    const [graphSuccess, graphTokenResponse] = await getGraphToken(cca, token);
    if (!graphSuccess) {
        context.res = graphTokenResponse
        return;
    }

    const authProvider = (callback) => {
        callback(null, graphTokenResponse);
    };

    let options = {
        authProvider,
        defaultVersion: 'beta'
    }
    
    try {
        const graph = Graph.Client.init(options);
        res = await graph.api(`storage/fileStorage/containers?$filter=containerTypeId eq ${process.env["APP_CONTAINER_TYPE_ID"]}`).get();
        context.res = {
            body: res
        };
        return;
    }
    catch (error) {
        context.res = {
            status: 500,
            body: 'Failed to list containers: ' + error
        };
        return;
    }
}