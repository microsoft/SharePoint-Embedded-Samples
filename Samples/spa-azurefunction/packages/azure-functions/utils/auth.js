const msal = require('@azure/msal-node');
const jwt = require('jsonwebtoken')
const jwksClient = require('jwks-rsa');
require('isomorphic-fetch'); // required for graph library and sharePoint calls
const Graph = require('@microsoft/microsoft-graph-client');

async function getGraphToken(cca, token) {
    try {
        const graphTokenRequest = {
            oboAssertion: token,
            scopes: ["Sites.Read.All", "FileStorageContainer.Selected"]
        };
        const graphToken = (await cca.acquireTokenOnBehalfOf(graphTokenRequest)).accessToken;
        return [true, graphToken];
    } catch (error) {
        const errorResult = {
            status: 500,
            body: JSON.stringify({
                message: 'Unable to generate graph obo token: ' + error.message,
                providedToken: token
            })
        };
        return [false, errorResult];
    }
}

module.exports = { getGraphToken };