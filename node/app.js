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

mongoose.connect('mongodb://localhost:27017/pizzahut');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('connection successful...');
});

var menuSchema = mongoose.Schema({
    type: String,
    itemName: String,
    cate: String,
    price: String
});

var Model = mongoose.model('menu', menuSchema, 'menu');
/*
Model.find({type: 'etc'}, function(err, docs){
    docs.forEach(function(doc){
        console.log(doc);
    });
});

Model.findOne({type: 'pizza'}, function(err, docs){
        console.log(docs);
});
*/

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
    }
    return sessionId;
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
          const sessionId = findOrCreateSession(messagingEvent.sender.id);
          session = sessions[sessionId];
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know you've 
    // successfully received the callback. Otherwise, the request will time out.
    res.sendStatus(200);
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL. 
 * 
 */
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

/*
 * Verify that the callback came from Facebook. Using the App Secret from 
 * the App Dashboard, we can verify the signature that is sent with each 
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
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

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to 
 * Messenger" plugin, it is the 'data-ref' field. Read more at 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the 
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger' 
  // plugin.
  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam, 
    timeOfAuth);

  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  sendTextMessage(senderID, "Authentication successful");
}

/*
 * Message Event
 *
 * This event is called when a message is sent to your page. The 'message' 
 * object format can vary depending on the kind of message that was received.
 * Read more at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-received
 *
 * For this example, we're going to echo any text that we get. If we get some 
 * special keywords ('button', 'generic', 'receipt'), then we'll send back
 * examples of those bubbles to illustrate the special message bubbles we've 
 * created. If we receive a message with an attachment (image, video, audio), 
 * then we'll simply confirm that we've received the attachment.
 * 
 */

function confirm(text)
{
    if(text.includes("sp")|| text.includes("네") || text.includes("맞아") || text.includes("응") || text.includes("ㅇ"))
    {
        return true;
    }else return false;
}
function start_order(text)
{
    if(text.includes("안녕") || text.includes("처음") || text.includes("시작") || text.includes("헬로"))
    {
        return true;
    }else return false;
}
function reset()
{
    session.context.state = "-1";
    session.context.nMenu = 0;
    session.context.price = 0;
}
function order_confirm(num)
{
    var current_state = "배달 중";
    var shop = "가나다 매장(02-111-1111)"
    var content = "[주문번호:" + num + "]\n--- 제품 ---\nAAAAA\nBBBBB\nCCCCC\n금액:00000원\n[주문상태:"+ current_state + " ]\n[주문매장: " + shop + "]";
    return content;
}

function identify(num)
{
    return true;
}
function verification(num)
{
    return true;
}
function selectAddress(address)
{
    var candidate_address = "1. input Area1" + "\n2. input Area2";
    return candidate_address;
}
function selectShop(address)
{
    session.context.shop = 'aaa매장';
    return true;
}
function checkMembership()
{
    return true;
}
function order_now()
{
    var str = '주문번호[12345678] 주문이 완료되었습니다. 배달 예상 시간은 18:30 입니다.';
    return str;
}
function findDough(text)
{
    if(text =='1' || text.includes('신제품') | text.includes('세트') | text.includes('셋트'))
    {
        //return '세트';
        return '와우세븐박스';
    }else if(text.includes('2') || text.includes('인기메뉴'))
    {
        return '치즈크러스트';
    }else if(text.includes('3') || text.includes('리치골드'))
    {
        return '리치골드';
    }else if(text.includes('4') || text.includes('치즈크러스트'))
    {
        return '치즈크러스트';
    }else if(text.includes('5') || text.includes('팬'))
    {
        return '팬';
    }else if(text.includes('6') || text.includes('맛'))
    {
        return 'The맛있는피자2';
    }else if(text.includes('7') || text.includes('트리플'))
    {
        return '트리플박스';
    }else if(text.includes('8') || text.includes('세븐'))
    {
        return '와우세븐박스';
    }else if(text.includes('9') || text.includes('사이드'))
    {
        return 'side';
    }else if(text.includes('10') || text.includes('음료'))
    {
        return 'drink';
    }else if(text.includes('11') || text.includes('기타'))
    {
        return 'etc';
    }

}
function findAll(item)
{
    //var data;
    Model.find({dough:item}, function(err, docs){
        if(err) console.log("mongoDB err 발생: " + err);
        //console.log(docs);
        return docs;
    });
}
function receivedMessage(event) {
    //var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;
    var menu;

    console.log("Received message for user %d and page %d at %d with message:",
    session.fbid, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var isEcho = message.is_echo;
    var messageId = message.mid;
    var appId = message.app_id;
    var metadata = message.metadata;
    var order_number='0';
    var help_id='0';

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

    sendTextMessage(session.fbid, "Quick reply tapped");
    return;
  }

  if (messageText)
  {
      if(messageText == '메뉴주문'){reset(); session.context.state = 'menu_1';session.context.shop = 'aaa매장'; }
      if (session.context.state == "-1" || messageText.includes("안녕") || messageText.includes("처음") || messageText.includes("시작") || messageText.includes("헬로"))
      {
          session.context.state = 'start';
      }else if(session.context.state=='order_confirm')
      {
          order_number = messageText;
      }else if(session.context.state == 'privacy')
      {
          if(messageText.includes("예") || messageText.includes("1"))
          {
              session.context.state = "phone_number";
          }else{
              session.context.state = "-1";
          }
      }else if(session.context.state == 'phone_number_confirm')
      {
          if(identify(messageText))
          {
              session.context.state = "identify";
              session.context.phone_number = messageText;
          }else{
              session.context.state = 'phone_number_confirm';
          }
      }else if(session.context.state == 'verification_code')
      {
          if(verification(messageText))
          {
              session.context.state = "order_method";

          }else{
              session.context.state = "identify";
          }
      }else if(session.context.state == 'help')
      {
          if(messageText.includes("1"))
          {
              session.context.state = "help_1";
          }else{
              session.context.state = "help_2";
          }

      }else if(session.context.state == 'order_method')
      {
          if(messageText.includes("배달") || messageText.includes("1"))
          {
              session.context.state = "delivery";
          }else{
              session.context.state = "wrap";
          }
      }else if(session.context.state == 'address_1')
      {
          session.context.address = messageText;
      }else if(session.context.state == 'address_2')
      {
          session.context.address = session.context.address + messageText;
      }else if(session.context.state == 'address_3')
      {
          if(messageText.includes("1"))
          {
              session.context.address = session.context.address + " input Area1 ";
          }else {
              session.context.address = session.context.address + " input Area2 ";
          }
      }else if(session.context.state == 'address_4')
      {
          session.context.address = session.context.address + messageText;
      }else if(session.context.state == 'address_5')
      {
          if(messageText.includes('1') || messageText.includes('예') || messageText.includes('sp') || messageText.includes('네'))
          {
              if(selectShop(session.context.address))       //배달 가능 매장이 있을 때
              {
                  session.context.state = 'menu_1';

              }else{                                        //배달 가능 매장이 없을 때
                  session.context.state = 'research_address_1';
              }
          }else{
              session.context.state = 'delivery';
          }
      }else if(session.context.state == 'research_address_2')
      {
          if(messageText.includes('1') || messageText.includes('예') || messageText.includes('sp') || messageText.includes('네'))     //배달가능 주소 재 검색
          {
              session.context.state = 'delivery';
          }else{        //배달 가능한 곳이 없어서 주문 포기
              session.context.state = '0';
          }
      }else if(session.context.state =='menu_2')
      {
          var temp;
          if(messageText.includes('100') || messageText.includes('종료'))
          {
              session.context.state = 'bill';
          }else {
              var task_pizza = [
                  function (callback){
                      callback(null, findDough(messageText));
                  },
                  function (data, callback){
                      Model.find({type: data}, function(err, docs){
                          if(err) console.log("mongoDB err 발생: " + err);
                          callback(null, docs);
                      });
                  }
              ];
              var task_else = [
                  function (callback){
                      callback(null, findDough(messageText));
                  },
                  function (data, callback){
                      Model.find({cate: data}, function(err, docs){
                          if(err) console.log("mongoDB err 발생: " + err);
                          callback(null, docs);
                      });
                  }
              ];
              var num = Number(messageText);
              var task;
              if(num < 9){
                  task = task_pizza;
              }else{
                  task = task_else;
              }
              async.waterfall(task, function(err, result){
                  if(err) console.log(err);
                  else {
                      var menuList = "상세 제품을 선택해 주십시오.\n";
                      for(var i = 0; i < result.length; i++)
                      {
                          menuList += (i+1) + ". " + result[i]["type"] + " " + result[i]["itemName"] + " " + result[i]["price"] + " 원" + "\n";
                      }
                      session.context.menuList = JSON.stringify(result);
                      sendTextMessage(session.fbid, menuList + "\n원하시는 제품 번호를 입력해 주십시오.");
                  }
              });
          }
      }else if(session.context.state == 'menu_3')
      {
          var menuList = JSON.parse(session.context.menuList);
          var option = Number(messageText);
          if(isNaN(option))
          {
           sendTextMessage(session.fbid, "숫자만 사용해주세요");
              session.context.state = 'menu_1';
          }else if(option - 1 <= menuList.length)
            {
                //console.log(menuList);
                session.menu[session.context.nMenu] = menuList[option-1]["type"] + menuList[option-1]["itemName"];
                session.context.price += Number(menuList[option-1]['price']);
                session.context.nMenu += 1;

                //session.context.menu[0] = session.context.menuList[messageText];
            }else{
                sendTextMessage(session.fbid, "잘못선택하셨습니다.");
                session.context.state = 'menu_1';
            }
      }else if(session.context.state == 'menu_4')
      {
          if(messageText.includes('1') || messageText.includes('예'))
          {
              session.context.state = 'bill';
          }else{
              session.context.state = 'menu_1';
          }
      }else if(session.context.state == 'order')
      {
          checkMembership();
          sendTextMessage(session.fbid, order_now() + '\n이용해주셔서 감사합니다.');
          session.context.state = '-1';
      }else if(session.context.state =='0')
      {
          sendTextMessage(session.fbid, "이용해주셔서 감사합니다.");
          session.context.state = '-1';
      }

    // If we receive a text message, check to see if it matches any special
    // keywords and send back the corresponding example. Otherwise, just echo
    // the text we received.
    switch (session.context.state) {
	    case 'start':
            sendStartMessage(session.fbid);
	        break;

        case 'order_confirm':
            sendTextMessage(session.fbid, order_confirm(order_number));
            session.context.state = "-1";
            break;

        case 'help_1':
            sendTextMessage(session.fbid, "주소 입력은 잘 하시면 됩니다.");
            session.context.state = '-1';
            break;

        case 'help_2':
            sendTextMessage(session.fbid, "피자헛 멤버십은 잘 적립하시면 됩니다.");
            session.context.state = '-1';
            break;

        case 'phone_number':
            sendTextMessage(session.fbid, "정확한 주문을 위해 휴대폰 번호를 입력해 주세요.");
            session.context.state = 'phone_number_confirm';
            break;

        case 'identify':
            sendTextMessage(session.fbid, "휴대폰번호로 발송된 인증번호를 입력해주세요. 입력하신 번호는" + session.context.phone_number + "입니다.");
            session.context.state = "verification_code"
            break;

        case 'order_method':
            sendTextMessage(session.fbid, "주문 방법을 선택해주세요.\n1. 배달 주문\n2. 포장 주문");
            session.context.state = 'order_method';
            break;

        case 'delivery':
            sendTextMessage(session.fbid, "배달 받으실 주소를 입력해 주세요 (00시 00구 00동/로)");
            session.context.state = 'address_1';
            break;

        case 'address_1':
            sendTextMessage(session.fbid, "상세 주소를 입력해주세요 (00아파트, 00-000)");
            session.context.state = 'address_2'
            break;

        case 'address_2':
            var address = selectAddress(session.context.address);
            sendTextMessage(session.fbid, address + "\n목록에서 배달 받으실 주소 번호를 입력해 주십시오.");
            session.context.state = 'address_3';
            break;

        case 'address_3':
            sendTextMessage(session.fbid, "나머지 주소를 입력해 주십시오.(0동 0호, 0층)");
            session.context.state = 'address_4';
            break;

        case 'address_4':
            sendTextMessage(session.fbid, "배달 받으실 주소가 " + session.context.address + " 가 맞습니까?");
            session.context.state = 'address_5';
            break;

        case 'research_address_1':
            sendTextMessage(session.fbid, "배달 가능 매장이 존재하지 않습니다. 주소 검색을 다시 하시겠습니까?");
            session.context.state = 'research_address_2';
            break;

        case 'menu_1':
            sendTextMessage(session.fbid, "주문하시고자 하는 제품군을 선택해 주십시오.");;
            sendTextMessage(session.fbid, "1. 신제품세트\n2. 인기메뉴\n3. 리치골드\n4. 치즈크러스트\n5. 팬\n6. 더맛있는피자\n7. 트리플박스\n8. 와우세븐박스\n9. 사이드\n10. 음료\n11. 기타\n100. 종료\n목록에서 번호를 입력해 주십시오.");
            session.context.state = 'menu_2';
            break;

        case 'menu_2':
            session.context.state = 'menu_3';
            break;

        case 'menu_3':
            var list = "";
            for(var i = 0; i < session.context.nMenu; i++)
            {
                list += session.menu[i] + ", ";
            }
            sendTextMessage(session.fbid, session.context.shop + "에 " + list + "제품을 배달 목록에 추가 하였습니다. 제품 선택이 완료되었나요?\n1. 예\n2. 아니오. 추가 주문이 있습니다.");
            session.context.state = 'menu_4';
            break;

        case 'bill':
            var content = "";
            var total;
            for(var i = 0; i < session.context.nMenu; i++)
            {
                content += (i+1) + ". " + session.menu[i] + "\n";
            }
            sendTextMessage(session.fbid, "주문이 완료되었습니다.\n" + content + '금액: ' + session.context.price + "원");
            session.context.state = 'order';
            break;

        case '0':
            sendTextMessage(session.fbid, "이용해주셔서 감사합니다.");
            session.context.state = '-1';
            break;

        case '-1':
            reset();
            break;
        case 'wrap': break;

      default:
          sendTextMessage(session.fbid, "이용해주셔서 감사합니다.");
    }
  } else if (messageAttachments) {
    sendTextMessage(session.fbid, "Message with attachment received");
  }
}


/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about 
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s", 
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}


/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event)
{
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

    if(payload == "order_number")        //주문확인
    {
        session.context.state = 'order_confirm';
        sendTextMessage(senderID, "주문 번호를 입력해 주십시오.");

    }else if(payload == "order")        //주문하기
    {
        session.context.state = 'privacy';
        sendTextMessage(senderID, "고객님의 개인정보 수집 및 이용에 동의 하시겠습니까?\n1. 예\n2. 아니요(주문 취소)");

    }else if(payload == "help")         //도움말
    {
        session.context.state = 'help';
        sendTextMessage(senderID, "\tQ & A\n1. 주소 입력은 어떻게 하나요?\n2. 피자헛 멤버십은 어떻게 적립하나요?");
    }else {
        sendTextMessage(senderID, "감사합니다");
    }

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  //sendTextMessage(senderID, "Postback called");
}

/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 * 
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 * 
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId) {
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
function sendGifMessage(recipientId) {
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
function sendAudioMessage(recipientId) {
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
function sendVideoMessage(recipientId) {
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
function sendFileMessage(recipientId) {
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
function sendTextMessage(recipientId, messageText) {
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
function sendStartMessage(recipientId) {
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

function DrinkButtonMessage(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            attachment: {
                type: "template",
                payload: {
                    template_type: "button",
                    text: "다음 중 하나를 골라 주세요",
                    buttons:[{
                        type: "postback",
                        payload: "coke",
                        title: "콜라"
                    }, {
                        type: "postback",
                        payload: "sevenup",
                        title: "세븐업"

                    }, {
                        type: "postback",
                        payload: "beer",
                        title: "클라우드 맥주"
                    }]
                }
            }
        }
    };

    callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: SERVER_URL + "/assets/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: SERVER_URL + "/assets/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
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
function sendReceiptMessage(recipientId) {
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
function sendQuickReply(recipientId) {
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
function sendReadReceipt(recipientId) {
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
function sendTypingOn(recipientId) {
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
function sendTypingOff(recipientId) {
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
function sendAccountLinking(recipientId) {
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

// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
var server = https.createServer(app).listen(8888, function(){
	console.log("https");
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

