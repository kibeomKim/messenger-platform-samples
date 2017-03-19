'use strict';
var request = require('request');
var async = require('async');
var constants = require('./constant.js');

exports.confirm = function(text)
{
    if(text.includes("sp")|| text.includes("네") || text.includes("맞아") || text.includes("응") || text.includes("ㅇ") || text.includes("넹") || text.includes("얍") || text.includes("넵") || text.includes("예") || text.includes("d"))
    {
        return true;
    }else return false;
}
exports.order_confirm = function(orderID, phone, callback)
{
    var phonenumber = "params={'orderId':'" + orderID + "','phone':'" + phone + "'}";
    var target = "API-063.phk";

    APICall(phonenumber, target, function(err, result){
        var output = JSON.parse(result);
        var comment = "";
        var state, menuList = "", size, tmp;
        if (err) console.log(err);
        console.log(output);

        if (output == false || output.RESULT == false)
        {
            callback(null, "주문 정보가 없습니다");
        } else {
            state = getState(output.STATE);

            for(var i=0; i < output["ITEM_LIST"].length; i++)
            {
                size = sizeTranslator(output["ITEM_LIST"][i]["SIZE_ID"], output["ITEM_LIST"][i]["PRODUCT_ID"]);
                if(size == "no") size = "";
                if(output["ITEM_LIST"][i]["BASE_ID"]) tmp = constants[output["ITEM_LIST"][i]["BASE_ID"]] + "-";       //baseID가 없는 경우가 있음. ex)콜라
                else tmp = "";
                menuList += tmp + output["ITEM_LIST"][i]["PRODUCT_DESC"] + " " + size + " [" + output["ITEM_LIST"][i]["QTY"] + "]\n";
            }
            comment = "[주문번호: " + orderID + "]\n제품:\n" + menuList + "금액: " + output.LAST_PRICE + "원\n"
                + "[주문상태: " + state + "]\n" + "[주문매장: " + output.BRANCH_NAME + "(" + output.BRANCH_PHONE + ")]";
            //comment = output.ORDER_YEAR + "년 " + output.ORDER_MONTH + "월 " + output.DAY + "일 " + output.HOUR + "시 " + output.MINUTE + "분 ";
            console.log(comment);
            callback(null, comment);
        }
    });
}
exports.identify = function(phone, callback)
{
    var phonenumber = "params={'phone':'" + phone + "','req_page':'101','req_channel':'WEB'}";
    var target = "API-003.phk";

    APICall(phonenumber, target, function(err, result){
        var output = JSON.parse(result);

        if (err) console.log(err);
        console.log("identify result!!!!!!!!!!!!!: " + output.RESULT);

        if (result == false || output.RESULT == false) {
            callback(null, false);
        } else {
            callback(null, result);
        }
    });
}
exports.verification = function(phone, authkey, authno, callback)
{
    var veri = "params={'phone':'" + phone + "','authKey':'" + authkey +"','authNo':'" + authno + "'}";
    var target = "API-004.phk";

    APICall(veri, target, function(err, result){
        var output = JSON.parse(result);
        if (err) console.log(err);

        if (output == false || output.RESULT == false) {
            callback(null, false);
        } else {
            callback(null, true);
        }
    });
}
exports.getDoughList = function(callback)
{
    APICall("", "API-305.phk", function(err, result){
        callback(null, result);
    });
}
exports.selectAddress = function(address)
{
    var candidate_address = "1. input Area1" + "\n2. input Area2";
    return "1. " + address;
}
exports.selectShop = function(address)
{
    return 'aaa매장';
}
exports.checkMembership = function()
{
    return true;
}
exports.order_now = function()
{
    var order_num = "12345678";
    var order_time = "18:30";
    var str = '주문번호['+ order_num +'] 주문이 완료되었습니다. 배달 예상 시간은 '+ order_time + ' 입니다.';
    return str;
}
exports.findDough = function(text)
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
exports.start = function(text)
{
    if(text.includes("안녕") || text.includes("처음") || text.includes("시작") || text.includes("헬로") || text.includes("피자 주문"))
    {
        return true;
    }else return false;
}
exports.searchShop = function(text)
{
    var shop = '1. 종로본점(종로5가)\n2. 약수역2호점(약수동)\n3. 숭인점(숭인동)';
    return shop;
}

function APICall(inputdata, target, callback)
{
    var bodyData = inputdata;       //{'phone':'01092103621','req_page':'101','req_channel':'WEB'}";
    var options = {
        uri: "http://apidev.pizzahut.co.kr/" + target,  //API-003.phk",
    method: "POST",
        headers: {
    "Content-Type": "application/x-www-form-urlencoded"
},
    body: bodyData
};
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            //console.log(bodyData);
            console.log('request option : ' + body);
            callback(null, body);

        } else {
            console.log('request option error : ' + error);
            console.log('request option error response : ' + response);
            callback(err, false);
        }
    });
}
function sizeTranslator(size, product){
    switch(size){
        case 'HE':
        case 'E':
        case 'TE':
        case 'M':
            return "M";
            break;
        case 'HL':
        case 'S':
        case 'L':
            return "L";
            break;
        case 'MB':
            return "10개";
            break;
        case 'BU':
            if(product == "SW" ||product == "FS" ||product == "FO" ||product == "TF") return "4조각";
            else return "10조각";
            break;
        case 'PE': return "1.5L"; break;     //콜라
        case 'PF': return "0.5L"; break;
        default:    //사이즈 없음 ex)스파게티
            return "no";
    };
}
function getState(state){
    if(state == "0")
    {
        return "완료";
    }else if(state == "1")
    {
        return "배달준비 중";
    }else if(state == "2")
    {
        return "포장준비";
    }else{      //에러
        return "에러-문의요망";
    }
}