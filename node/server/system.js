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
    var phonenumber = "params={'phone':'" + phone + "','req_page':'104','req_channel':'WEB'}";
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
exports.getAddress = function(address, callback)
{
    var inputdata = "params={'searchStr':'" + address + "'}";
    var target = "gis/getAddress.phk";
    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);
        if (err) console.log(err);

        if (output == false || output.RESULT == false) {
            callback(null, false);
        } else {
            callback(null, output);
        }
    });
}
exports.selectShop = function(x, y, callback)
{
    var inputdata = "params={'x':'" + x + "','y':'" + y + "'}";
    var target = 'gis/getDeliveryStore.phk';
    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);
        if (err) console.log(err);

        if (output == false /*|| output.SEARCH_RESULT.zoneDelivery == "N"*/) {
            callback(null, false);
        } else {
            callback(null, result);
        }
    });

}
exports.checkMembership = function(phone, cardNo, callback)
{
    var inputdata = "params={'phone':'" + phone + "', 'cardNo':'" + cardNo + "'}";
    var target = "API-310.phk";
    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);
        if (err) console.log(err);

        if (output == false) {
            callback(null, false);
        } else {
            callback(null, result);
        }
    });
    return true;
}
exports.order_now = function(branchID, branchName, orderType, timestamp, couponID, discountValue, nMenu, price, address, phoneRegion, phone,
                             custName, qty, ClassID, SizeID, BaseID, ProductID, cardNo, fmcUse, fmcAmount, callback)
{
    var inputdata = "params=";
    var target = "API-309.phk";
    var result = new Object();
    var MD = new Object();

    var ObjectMasterData = new Object();

    ObjectMasterData.orderId = "";
    ObjectMasterData.custId = "";
    ObjectMasterData.agentId = "WEB";
    ObjectMasterData.branchId = branchID;
    ObjectMasterData.orderType = orderType;
    ObjectMasterData.orderDateTime = timestamp;
    ObjectMasterData.packDataTime = timestamp;
    ObjectMasterData.reserveDateTime = "";
    ObjectMasterData.couponId = couponID;
    ObjectMasterData.discount = "";
    ObjectMasterData.couponVal = discountValue;
    ObjectMasterData.empMeal = "";
    ObjectMasterData.items = nMenu;
    ObjectMasterData.listPrice = String(Number(price) - Number(discountValue));
    ObjectMasterData.discPrice = discountValue;
    ObjectMasterData.prodId = "";
    ObjectMasterData.cdate = "";
    ObjectMasterData.chour = "";
    ObjectMasterData.delayTime = "";
    ObjectMasterData.si = "";
    ObjectMasterData.gu = "";
    ObjectMasterData.dong = "";
    ObjectMasterData.addr1 = "";
    ObjectMasterData.addr2 = "";
    ObjectMasterData.addrDesc = address;
    ObjectMasterData.phoneRegion = phoneRegion;
    ObjectMasterData.phone = phone;
    ObjectMasterData.anti = "";
    ObjectMasterData.flag = "Y";
    ObjectMasterData.custName = custName;
    ObjectMasterData.sector = "";
    ObjectMasterData.zipcode = "";
    ObjectMasterData.orderGubun = "2";
    ObjectMasterData.phkno = "";

    MD.aOrderMasterDataVO = ObjectMasterData;

    var aOrderMasterDataVO = new Array();
    var aOrderItems = new Object();
    var aOrderItemDataVO = new Array();

    for(var i = 0; i < nMenu; i++) {

        var ObjectItemData = new Object();
        ObjectItemData.orderId = "";
        ObjectItemData.orderSeq = String(i);
        ObjectItemData.agentid = "WEB";
        ObjectItemData.branchId = branchID;
        ObjectItemData.createDateTime = timestamp;
        ObjectItemData.mDeal = "";
        ObjectItemData.mGroup = "";
        ObjectItemData.qty = String(qty[i]);
        ObjectItemData.classId = ClassID[i];
        ObjectItemData.sizeId = SizeID[i];
        ObjectItemData.baseId = BaseID[i];
        ObjectItemData.productId = ProductID[i];
        ObjectItemData.half = "N";
        ObjectItemData.topp1 = "";
        ObjectItemData.topp2 = "";
        ObjectItemData.topp3 = "";
        ObjectItemData.topp4 = "";
        ObjectItemData.topp5 = "";
        ObjectItemData.topp6 = "";
        ObjectItemData.topp7 = "";
        ObjectItemData.topp8 = "";
        ObjectItemData.topp9 = "";
        ObjectItemData.topp10 = "";
        ObjectItemData.topp11 = "";
        ObjectItemData.bProductId = "";
        ObjectItemData.bTopp1 = "";
        ObjectItemData.bTopp2 = "";
        ObjectItemData.bTopp3 = "";
        ObjectItemData.bTopp4 = "";
        ObjectItemData.bTopp5 = "";
        ObjectItemData.bTopp6 = "";
        ObjectItemData.bTopp7 = "";
        ObjectItemData.bTopp8 = "";
        ObjectItemData.bTopp9 = "";
        ObjectItemData.bTopp10 = "";
        ObjectItemData.bTopp11 = "";
        ObjectItemData.couponId = "";
        ObjectItemData.couponVal= "";
        ObjectItemData.listPrice = "";
        ObjectItemData.discPrice = "";
        ObjectItemData.cdate = "";
        ObjectItemData.chour = "";

        aOrderItemDataVO.push(ObjectItemData);
    }
    aOrderItems.aOrderItemDataVO = aOrderItemDataVO;
    MD.aOrderItems = aOrderItems;

    var aCustMasterDataVO = new Object();

    aCustMasterDataVO.custId = "";
    aCustMasterDataVO.custName = custName;
    aCustMasterDataVO.fmcCard = cardNo;
    aCustMasterDataVO.addrDesc = address;
    aCustMasterDataVO.phoneRegion = phoneRegion;
    aCustMasterDataVO.phone = phone;
    aCustMasterDataVO.branchId = branchID;
    aCustMasterDataVO.branchName = branchName;
    aCustMasterDataVO.custType = "10";
    aCustMasterDataVO.fmcUse = fmcUse;
    aCustMasterDataVO.fmcAmount = fmcAmount;
    aCustMasterDataVO.lastUpdate = "";
    aCustMasterDataVO.lastUpdateTime = "";
    aCustMasterDataVO.createUpdate = "";
    aCustMasterDataVO.createUpdateTime = "";
    aCustMasterDataVO.zipcode = "";
    aCustMasterDataVO.orderAmt = "";
    aCustMasterDataVO.custMemo = "";
    aCustMasterDataVO.pointX = "";
    aCustMasterDataVO.pointY = "";

    MD.aCustMasterDataVO = aCustMasterDataVO;

    result.fullOrderVO = MD;

    console.log("inputARRAY!@#@#@#@#@#@#@#@## " + JSON.stringify(result));
    inputdata = inputdata + JSON.stringify(result);
    console.log("inputDATA!!!!!!!!!!!!!!!!! " + inputdata);

    /*APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);

        console.log();
    });*/

    callback(null, result);
}
exports.getMenuDetail = function(baseID, callback)
{
    var input = "params={'Base_Id':'" + baseID + "'}";
    var target = "API-30701.phk";
    var url = "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_GB_1.jpg";

    var buttonContents;
    var menuArray = new Array();
    var menuContents;

    APICall(input, target, function(err, result){
        var output = JSON.parse(result);
        if(err) console.log(err);

        if(output == false || output.RESULT == false){
            callback(null, false);
        }else{
            var n = 0, pivot;
            while(true){
                var buttonArray = new Array();
                var menuContents = new Object();
                menuContents.title = output["LIST"][n]["BASE_DESC"] + '-' + output["LIST"][n]["PRODUCT_DESC"];
                menuContents.subtitle = output["LIST"][n]["PRODUCT_DESC_SHORT"];
                menuContents.image_url = url;

                pivot = output["LIST"][n]["PRODUCT_DESC"];
                if (pivot == output["LIST"][n+1]["PRODUCT_DESC"])
                {
                    for(var i = n; i < n+2; i++) {
                        var buttonContents = new Object();
                        buttonContents.type = 'postback';
                        buttonContents.title = output["LIST"][i]["SIZE_CD"] + " " + output["LIST"][i]["PRICE"];
                        buttonContents.payload = 'MENUORDER' + "/" + output["LIST"][i]["CLASS_ID"] + "/" + output["LIST"][i]["SIZE_ID"]
                            + "/" + output["LIST"][i]["BASE_ID"] + "/" + output["LIST"][i]["PRODUCT_ID"] + "/" + output["LIST"][i]["PRICE"]
                        + "/" + output["LIST"][n]["BASE_DESC"] + '-' + output["LIST"][n]["PRODUCT_DESC"] + " " + output["LIST"][i]["SIZE_CD"];
                        buttonArray.push(buttonContents);
                    }
                    n += 2;
                }else{
                    var buttonContents = new Object();
                    buttonContents.type = 'postback';
                    buttonContents.title = output["LIST"][n]["SIZE_CD"] + " " + output["LIST"][n]["PRICE"];
                    buttonContents.payload = 'MENUORDER' + "/" + output["LIST"][n]["CLASS_ID"] + "/" + output["LIST"][n]["SIZE_ID"]
                        + "/" + output["LIST"][n]["BASE_ID"] + "/" + output["LIST"][n]["PRODUCT_ID"] + "/" + output["LIST"][n]["PRICE"]
                    + "/" + output["LIST"][n]["BASE_DESC"] + '-' + output["LIST"][n]["PRODUCT_DESC"] + " " + output["LIST"][n]["SIZE_CD"];
                    buttonArray.push(buttonContents);
                    n += 1;
                }

                menuContents.buttons = buttonArray;
                menuArray.push(menuContents);

                if(n >= output["LIST"].length-1)
                {
                    break;
                }

            }
            var jsonInfo = JSON.stringify(menuArray);
            callback(null, jsonInfo);
        }
    });

}
exports.getCoupon = function(callback)
{
    var inputdata = "";
    var target = "API-308.phk";

    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);
        if(err) console.log(err);

        if(output == false || output.RESULT == false){
            callback(null, false);
        }else{
            callback(null, result);
        }
    });
}
exports.start = function(text)
{
    if(text.includes("안녕") || text.includes("처음") || text.includes("시작") || text.includes("헬로") || text.includes("피자 주문"))
    {
        return true;
    }else return false;
}
exports.searchWrapShop = function(address, callback)
{
    var inputdata = "params={'searchStr':'" + address + "'}";
    var target = "gis/getPackStoreInfo.phk";

    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);

        callback(null, output);

    });
}
exports.getTimeStamp = function()
{
    var d = new Date();
    var s =
        leadingZeros(d.getFullYear(), 4) +
        leadingZeros(d.getMonth() + 1, 2) +
        leadingZeros(d.getDate(), 2) +

        leadingZeros(d.getHours()+9, 2) +
        leadingZeros(d.getMinutes(), 2) +
        leadingZeros(d.getSeconds(), 2);

    return s;
}

function leadingZeros(n, digits) {
    var zero = '';
    n = n.toString();

    if (n.length < digits) {
        for (var i = 0; i < digits - n.length; i++)
            zero += '0';
    }
    return zero + n;
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