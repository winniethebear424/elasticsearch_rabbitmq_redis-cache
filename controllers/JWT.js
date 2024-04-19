const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '100906465856-pmch78m500858ea755967vq1mt5v2shi.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

module.exports = {
    CLIENT_ID,
    client
}