'use strict';

const  config = require('config'),
    request = require('request');

exports.sendStartMessage = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "맛있는 피자는 작은 차이로 부터! 피자헛 챗봇 입니다. 주문하시겠습니까?",
                    buttons:[{
                        type: "postback",
                        payload: "order_number",
                        title: "주문 확인"
                    }, {
                        type: "postback",
                        payload: "order",
                        title: "주문 하기"

                    }, {
                        type: "postback",
                        title: "도움말",
                        payload: "help"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('pageAccessToken');

/*
 * Send an image using the Send API.
 *
 */
exports.sendImageMessage = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: SERVER_URL + "/assets/rift.png"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
exports.sendGifMessage = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "image",
                payload: {
                    url: SERVER_URL + "/assets/instagram_logo.gif"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
exports.sendAudioMessage = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "audio",
                payload: {
                    url: SERVER_URL + "/assets/sample.mp3"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 *
 */
exports.sendVideoMessage = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "video",
                payload: {
                    url: SERVER_URL + "/assets/allofus480.mov"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a file using the Send API.
 *
 */
exports.sendFileMessage = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "file",
                payload: {
                    url: SERVER_URL + "/assets/test.txt"
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a text message using the Send API.
 *
 */
exports.sendTextMessage = function(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText,
            metadata: "DEVELOPER_DEFINED_METADATA"
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a button message using the Send API.
 *
 */

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
exports.sendGenericMessage = function(recipientId) {

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    image_aspect_ratio: "square",
                    elements: [{
                        title: "맛있는 피자",
                        subtitle: "새우랑 브로콜리랑 파인애플이랑 고구마 들어감",
                        //item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_GB_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }],
                    }, {
                        title: "세련되어 보이는 피자",
                        subtitle: "이것저것 좋아보이는 거 넣었는데 맛있는지는 잘 모르겠네",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_BB_MS_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_P_SS_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원3",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_P_CH_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_DR_GS_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_CK_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_DB_2.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_RT_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_PG_2.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }, {
                        title: "touch",
                        subtitle: "Your Hands, Now in VR",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_OA_2.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza",
                        }]
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a receipt message using the Send API.
 *
 */
exports.sendReceiptMessage = function(recipientId) {
    // Generate a random receipt ID as the API requires a unique ID
    var receiptId = "order" + Math.floor(Math.random()*1000);

    var messageData = {
        recipient: {
            id: recipientId
        },
        message:{
            attachment: {
                type: "template",
                payload: {
                    template_type: "receipt",
                    recipient_name: "Peter Chang",
                    order_number: receiptId,
                    currency: "USD",
                    payment_method: "Visa 1234",
                    timestamp: "1428444852",
                    elements: [{
                        title: "Oculus Rift",
                        subtitle: "Includes: headset, sensor, remote",
                        quantity: 1,
                        price: 599.00,
                        currency: "USD",
                        image_url: SERVER_URL + "/assets/riftsq.png"
                    }, {
                        title: "Samsung Gear VR",
                        subtitle: "Frost White",
                        quantity: 1,
                        price: 99.99,
                        currency: "USD",
                        image_url: SERVER_URL + "/assets/gearvrsq.png"
                    }],
                    address: {
                        street_1: "1 Hacker Way",
                        street_2: "",
                        city: "Menlo Park",
                        postal_code: "94025",
                        state: "CA",
                        country: "US"
                    },
                    summary: {
                        subtotal: 698.99,
                        shipping_cost: 20.00,
                        total_tax: 57.67,
                        total_cost: 626.66
                    },
                    adjustments: [{
                        name: "New Customer Discount",
                        amount: -50
                    }, {
                        name: "$100 Off Coupon",
                        amount: -100
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
exports.sendQuickReply = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "What's your favorite movie genre?",
            quick_replies: [
                {
                    "content_type":"text",
                    "title":"Action",
                    "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
                },
                {
                    "content_type":"text",
                    "title":"Comedy",
                    "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
                },
                {
                    "content_type":"text",
                    "title":"Drama",
                    "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
                }
            ]
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
exports.sendReadReceipt = function(recipientId) {
    console.log("Sending a read receipt to mark message as seen");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "mark_seen"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
exports.sendTypingOn = function(recipientId) {
    console.log("Turning typing indicator on");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_on"
    };

    callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
exports.sendTypingOff = function(recipientId) {
    console.log("Turning typing indicator off");

    var messageData = {
        recipient: {
            id: recipientId
        },
        sender_action: "typing_off"
    };

    callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
exports.sendAccountLinking = function(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "Welcome. Link your account.",
                    buttons:[{
                        type: "account_link",
                        url: SERVER_URL + "/authorize"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            if (messageId) {
                console.log("Successfully sent message with id %s to recipient %s",
                    messageId, recipientId);
            } else {
                console.log("Successfully called Send API for recipient %s",
                    recipientId);
            }
        } else {
            console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        }
    });
}