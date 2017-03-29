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
                    text: "맛있는 피자는 작은 차이로 부터! 피자헛 챗봇 입니다. 아래 버튼 중 하나를 선택해주세요.",
                    buttons:[{
                        type: "postback",
                        payload: "privacy",
                        title: "주문 하기"

                    },{
                        type: "postback",
                        payload: "order_number",
                        title: "주문 확인"
                    }, {
                        type: "postback",
                        title: "도움말",
                        payload: "help_1"
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
                        title: "리치골드 - 프렌치 어니언 쉬림프",
                        subtitle: "그릴에 구운 통새우와 바삭한 양파가 올려진 피자",
                        //item_url: "https://www.oculus.com/en-us/rift/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_GB_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza"
                        }],
                    }, {
                        title: "리치골드 - 프렌치 블루치즈 스테이크",
                        subtitle: "부드러운 블래게퍼 스테이크(소고기)와 진한 블루치즈소스가 어우러진 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_BB_MS_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 통베이컨 스테이크",
                        subtitle: "베이컨 스테이크와 통마늘이 올려진 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_P_SS_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 치즈킹",
                        subtitle: "소고기와 크림치즈가 듬뿍 올려진 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_P_CH_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 토핑킹",
                        subtitle: "7가지 토핑이 통으로 들어간 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_DR_GS_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 직화불고기",
                        subtitle: "정통 숯불고기(소고기)를 즐길 수 있는 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_CK_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 바비큐치킨",
                        subtitle: "부드러운 바비큐치킨을 즐길 수 있는 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_DB_2.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 34900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 28900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 더블바비큐",
                        subtitle: "불고기와 바비큐치킨이 반반씩 들어간 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_RT_1.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 32900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 26900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 슈퍼슈프림",
                        subtitle: "고기, 야채 토핑이 골고루 들어간 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_PG_2.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 32900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 26900 원",
                            payload: "pizza"
                        }]
                    }, {
                        title: "리치골드 - 베이컨포테이토",
                        subtitle: "베이컨과 감자를 올린 담백한 피자",
                        //item_url: "https://www.oculus.com/en-us/touch/",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_OA_2.jpg",
                        buttons: [{
                            type: "postback",
                            title: "Large 32900 원",
                            payload: "pizza"
                        }, {
                            type: "postback",
                            title: "Medium 26900 원",
                            payload: "pizza"
                        }]
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

exports.sendMenuMessage = function(recipientId, contents) {

    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    image_aspect_ratio: "horizontal",
                    elements: contents
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
                    recipient_name: "설현 님",
                    merchant_name: "피자헛",
                    order_number: receiptId,
                    currency: "KRW",
                    payment_method: "현장결제",
                    timestamp: "1428444912",
                    elements: [{
                        title: "리치골드-직화불고기 Large",
                        subtitle: "정동 숯불고기(소고기)를 즐길 수 있는 피자",
                        quantity: 1,
                        price: 28900,
                        currency: "KRW",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_PG_2.jpg"
                    }, {
                        title: "더맛있는피자-포테이토크로켓 Medium",
                        subtitle: "감자와 베이컨, 마요네즈를 올린 피자",
                        quantity: 1,
                        price: 14900,
                        currency: "KRW",
                        image_url: "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_OA_2.jpg"
                    }],
                    address: {
                        street_1: "서울대학교",
                        street_2: "138동",
                        city: "관악구",
                        postal_code: "94025",
                        state: "서울시",
                        country: "KR"
                    },
                    summary: {
                        subtotal:63800,
                        shipping_cost: 0,
                        //total_tax: 6380,
                        total_cost: 60000
                    },
                    adjustments: [{
                        name: "신규 고객 할인",
                        amount: -800
                    }, {
                        name: "페이스북 주문 Coupon",
                        amount: -3000
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

exports.sendReceipt = function(recipientId, orderID, custName, order_contents, address_contents, total, sale) {
    // Generate a random receipt ID as the API requires a unique ID
    //var receiptId = "order" + Math.floor(Math.random()*1000);

    var messageData = {
        recipient: {
            id: recipientId
        },
        message:{
            attachment: {
                type: "template",
                payload: {
                    template_type: "receipt",
                    recipient_name: custName,
                    merchant_name: "피자헛",
                    order_number: orderID,
                    currency: "KRW",
                    payment_method: "현장결제",
                    //timestamp: timestamp,
                    elements: order_contents,
                    address: address_contents,
                    summary: total,
                    adjustments: sale
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