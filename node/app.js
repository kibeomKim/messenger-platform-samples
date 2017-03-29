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
        sessions[sessionId] = {fbid: fbid, context: {}};
        sessions[sessionId].context.state = '-1';
        sessions[sessionId].context.nMenu = 0;
        sessions[sessionId].context.price = 0;
        sessions[sessionId].base = {};
        sessions[sessionId].ClassID = {};
        sessions[sessionId].SizeID = {};
        sessions[sessionId].BaseID = {};
        sessions[sessionId].ProductID = {};
        sessions[sessionId].qty = {};
        sessions[sessionId].selectedMenu = {};      //선택한 메뉴, 결제 전 출력용
        sessions[sessionId].selectedMenuPrice = {};
        sessions[sessionId].context.phone_number = "";
        sessions[sessionId].context.shop = "";
        sessions[sessionId].context.privacy = "";
        sessions[sessionId].auth_key = "";
        sessions[sessionId].context.discountValue = ""; //할인금액

    }
    return sessionId;
}
function reset(sess) {
    sess.context.state = "-1";
    sess.context.nMenu = 0;
    sess.base = {};
    sess.ClassID = {};
    sess.SizeID = {};
    sess.BaseID = {};
    sess.ProductID = {};
    sess.qty = {};
    sess.selectedMenu = {};      //선택한 메뉴, 결제 전 출력용
    sess.selectedMenuPrice = {};
    sess.context.price = 0;
    sess.context.phone_number = "";
    sess.context.privacy = "0";  //개인정보 수집동의여부, 동의했을 시 1
    sess.context.auth_key = "";  //번호인증키
    sess.context.nCoupon = 0;   //쿠폰 갯수
    sess.couponInfo = {};        //유저의 모든 쿠폰정보
    sess.context.couponID = "";
    sess.context.couponValue = "";
    sess.addrList = {};      //주소 목록
    sess.context.shopName = "";  //매장명
    sess.context.shopID = "";    //매장ID
    sess.context.list_length = "";   //메뉴 리스트
    sess.context.positionX = "";     //매장 x, y좌표
    sess.context.positionY = "";
    sess.context.usable_pnt = "";    //가용포인트
    sess.context.fmcUse = "";   //1:적립, 2:사용
    sess.context.fmcAmount = "";   //사용포인트, 적립일시 0
    sess.context.custName = "";      //멤버십 고객 명
    sess.context.cardNo = "";    //멤버십 카드no
    sess.context.orderType = "";     //2:배달, 3:포장
    sess.context.timestamp = "";     //타임스탬프
    sess.context.discountValue = ""; //할인금액
    sess.context.flag = "";
    sess.context.couponName = "";        //쿠폰명
    sess.context.order_number = "";      //주문번호
    sess.context.address = "";   //주소

}

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
var NumOrder = 0;

function receivedChat(event){
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    var postback = event.postback;
    var senderID = event.sender.id.toString();

    const sessionId = findOrCreateSession(senderID);
    var session = sessions[sessionId];

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
    }else if(postback) {
        var payload = event.postback.payload;
        console.log("Received postback for user ID: %d, session: %d and page %d with payload '%s' at %d", senderID, session.fbid, recipientID, payload, timeOfMessage);
        session.context.state = payload;
        messageText = "true";
    }else console.log("receivedchat error");

    console.log("state: " + session.context.state);
    if (messageText)
    {
        if(messageText == '메뉴주문'){reset(session); session.context.state = 'menu_1';session.context.phone_number = '01092103621'; session.context.shopID = '8817'; session.context.shopName = "신림2호점"; session.context.orderType = '2'; session.context.address = '서울시 관악구 관악로1 138동';}
        if(messageText == '영수증'){reset(session); session.context.state = 'receipt'; session.context.phone_number = '01092103621'; session.context.shopID = '8817'; session.context.shopName = "신림2호점"; session.context.orderType = '2';
            session.context.couponID = "couponID"; session.context.order_number = "FB00"; session.context.discountValue = '4470'; session.context.nMenu = 1; session.context.price = '14900'; session.context.address = '서울시 관악구 관악로1 138동'; session.context.custName = "김기범";
            session.qty=[1]; session.ClassID=['P']; session.SizeID = ['M']; session.BaseID = ['P']; session.ProductID = ['PP']; session.selectedMenu = ['팬 - 페퍼로니']; session.context.couponName = "배달할인"; session.context.couponValue = "30"; session.selectedMenuPrice = ['14900']; session.context.cardNo = ""; session.context.fmcUse = ""; session.context.fmcAmount = "";}
        if(messageText == '주소입력'){reset(session); session.context.state = 'delivery'; session.context.phone_number = '01092103621';}
        /*if(messageText == '주문하기'){reset(session); session.context.state = 'order_now'; session.context.phone_number = '01092103621'; session.context.shopID = '8817'; session.context.shopName = "신림2호점"; session.context.orderType = '2';
            session.context.couponID = "couponID"; session.context.discountValue = '2500'; session.context.nMenu = 1; session.context.price = '23900'; session.context.address = '서울시 관악구 관악로1 138동'; session.context.custName = "김기범";
        session.qty=[1]; session.ClassID=['P']; session.SizeID = ['M']; session.BaseID = ['P']; session.ProductID = ['PP']; session.context.cardNo = ""; session.context.fmcUse = ""; session.context.fmcAmount = ""; session.context.phone_number= "01000000000"}*/

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
                session.context.orderType = "2";    //배달
            }else{
                session.context.state = "wrap_1";
                session.context.orderType = "3";    //포장
            }
        }else if(session.context.state == 'address_5')      //주소 입력
        {
            if(flow.confirm(messageText) || messageText.includes("1"))
            {
                if(session.context.flag == 'Y')     //배달 가능 매장 있음
                {
                    M.sendTextMessage(session.fbid, session.context.shopName + " 으로 배달매장이 선택되었습니다.");
                    session.context.state = 'menu_1';
                }else{
                    console.log("주소가능매장여부=" + session.context.flag);
                    M.sendTextMessage(session.fbid, "죄송합니다. 현재 배달가능한 매장이 없습니다. 다시 검색하시겠습니까?");
                    session.context.state = 'research_address_2';
                }
            }else{        //입력한 주소가 틀렸을 때
                session.context.state = 'delivery';
            }
        }else if(session.context.state == 'menu_4')     //메뉴 선택 시
        {
            if(messageText.includes('1') || messageText.includes('예'))
            {
                session.context.state = 'coupon_1';
            }else{
                session.context.state = 'menu_1';
            }
        }else if(session.context.state.includes("MENUORDER"))
        {
            var code = session.context.state.substr(10);
            var price ;
            var nMenu = Number(session.context.nMenu);
            session.ClassID[nMenu] = code.substring(0, code.indexOf("/"));
            code = code.substr(code.indexOf("/")+1);
            session.SizeID[nMenu] = code.substring(0, code.indexOf("/"));
            code = code.substr(code.indexOf("/")+1);
            session.BaseID[nMenu] = code.substring(0, code.indexOf("/"));
            code = code.substr(code.indexOf("/")+1);
            session.ProductID[nMenu] = code.substring(0, code.indexOf("/"));
            code = code.substr(code.indexOf("/")+1);
            price = code.substring(0, code.indexOf("/"));
            session.selectedMenuPrice[nMenu] = Number(price);
            code = code.substr(code.indexOf("/")+1);
            session.selectedMenu[nMenu] = code.substring(0);

            session.context.state = "menu_order";
        }else if(session.context.state == "ChkMembership")
        {
            if(messageText.includes('1'))
            {
                M.sendTextMessage(session.fbid, "피자헛 멤버십카드 16 자리를 숫자만 입력해 주세요.");
                session.context.state = 'membership_0';
            }else {
                session.context.state = 'order_now';
            }
        }else if(session.context.state == 'wrap_3')
        {
            var selectedNumber = Number(messageText);
            if(isNaN(selectedNumber)){
                M.sendTextMessage(session.fbid, "숫자만 입력해주세요. 처음으로 가시려면 '처음'이라고 입력해주세요.");          //숫자가 아닌 다른 값 입력
                session.context.state = 'wrap_3';
            }else {
                if(selectedNumber <= 0 || selectedNumber > session.context.list_length+1)
                {
                    M.sendTextMessage(session.fbid, "유효한 숫자를 입력해주세요. 처음으로 가시려면 '처음'이라고 입력해주세요.");
                    session.context.state = 'wrap_3';
                }else{
                    if(selectedNumber == session.context.list_length+1){
                        session.context.state = 'wrap_1';
                    }else {
                        session.context.address = session.addrList[selectedNumber - 1].storeAddr;
                        session.context.shopName = session.addrList[selectedNumber - 1].storeName;
                        session.context.shopID = session.addrList[selectedNumber - 1].storeID;
                        session.context.state = 'menu_1';
                        M.sendTextMessage(session.fbid, "포장매장으로 " + session.context.shopName + "이 선택되었습니다.");
                    }
                }
            }
        }else if(session.context.state == 'coupon_2')
        {
            var selectedNumber = Number(messageText);
            if(isNaN(selectedNumber)){
                M.sendTextMessage(session.fbid, "숫자만 입력해주세요");          //숫자가 아닌 다른 값 입력
                session.context.state = 'coupon_2';
            }else {
                if(selectedNumber <= 0 || selectedNumber > session.couponInfo["LIST"].length)
                {
                    M.sendTextMessage(session.fbid, "유효한 숫자만 입력해주세요");          //list 범위 밖의 숫자 입력
                    session.context.state = 'coupon_2';
                }else{
                    session.context.couponID = session.couponInfo["LIST"][selectedNumber-1]["COUPON_ID"];
                    session.context.couponName = session.couponInfo["LIST"][selectedNumber-1]["COUPON_DESC"];
                    session.context.couponValue = Number(session.couponInfo["LIST"][selectedNumber-1]["COUPON_VALUE"]);
                    //session.context.discountValue = session.context.price * (session.context.couponValue/100);
                    session.context.state = 'bill';
                }
            }
        }else if(session.context.state == 'membership_11')
        {
            if(messageText == '1')      //적립
            {
                M.sendTextMessage(session.fbid, "멤버십 포인트가 적립되었습니다.");
                session.context.fmcUse = "1";   //1:적립, 2:사용
                session.context.fmcAmount = "0";
                session.context.state = 'order_now';

            }else if(messageText == '2')        //사용
            {
                session.context.state = 'membership_13';

            }else if(messageText == '3')        //사용안함
            {
                M.sendTextMessage(session.fbid, "멤버십 포인트가 적립/사용 되지 않았습니다.");
                session.context.fmcUse = "";   //1:적립, 2:사용
                session.context.fmcAmount = "";
                session.context.state = 'order_now';

            }else{
                M.sendTextMessage(session.fbid, "유효한 숫자만 써서 다시 입력해주세요.");
                session.context.state == 'membership_11';
            }
        }else if(session.context.state =='membership_12')
        {
            if(messageText == '1')      //적립
            {
                M.sendTextMessage(session.fbid, "멤버십 포인트가 적립되었습니다.");
                session.context.fmcUse = "1";   //1:적립, 2:사용
                session.context.fmcAmount = "0";
                session.context.state = 'order_now';

            }else if(messageText == '2')        //사용안함
            {
                M.sendTextMessage(session.fbid, "멤버십 포인트가 적립 되지 않았습니다.");
                session.context.fmcUse = "";   //1:적립, 2:사용
                session.context.fmcAmount = "";
                session.context.state = 'order_now';
            }else{
                session.context.state = 'membership_12';
            }
        }else if(session.context.state == 'membership_2')
        {
            var point = Number(session.context.usable_pnt);
            var inputPoint = Number(messageText);
            if(isNaN(inputPoint)){
                M.sendTextMessage(session.fbid, "숫자만 입력해주세요");          //숫자가 아닌 다른 값 입력
                session.context.state = 'membership_2';
            }else {
                if(inputPoint > point || inputPoint < 0)
                {
                    M.sendTextMessage(session.fbid, "사용가능한 포인트를 입력해주세요.");
                    session.context.state = 'membership_2';
                }else {
                    session.context.fmcUse = "2";   //1:적립, 2:사용
                    M.sendTextMessage(session.fbid, session.context.custName + " 님의 포인트  " + flow.numberWithCommas(inputPoint) + " 점이 차감됩니다.");
                    session.context.fmcAmount = inputPoint;
                    session.context.state = 'order_now';
                }
            }
        }else if(session.context.state == 'help_1-2')
        {
            if(messageText == '1')
            {
                session.context.state = 'help_2-1';
            }else if(messageText == '2')
            {
                session.context.state = 'help_2-2';

            }else if(messageText == '3')
            {
                session.context.state = 'help_2-3';

            }else if(messageText == '4')
            {
                session.context.state = 'help_2-4';

            }else{

            }
        }

        switch (session.context.state) {
            case 'start':
                reset(session);
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
                    if(result === false) {
                        comment = "일치하는 주문 내역이 없습니다.";
                    }else{
                        comment = result;
                    }
                    M.sendTextMessage(session.fbid, comment + "\n\n이용해주셔서 감사합니다.\n처음으로 가시려면 '처음'이라고 입력해주세요.");
                });

                session.context.state = "-1";
                break;

            case 'help_1':                  //시작 버튼에서 도움말 선택
                M.sendTextMessage(session.fbid, "\tQ & A\n1. 주문 안내\n2. 결제 안내\n3. 배달 지역\n4. 포인트 안내");
                session.context.state = 'help_1-2';
                break;

            case 'help_2-1':
                var question = "1. " + constants.help_order_Q_1 + "\n" + "2. " + constants.help_order_Q_2 + "\n" + "3. " + constants.help_order_Q_3 + "\n"
                    + "4. " + constants.help_order_Q_4 + "\n" + "5. " + constants.help_order_Q_5 + "\n" + "6. " + constants.help_order_Q_6 + "\n";

                M.sendTextMessage(session.fbid, question);
                session.context.state = 'help_3-1';
                break;
            case 'help_2-2':
                var question = "1. " + constants.help_payment_Q_1 + "\n" + "2. " + constants.help_payment_Q_2 + "\n";

                M.sendTextMessage(session.fbid, question);
                session.context.state = 'help_3-2';
                break;
            case 'help_2-3':
                var question = "1. " + constants.help_delivery_Q_1 + "\n" + "2. " + constants.help_delivery_Q_2 + "\n" + "3. " + constants.help_delivery_Q_3 + "\n"
                    + "4. " + constants.help_delivery_Q_4 + "\n";

                M.sendTextMessage(session.fbid, question);
                session.context.state = 'help_3-3';
                break;
            case 'help_2-4':
                var question = "1. " + constants.help_point_Q_1 + "\n" + "2. " + constants.help_point_Q_2 + "\n";

                M.sendTextMessage(session.fbid, question);
                session.context.state = 'help_3-4';
                break;

            case 'help_3-1':
                var answer = '';
                switch (messageText) {
                    case '1':
                        answer = constants.help_order_A_1;
                        break;
                    case '2':
                        answer = constants.help_order_A_2;
                        break;
                    case '3':
                        answer = constants.help_order_A_3;
                        break;
                    case '4':
                        answer = constants.help_order_A_4;
                        break;
                    case '5':
                        answer = constants.help_order_A_5
                        break;
                    case '6':
                        answer = constants.help_order_A_6;
                        break;
                    default:
                        answer  = "유효하지 않은 숫자를 입력하셨습니다.";
                        break;
                }
                session.context.state = '-1';
                M.sendTextMessage(session.fbid, answer + "\n이용해주셔서 감사합니다. 다른 도움말이나 주문을 원하시면 '시작'을 입력해주세요.");
                break;
            case 'help_3-2':
                var answer = '';
                switch (messageText) {
                    case '1':
                        answer  = constants.help_payment_A_1;
                        break;
                    case '2':
                        answer  = constants.help_payment_A_2;
                        break;
                    default:
                        answer  = "유효하지 않은 숫자를 입력하셨습니다.";
                        break;
                }
                session.context.state = '-1';
                M.sendTextMessage(session.fbid, answer + "\n이용해주셔서 감사합니다. 다른 도움말이나 주문을 원하시면 '시작'을 입력해주세요.");
                break;
            case 'help_3-3':
                var answer = '';
                switch (messageText) {
                case '1':
                    answer  = constants.help_delivery_A_1;
                    break;
                case '2':
                    answer  = constants.help_delivery_A_2;
                    break;
                case '3':
                    answer  = constants.help_delivery_A_3;
                    break;
                case '4':
                    answer  = constants.help_delivery_A_4;
                    break;
                default:
                    answer  = "유효하지 않은 숫자를 입력하셨습니다.";
                    break;
            }
                session.context.state = '-1';
                M.sendTextMessage(session.fbid, answer + "\n이용해주셔서 감사합니다. 다른 도움말이나 주문을 원하시면 '시작'을 입력해주세요.");
                break;
            case 'help_3-4':
                var answer = '';
                switch (messageText) {
                    case '1':
                        answer = constants.help_point_A_1;
                        break;
                    case '2':
                        answer  = constants.help_point_A_2;
                        break;
                    default:
                        answer  = "유효하지 않은 숫자를 입력하셨습니다.";
                        break;
                }
                session.context.state = '-1';
                M.sendTextMessage(session.fbid, answer + "\n이용해주셔서 감사합니다. 다른 도움말이나 주문을 원하시면 '시작'을 입력해주세요.");
                break;

            case 'privacy':       //시작버튼에서 주문하기 선택
                M.sendTextMessage(session.fbid, "고객님의 개인정보 수집 및 이용에 동의 하시겠습니까?\n1. 예\n2. 아니요(주문 취소)");
                session.context.state = 'phone_number';
                break;

            case 'phone_number':
                if(flow.confirm(messageText) || messageText.includes("1") || session.context.privaty == "1")
                {
                    session.context.privacy = "1";
                    M.sendTextMessage(session.fbid, "본인 확인을 위해 휴대폰 번호를 숫자만 입력해 주세요.");
                    session.context.state = 'phone_number_confirm_1';
                }else{
                    session.context.privacy = "0";
                    M.sendTextMessage(session.fbid, "이용해주셔서 감사합니다. 다시 주문을 원하시면 '시작'을 입력해주세요.");
                    session.context.state = "-1";
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
                            if (result === false) {
                                M.sendTextMessage(session.fbid, "잘못된 번호 입니다. 휴대폰 번호를 다시 입력해주세요.\n" +
                                    "처음으로 가시려면 '처음' 이라고 입력해주세요.");
                                session.context.state = 'phone_number_confirm_1';
                            } else {
                                M.sendTextMessage(session.fbid, "휴대폰으로 발송된 인증번호를 입력해주세요.");
                                session.context.auth_key = output.AUTH_KEY;

                                session.context.state = "order_method_1";

                            }
                        });
                    }
                }else{
                    M.sendTextMessage(session.fbid, "본인 확인을 위해 휴대폰 번호를 숫자만 입력해 주세요.");
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
                M.sendTextMessage(session.fbid, "배달 받으실 주소를 입력해 주세요 (00시 00구 00동/로 혹은 00도 00읍 00면 00리)");
                session.context.state = 'address_1';
                break;

            case 'address_1':
                session.context.address = messageText;
                M.sendTextMessage(session.fbid, "상세 주소를 입력해주세요.(00아파트 혹은 00-000번지)");
                session.context.state = 'address_1-1';
                break;

            case 'address_1-1':
                session.context.address += " " + messageText;
                flow.getAddress(session.context.address, function(err, result){
                    var output = JSON.parse(result.SEARCH_RESULT);
                    session.addrList = output;
                    if(output["addrListVO"] == "" || output === false){
                        M.sendTextMessage(session.fbid, "조회된 주소가 없습니다. \n배달 받으실 주소를 다시 입력해 주세요 (00시 00구 00동/로 혹은 00도 00읍 00면 00리)");
                        session.context.state = 'address_1';
                    }else {
                        if(output["addrListVO"].length > 10)
                        {
                            M.sendTextMessage(session.fbid, "조회된 주소가 너무 많습니다. 좀 더 상세 주소를 입력해주세요.\n배달 받으실 주소를 입력해 주세요 (00시 00구 00동/로 혹은 00도 00읍 00면 00리)");
                            session.context.state = 'address_1';

                        }else{
                            var addr = "";
                            for (var i = 0; i < output["addrListVO"].length; i++) {
                                addr += (Number(output["addrListVO"][i]["index"]) + 1) + ". " + output["addrListVO"][i]["addr"] + "\n";
                            }
                            addr += (output["addrListVO"].length + 1) + ". 다시 검색\n";
                            M.sendTextMessage(session.fbid, addr + "목록에서 배달 받으실 주소 번호를 입력해 주십시오.");
                        }
                    }
                });
                session.context.state = 'address_2';
                break;

            case 'address_2':
                var selectedNumber = Number(messageText);
                if(isNaN(selectedNumber)){
                    M.sendTextMessage(session.fbid, "숫자만 입력해주세요");          //숫자가 아닌 다른 값 입력
                    session.context.state = 'address_3';
                }else {
                    if((selectedNumber > 0) && selectedNumber <= session.addrList["addrListVO"].length + 1)
                    {
                        if(selectedNumber == session.addrList["addrListVO"].length + 1){        //다시 입력
                            M.sendTextMessage(session.fbid, "배달 받으실 주소를 입력해 주세요 (00시 00구 00동/로 혹은 00도 00읍 00면 00리)");
                            session.context.state = 'address_1';
                        }else{
                            session.context.address = session.addrList["addrListVO"][selectedNumber-1]["addr"];
                            session.context.positionX = session.addrList["addrListVO"][selectedNumber-1]["x"];
                            session.context.positionY = session.addrList["addrListVO"][selectedNumber-1]["y"];
                            M.sendTextMessage(session.fbid, "나머지 주소를 입력해 주십시오.(0동 0호, 0층)");
                            console.log(session.context.positionX + "XY" + session.context.positionY);
                            session.context.state = 'address_4';
                        }
                    }else{
                        M.sendTextMessage(session.fbid, "유효한 숫자만 입력해주세요");
                        session.context.state = 'address_2';
                    }
                }
                break;

            case 'address_3':
                session.context.address = session.context.address + " " + messageText;
                M.sendTextMessage(session.fbid, "상세 주소를 입력해주세요 (00아파트, 00-00번지)");
                break;

            case 'address_4':
                session.context.address = session.context.address + " " + messageText;
                M.sendTextMessage(session.fbid, "배달 받으실 주소가 " + session.context.address + " 이 맞습니까?\n1. 예\n2. 아니오");

                flow.selectShop(session.context.positionX, session.context.positionY, function(err, result){
                    console.log("selectShop output!:" + output);
                    if(result === false)
                     {
                         session.context.flag = 'N';        //'research_address_1';
                         console.log("주소가능매장N");

                     }else{
                        var output = JSON.parse(result.SEARCH_RESULT);
                         if( output[0].storeDelivery == 'N' || output[0].zoneDelivery == 'N' )
                         {
                             session.context.flag = 'N';        //'research_address_1';
                             console.log("주소가능매장N");
                         }else{
                             session.context.shopName = output[0].storeName;
                             session.context.shopID = output[0].storeID;
                             session.context.flag = 'Y';       //'menu_1';
                             console.log("주소가능매장Y");
                         }

                     }
                });
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

            case 'menu_1':      //제품군 출력

                flow.getDoughList(function(err, result){
                    var output = JSON.parse(result);
                    var MenuList = "";
                    session.context.list_length = output["LIST"].length;

                    for(var i = 0; i < output["LIST"].length; i++)
                    {
                        MenuList += output["LIST"][i]["DISPLAY_SEQ"] + ". " + output["LIST"][i]["DOUGH_DESC"] + "\n";
                        session.base[i] = output["LIST"][i]["BASE_ID"];
                    }
                    M.sendTextMessage(session.fbid, "주문하시고자 하는 제품군을 선택해 주십시오.\n" + MenuList + "100. 종료\n목록에서 번호를 입력해 주십시오.");
                    session.context.state = 'menu_2';
                });
                session.context.state = 'menu_2';

                break;

            case 'menu_2':
                if(messageText.includes('100') || messageText.includes('종료'))
                {
                    session.context.state = 'bill';
                }else {
                    var selectedNumber = Number(messageText);
                    if(isNaN(selectedNumber)){
                        M.sendTextMessage(session.fbid, "숫자만 입력해주세요");          //숫자가 아닌 다른 값 입력
                        session.context.state = 'menu_1';
                    }else {
                        if(selectedNumber <= 0 || selectedNumber > session.context.list_length)
                        {
                            M.sendTextMessage(session.fbid, "유효한 숫자만 입력해주세요");          //list 범위 밖의 숫자 입력
                            session.context.state = 'menu_2';
                        }else{
                            flow.getMenuDetail(session.base[selectedNumber-1], function(err, result){
                                if(result === false)
                                {
                                    M.sendTextMessage(session.fbid, "결과값이 없습니다. 다른 제품군을 선택해주세요.");
                                    session.context.state = 'menu_1';
                                }else{
                                    M.sendMenuMessage(session.fbid, result);
                                }

                            });
                            session.context.state = 'menu_1';
                        }
                    }
                }
                break;

            case 'menu_order':
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
                    if(option <= 0)
                    {
                        M.sendTextMessage(session.fbid, "선택하지 않으셨습니다. 주문하고자 하는 제품군을 선택해 주십시오.");
                        session.context.state = 'menu_2';
                        flow.getDoughList(function(err, result){
                            var output = JSON.parse(result);
                            var MenuList = "";
                            session.context.list_length = output["LIST"].length;

                            for(var i = 0; i < output["LIST"].length; i++)
                            {
                                MenuList += output["LIST"][i]["DISPLAY_SEQ"] + ". " + output["LIST"][i]["DOUGH_DESC"] + "\n";
                                session.base[i] = output["LIST"][i]["BASE_ID"];
                            }
                            M.sendTextMessage(session.fbid, MenuList + "100. 종료\n목록에서 번호를 입력해 주십시오.");
                            session.context.state = 'menu_2';
                        });
                    }else{
                        var list ="";
                        var nMenu = Number(session.context.nMenu);
                        session.qty[nMenu] = option;
                        session.context.price += (session.selectedMenuPrice[nMenu] * session.qty[nMenu]);

                        for(var i = 0; i < nMenu+1; i++){
                            list += session.selectedMenu[i] + " " + flow.numberWithCommas(session.selectedMenuPrice[i]) + "원 [" + session.qty[i] + "]\n";
                        }
                        list+= "\n현재 총 금액은 " + flow.numberWithCommas(session.context.price) + "원 입니다.\n";
                        M.sendTextMessage(session.fbid, list + session.context.shopName + "에 위 제품을 목록에 추가 하였습니다. 제품 선택이 완료되었나요?\n1. 예\n2. 아니오. 추가 주문이 있습니다.");
                        session.context.state = 'menu_4';
                        session.context.nMenu += 1;
                    }
                }
                break;

            case 'coupon_1':
                var gbn;
                if(session.context.orderType == "2")
                {
                    gbn = "02";     //배달
                }else{
                    gbn = "01";     //포장
                }

                flow.getCoupon(gbn, function(err, result){
                    var CouponList = "";
                    var output = JSON.parse(result);
                    session.couponInfo = "";
                    session.couponInfo = output;

                    if(output === false) {
                        CouponList = "쿠폰정보가 없습니다.";
                    }else {
                        for (var i = 0; i < output["LIST"].length; i++) {
                            CouponList += output["LIST"][i]["DISPLAY_SEQ"] + ". " + output["LIST"][i]["COUPON_DESC"] + "\n";
                        }
                    }
                    session.context.nCoupon = Number(output["LIST"].length);
                    M.sendTextMessage(session.fbid, "아래 쿠폰 중 하나를 선택해주세요.\n" + CouponList);
                });
                session.context.state = 'coupon_2';
                break;

            case 'bill':
                var str = "";
                var discountValue = 0;
                var nMenu = Number(session.context.nMenu);
                for(var i = 0; i < nMenu; i++){
                    if(session.ClassID[i] == 'P') {
                        discountValue += session.selectedMenuPrice[i] * session.qty[i] * (session.context.couponValue / 100);        //피자에 한해서 할인적용되는 쿠폰
                    }
                }
                session.context.discountValue = String(discountValue);
                var LastPrice = session.context.price - discountValue;

                if(session.context.discountValue != "")
                {
                    str = session.context.couponValue + "% 할인 쿠폰으로 " + flow.numberWithCommas(discountValue) + " 원 이 할인되어서 " + flow.numberWithCommas(LastPrice) + " 원 입니다.\n";
                }else{
                    str = "주문이 준비되었습니다.\n최종금액은" + flow.numberWithCommas(session.context.price) + " 원 입니다.\n";
                }
                M.sendTextMessage(session.fbid, str + "멤버십 포인트 적립/사용 확인하시겠습니까?\n1. 예\n2.아니오");

                session.context.state = 'ChkMembership';

                break;

            case 'membership_0':
                session.context.state = 'membership_1';
                break;

            case 'membership_1':

                flow.checkMembership(messageText, function(err, result){
                    var output = JSON.parse(result);

                    if(output.RESULT == false || output === false){
                        M.sendTextMessage(session.fbid, "멤버십 결과가 없습니다.다시 조회하시겠습니까?\n1.예\n2.아니오");
                        session.context.state = 'ChkMembership';
                    }else{
                        session.context.custName = output.NAME;
                        session.context.cardNo = output.CARD_NO;
                        M.sendTextMessage(session.fbid, output.NAME + " 고객님의 가용포인트는 " + flow.numberWithCommas(output.USABLE_PNT) + "점 입니다.");
                        session.context.usable_pnt = output.USABLE_PNT;
                        if(output.USABLE_PNT > 2000)
                        {
                            M.sendTextMessage(session.fbid, "멤버십 적립/사용이 가능합니다.(사용은 2,000점 부터 가능합니다.)\n1. 적립\n2. 사용\n3. 사용안함");
                            session.context.state = 'membership_11';
                        }else{
                            M.sendTextMessage(session.fbid, "멤버십 적립이 가능합니다.(사용은 2,000점 부터 가능합니다.)\n1. 적립\n2. 적립안함");
                            session.context.state = 'membership_12';
                        }
                    }
                });
                break;

            case 'membership_11': session.context.state = 'membership_11'; break;
            case 'membership_12': session.context.state = 'membership_12'; break;
            case 'membership_13':
                M.sendTextMessage(session.fbid, "사용할 멤버십 포인트를 입력해주세요.");
                session.context.state = 'membership_2';
                break;

            case 'membership_2':
                break;

            case 'order_now':
                NumOrder += 1;
                session.context.timestamp = flow.getTimeStamp();
                session.context.order_number = "FB" + session.context.timestamp + NumOrder;
                var tasks = [function(callback){
                    var success = '';
                    var phoneRegion = session.context.phone_number.substring(0, 3);
                    var phone = session.context.phone_number.substring(3);
                    flow.order_now(session.context.order_number, session.context.shopID, session.context.shopName, session.context.orderType, session.context.timestamp,
                        session.context.couponID, session.context.couponValue, session.context.discountValue, session.context.nMenu, session.context.price,
                        session.context.address, phoneRegion, phone, session.context.custName,
                        session.qty, session.ClassID, session.SizeID, session.BaseID, session.ProductID,
                        session.selectedMenu, session.selectedMenuPrice, session.context.cardNo,
                        session.context.fmcUse, session.context.fmcAmount, session.context.positionX, session.context.positionY, function(err, result){
                            var output = JSON.parse(result);

                            if(result === false){
                                success = 'N';

                            }else{
                                success = output.ORDER_ID;
                            }
                            console.log("ordernow! result success = " + success);
                            callback(null, success);
                        });},
                function(data, callback){
                    if(data == 'N')      //주문실패
                    {
                        M.sendTextMessage(session.fbid, "주문이 실패하였습니다. 처음부터 다시 진행해주세요.");
                    }else{
                        session.context.orderID = data;
                        var custName = "";
                        if(session.context.custName)
                        {
                            custName = session.context.custName + "님";
                        }else{
                            custName = "고객님";
                        }
                        flow.getReceipData(session.context.nMenu, session.selectedMenu, session.qty, session.ClassID, session.SizeID, session.BaseID, session.ProductID,
                            session.selectedMenuPrice, session.context.address, session.context.price, session.context.discountValue, session.context.couponName, session.context.couponValue,
                            session.context.fmcUse, session.context.fmcAmount, session.context.orderType, session.context.shopName, function(err, result){
                                console.log(result);
                                M.sendReceipt(session.fbid, session.context.orderID, custName, result.order_contents, result.address_contents, result.total, result.sale_contents);
                                callback(null, "");
                            });
                    }
                }];

                async.waterfall(tasks, function(err, result){
                    if(err) console.log("order_now err: " + err);
                    M.sendTextMessage(session.fbid, constants.thank + " 처음으로 가시려면 '처음'이라고 입력해주세요.");
                });

                session.context.state = '-1';
                break;

            case '0':
                M.sendTextMessage(session.fbid, constants.thank);
                reset(session);
                break;

            case '-1':
                reset(session);
                break;

            case 'wrap_1':
                M.sendTextMessage(session.fbid, "제품 찾으실 주소를 입력해 주세요.(00시 00구 00동/로 혹은 00도 00읍 00면 00리 00-00번지)");
                session.context.state = 'wrap_2';
                break;

            case 'wrap_2':
                var shopStr = "";
                flow.searchWrapShop(messageText, function(err, result){
                    var output = JSON.parse(result.SEARCH_RESULT);

                    if(output["storeInfo"].length > 10)
                    {
                        M.sendTextMessage(session.fbid, "조회된 주소가 너무 많습니다. 좀 더 상세 주소를 입력해주세요.");
                        session.context.state = 'wrap_2';
                    }else if(output["storeInfo"].length == 0)
                    {
                        M.sendTextMessage(session.fbid, "조회된 주소가 없습니다. \n주소를 다시 입력해주세요.(00시 00구 00동/로 혹은 00도 00읍 00면 00리 00-00번지)");
                        session.context.state = 'wrap_2';                        
                    }else{
                        session.context.list_length = output["storeInfo"].length;
                        session.addrList = output["storeInfo"];
                        for(var i = 0; i < output["storeInfo"].length; i++){
                            shopStr += (i+1) + ". " + output["storeInfo"][i].storeAddr + "(" + output["storeInfo"][i].storeName + ")\n";
                        }
                        shopStr += (output["storeInfo"].length+1) + ". 다시 검색하기\n인근매장을 선택해주세요.";

                        M.sendTextMessage(session.fbid, shopStr);
                        session.context.state = 'wrap_3';
                    }
                });
                break;

            case 'wrap_3':
                session.context.state = 'wrap_3';
                break;

            case 'imagecard':
                console.log("image card");
                M.sendGenericMessage(session.fbid);
                break;

            case 'receipt':
                var custName = "";
                if(session.context.custName)
                {
                    custName = session.context.custName + "님";
                }else{
                    custName = "고객님";
                }
                flow.getReceipData(session.context.nMenu, session.selectedMenu, session.qty, session.ClassID, session.SizeID, session.BaseID, session.ProductID,
                    session.selectedMenuPrice, session.context.address, session.context.price, session.context.discountValue, session.context.couponName, session.context.couponValue,
                    session.context.fmcUse, session.context.fmcAmount, session.context.shopName, function(err, result){
                        console.log(result);
                        M.sendReceipt(session.fbid, session.context.order_number, custName, result.order_contents, result.address_contents, result.total, result.sale_contents);

                    });
                //M.sendReceiptMessage(session.fbid);
                break;

            default:
                console.log("default!!!!!!!!!!!!!!!why???????????");
                //M.sendTextMessage(session.fbid, constants.thank);
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

