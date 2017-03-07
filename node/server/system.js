'use strict';

var sessions = {};

exports.findOrCreateSession = function(fbid)
{
    var sessionId;
    // Let's see if we already have a session for the user fbid
    Object.keys(sessions).forEach(k => {
        if (sessions[k].fbid === fbid) {
        // Yep, got it!
        sessionId = k;
    }
});
    if (!sessionId) {
        // No session found for user fbid, let's create a new one
        sessionId = new Date().toISOString();
        sessions[sessionId] = {fbid: fbid, context: {}, menu: {}};
        sessions[sessionId].context.state = '-1';
        sessions[sessionId].context.nMenu = 0;
        sessions[sessionId].context.price = 0;
    }
    return sessionId;
}