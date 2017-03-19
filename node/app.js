/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request'),
    mongoose = require('mongoose'),
    async = require('async');

var db_connect = require('./server/db.js');
var flow = require('./server/system.js');
var M = require('./server/button.js');
var R = require('./server/received.js');
var constants = require('./server/constant.js');
var menuSchema = mongoose.Schema({
    type: String,
    itemName: String,
    cate: String,
    price: String
});

var Model = mongoose.model('menu', menuSchema, 'menu');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ? 
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and 
// assets located at this address. 
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook 
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});



/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page. 
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
var session;
var sessions = {};

function findOrCreateSession (fbid){
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
        sessions[sessionId].menu = {};
        sessions[sessionId].context.phone_number = "";
        sessions[sessionId].context.shop = "";
        sessions[sessionId].context.privacy = "";
        sessions[sessionId].auth_key = "";
    }
    return sessionId;
}
function reset()
{
    session.context.state = "-1";
    session.context.nMenu = 0;
    session.menu = {};
    session.context.price = 0;
    session.context.phone_number = "";
    session.context.shop = "";
    session.context.privacy = "0";  //개인정보 수집동의여부, 동의했을 시 1
    session.context.auth_key = "";  //번호인증키
    session.context.order_number = "";  //주문번호
}

var list_length;

app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
          const sessionId = findOrCreateSession(messagingEvent.sender.id);
          session = sessions[sessionId];

          if(messagingEvent.message || messagingEvent.postback)
          {
              receivedChat(messagingEvent);
          }else{
              if (messagingEvent.optin) {
                  R.receivedAuthentication(messagingEvent);
                  console.log("messageingEvent.optin");
              } else if (messagingEvent.delivery) {
                  R.receivedDeliveryConfirmation(messagingEvent);
                  console.log("messageingEvent.delivery");
              } else if (messagingEvent.read) {
                  R.receivedMessageRead(messagingEvent);
                  console.log("messageingEvent.read");
              } else if (messagingEvent.account_linking) {
                  R.receivedAccountLink(messagingEvent);
                  console.log("messageingEvent.account_linking");
              } else {
                  console.log("Webhook received unknown messagingEvent: ", messagingEvent);
              }
          }
      });
    });
    res.sendStatus(200);
  }
});

app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will 
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an 
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

function receivedChat(event){
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    var postback = event.postback;
    var senderID = event.sender.id;
    var order_number;
    if(message) {
        var messageText = message.text;
        console.log("Received message for user ID: %d, session: %d and page %d at %d with message:",senderID, session.fbid, recipientID, timeOfMessage);
        console.log(JSON.stringify(message));

        var isEcho = message.is_echo;
        var messageId = message.mid;
        var appId = message.app_id;
        var metadata = message.metadata;

        // You may get a text or attachment but not both
        var messageText = message.text;
        var messageAttachments = message.attachments;
        var quickReply = message.quick_reply;

        if (isEcho) {
            // Just logging message echoes to console
            console.log("Received echo for message %s and app %d with metadata %s",
                messageId, appId, metadata);
            return;
        } else if (quickReply) {
            var quickReplyPayload = quickReply.payload;
            console.log("Quick reply for message %s with payload %s",
                messageId, quickReplyPayload);

            M.sendTextMessage(session.fbid, "Quick reply tapped");
            return;
        }

        if(message.attachment) {
            console.log("Received attachment!");
            M.sendTextMessage(session.fbid, "텍스트로 보내주세요");
        }
    }
    else if(postback) {
        var payload = event.postback.payload;
        console.log("Received postback for user ID: %d, session: %d and page %d with payload '%s' at %d", senderID, session.fbid, recipientID, payload, timeOfMessage);
        session.context.state = payload;
        messageText = "true";
    }
    else console.log("receivedchat error");

    if (messageText)
    {
        if(messageText == '메뉴주문'){reset(); session.context.state = 'menu_1';session.context.shop = 'aaa매장'; }
        if(messageText == '이미지카드'){reset(); session.context.state = 'imagecard';}
        if(messageText == '영수증'){reset(); session.context.state = 'receipt';}
        if (session.context.state == "-1" || flow.start(messageText))           //시작단계
        {
            session.context.state = 'start';
        }else if(session.context.state == 'order_number')
        {
         session.context.flag = "order_confirm";
            session.context.state = "privacy";
        }else if(session.context.state == 'order_method_2')     //배달인지 포장인지 구별
        {
            if(messageText.includes("배달") || messageText.includes("1"))
            {
                session.context.state = "delivery";
                session.context.method = 'delivery';
            }else{
                session.context.state = "wrap_1";
                session.context.method = 'wrap';
            }
        }else if(session.context.state == 'address_5')      //주소 입력
        {
            if(flow.confirm(messageText) || messageText.includes("1"))
            {
                var tmp = flow.selectShop(session.context.address);
                if(tmp != false)       //배달 가능 매장이 있을 때
                {
                    session.context.shop = tmp;
                    session.context.state = 'menu_1';

                }else{                                        //배달 가능 매장이 없을 때
                    session.context.state = 'research_address_1';
                }
            }else{        //입력한 주소가 틀렸을 때
                session.context.state = 'delivery';
            }
        }else if(session.context.state == 'menu_4')     //메뉴 선택 시
        {
            if(messageText.includes('1') || messageText.includes('예'))
            {
                session.context.state = 'bill';
            }else{
                session.context.state = 'menu_1';
            }
        }

        switch (session.context.state) {
            case 'start':
                M.sendStartMessage(session.fbid);
                break;

            case 'order_number':        //시작 버튼에서 주문확인 선택
                M.sendTextMessage(session.fbid, "주문 번호를 입력해 주십시오.");
                session.context.state = 'order_confirm';
                break;

            case 'order_confirm':
                session.context.order_number = messageText;
                var comment;

                flow.order_confirm(session.context.order_number, session.context.phone_number, function(err, result){
                    if(result == false) {
                        comment = "일치하는 주문 내역이 없습니다.";
                    }else{
                        comment = result;
                    }
                    M.sendTextMessage(session.fbid, comment);
                });

                session.context.state = "-1";
                break;

            case 'help_1':                  //시작 버튼에서 도움말 선택
                M.sendTextMessage(session.fbid, "\tQ & A\n1. 주소 입력은 어떻게 하나요?\n2. 피자헛 멤버십은 어떻게 적립하나요?");
                session.context.state = 'help_2';
                break;

            case 'help_2':
                if(messageText.includes("1"))
                {
                    M.sendTextMessage(session.fbid, "주소 입력은 잘 하시면 됩니다.");
                    reset();
                }else{
                    M.sendTextMessage(session.fbid, "피자헛 멤버십은 잘 적립하시면 됩니다.");
                    reset();
                }
                break;

            case 'privacy':       //시작버튼에서 주문하기 선택
                M.sendTextMessage(session.fbid, "고객님의 개인정보 수집 및 이용에 동의 하시겠습니까?\n1. 예\n2. 아니요(주문 취소)");
                session.context.state = 'phone_number';
                break;

            case 'phone_number':
                if(flow.confirm(messageText) || messageText.includes("1") || session.context.privaty == "1")
                {
                    session.context.privacy = "1";
                    M.sendTextMessage(session.fbid, "정확한 주문을 위해 휴대폰 번호를 입력해 주세요.");
                    session.context.state = 'phone_number_confirm_1';
                }else{
                    session.context.privacy = "0";
                    session.context.state = "0";
                }
                break;

            case 'phone_number_confirm_1':
                M.sendTextMessage(session.fbid, "휴대폰 번호가 " + messageText + "가 맞습니까?\n1. 예\n2. 아니요");
                session.context.phone_number = messageText;
                session.context.state = 'identify';
                break;

            case 'identify':
                if(flow.confirm(messageText) || messageText.includes("1"))
                {
                    var phone = session.context.phone_number.replace(" ", "");
                    phone = phone.replace("-","");
                    session.context.phone_number = phone;

                    if(session.context.flag == "order_confirm")     //주문확인 일 때
                    {
                        M.sendTextMessage(session.fbid, "주문 번호를 입력해 주십시오.");
                        session.context.state = 'order_confirm';
                    }else {                                 //주문 하기 일때

                        flow.identify(phone, function (err, result) {
                            var output = JSON.parse(result);
                            if (result == false) {
                                M.sendTextMessage(session.fbid, "잘못된 번호 입니다. 휴대폰 번호를 다시 입력해주세요.\n" +
                                    "처음으로 가시려면 '처음' 이라고 입력해주세요.");
                                ession.context.state = 'phone_number_confirm_1';
                            } else {
                                M.sendTextMessage(session.fbid, "휴대폰번호로 발송된 인증번호를 입력해주세요. 입력하신 번호는"
                                    + session.context.phone_number + "입니다.");
                                session.context.auth_key = output.AUTH_KEY;

                                session.context.state = "order_method_1";

                            }
                        });
                    }
                }else{
                    M.sendTextMessage(session.fbid, "정확한 주문을 위해 휴대폰 번호를 입력해 주세요.");
                    session.context.state = 'phone_number_confirm_1';
                }
                break;

            case 'order_method_1':

                flow.verification(session.context.phone_number, session.context.auth_key, messageText, function(err, result)
                {
                    if(result == true)
                    {
                            M.sendTextMessage(session.fbid, "주문 방법을 선택해주세요.\n1. 배달 주문\n2. 포장 주문");
                            session.context.state = 'order_method_2';

                    }else{
                        M.sendTextMessage(session.fbid, "잘 못 입력하셨습니다. 정확한 인증번호를 입력해주세요..");
                        session.context.state = 'order_method_1';
                    }
                });
                break;

            case 'delivery':
                M.sendTextMessage(session.fbid, "배달 받으실 주소를 입력해 주세요 (00시 00구 00동/로)");
                session.context.state = 'address_1';
                break;

            case 'address_1':
                session.context.address = messageText;
                M.sendTextMessage(session.fbid, "상세 주소를 입력해주세요 (00아파트, 00-000)");
                session.context.state = 'address_2'
                break;

            case 'address_2':
                var address;
                session.context.address = session.context.address + " " + messageText;
                address = flow.selectAddress(session.context.address);
                M.sendTextMessage(session.fbid, address + "\n목록에서 배달 받으실 주소 번호를 입력해 주십시오.");
                session.context.state = 'address_3';
                break;

            case 'address_3':
                if(messageText.includes("1"))
                {
                    session.context.address = session.context.address;
                }else {
                    session.context.address = session.context.address;
                }
                M.sendTextMessage(session.fbid, "나머지 주소를 입력해 주십시오.(0동 0호, 0층)");
                session.context.state = 'address_4';
                break;

            case 'address_4':
                session.context.address = session.context.address + " " + messageText;
                M.sendTextMessage(session.fbid, "배달 받으실 주소가 " + session.context.address + " 이 맞습니까?\n1. 예\n2. 아니오");
                session.context.state = 'address_5';
                break;

            case 'research_address_1':
                M.sendTextMessage(session.fbid, "배달 가능 매장이 존재하지 않습니다. 주소 검색을 다시 하시겠습니까?");
                session.context.state = 'research_address_2';
                break;

            case 'research_address_2':
                if(flow.confirm(messageText) || messageText.includes("1"))     //배달가능 주소 재 검색
                {
                    session.context.state = 'delivery';
                }else{        //배달 가능한 곳이 없어서 주문 포기
                    session.context.state = '0';
                }
                break;

            case 'menu_1':
                M.sendTextMessage(session.fbid, "주문하시고자 하는 제품군을 선택해 주십시오.");

                flow.getDoughList(function(err, result){
                    var output = JSON.parse(result);
                    var MenuList="";
                    list_length = output["LIST"].length + 1;

                    for(var i = 0; i < output["LIST"].length; i++)
                    {
                        MenuList += output["LIST"][i]["DISPLAY_SEQ"] + ". " + output["LIST"][i]["DOUGH_DESC"] + "\n";

                    }
                    M.sendTextMessage(session.fbid, MenuList + "100. 종료\n목록에서 번호를 입력해 주십시오.");
                });
                session.context.state = 'menu_2';

                break;

            case 'menu_2':
                if(messageText.includes('100') || messageText.includes('종료'))
                {
                    session.context.state = 'bill';
                }else {
                    var selectedNumber = Number(messageText);
                    console.log(selectedNumber+"selectednumber!!!");
                    if(isNaN(selectedNumber)){
                        M.sendTextMessage(session.fbid, "숫자만 입력해주세요");          //숫자가 아닌 다른 값 입력
                        session.context.state = 'menu_1';
                    }else {
                        console.log(list_length+"length!!")
                        if((selectedNumber < list_length) && (selectedNumber > 0) || selectedNumber == 100) {
                            M.sendGenericMessage(session.fbid);
                            session.context.state = 'menu_1';
                        }else{
                            M.sendTextMessage(session.fbid, "유효한 숫자만 입력해주세요");          //list 범위 밖의 숫자 입력
                            session.context.state = 'menu_2';
                        }
                    }
                }
                break;

            case 'pizza':
                session.context.state = 'menu_3';
                M.sendTextMessage(session.fbid, "수량을 입력해주세요.");
                break;

            case 'menu_3':
                //var menuList = JSON.parse(session.context.menuList);
                var option = Number(messageText);
                var list = "";

                if(isNaN(option))
                {
                    M.sendTextMessage(session.fbid, "숫자만 사용해주세요");
                    session.context.state = 'menu_1';
                }else{
                    var list = "맛있는피자";
                    M.sendTextMessage(session.fbid, session.context.shop + "에 " + list + "제품을 배달 목록에 추가 하였습니다. 제품 선택이 완료되었나요?\n1. 예\n2. 아니오. 추가 주문이 있습니다.");
                    session.context.state = 'menu_4';
                }
                break;

            case 'bill':
                /*
                 var content = "";
                 var total;
                 for(var i = 0; i < session.context.nMenu; i++)
                 {
                 content += (i+1) + ". " + session.menu[i] + "\n";
                 }*/
                var content = "맛있는피자";
                M.sendTextMessage(session.fbid, "주문이 완료되었습니다.\n" + content + '금액:' + " "/*session.context.price*/ + "28900 원");

                if(flow.checkMembership())
                {
                    M.sendTextMessage(session.fbid, "멤버십 적립/사용이 가능합니다.(사용은 2,000점 부터 가능합니다.)\n1. 적립(500점)\n2. 사용(2500점)\n3. 사용안함");
                    session.context.state = 'membership';
                }else {

                    if(session.context.method == 'wrap')
                    {
                        M.sendTextMessage(session.fbid, "[포장주문번호: 12345678]\n포장주문이 접수되었습니다. 30분 뒤 찾아가세요.");
                        M.sendTextMessage(session.fbid, constants.thank);
                        session.context.state = '-1';

                    }else {
                        //M.sendTextMessage(session.fbid, flow.order_now());
                        M.sendReceiptMessage(session.fbid);
                        M.sendTextMessage(session.fbid, constants.thank);
                        session.context.state = '-1';
                    }
                }
                break;

            case 'membership':
                if(messageText.includes('1') || messageText.includes('2'))
                {
                    M.sendTextMessage(session.fbid, "피자헛 멤버십카드 뒷 4자리를 입력해 주세요.\nXXXX-XXXX-XXXX-OOOO");
                    session.context.state = 'order_now';
                }
                else {
                    //M.sendTextMessage(session.fbid, flow.order_now());
                    M.sendReceiptMessage(session.fbid);
                    M.sendTextMessage(session.fbid, constants.thank);
                    session.context.state = '-1';
                }
                break;

            case 'order_now':
                if(session.context.method == 'wrap')
                {
                    M.sendTextMessage(session.fbid, "[포장주문번호: 12345678]\n포장주문이 접수되었습니다. 30분 뒤 찾아가세요.");
                    M.sendTextMessage(session.fbid, constants.thank);
                    session.context.state = '-1';

                }else {
                    //M.sendTextMessage(session.fbid, flow.order_now());
                    M.sendReceiptMessage(session.fbid);
                    M.sendTextMessage(session.fbid, constants.thank);
                    session.context.state = '-1';
                }
                break;

            case '0':
                M.sendTextMessage(session.fbid, constants.thank);
                reset();
                break;

            case '-1':
                reset();
                break;

            case 'wrap_1': M.sendTextMessage(session.fbid, "제품 찾으실 주소를 입력해 주세요.(00시 00구 00동/로)");
                session.context.state = 'wrap_2';
                break;

            case 'wrap_2':
                M.sendTextMessage(session.fbid, "인근매장을 선택해주세요.\n" + flow.searchShop(messageText));
                session.context.shop = flow.selectShop(session.context.address);
                session.context.state = 'menu_1';
                break;

            case 'imagecard':
                console.log("image card");
                M.sendGenericMessage(session.fbid);
                break;

            case 'receipt':
                M.sendReceiptMessage(session.fbid);
                break;

            default:
                M.sendTextMessage(session.fbid, constants.thank);
        }
    }

}

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
var server = https.createServer(app).listen(8888, function(){
	console.log("https 8888");
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

