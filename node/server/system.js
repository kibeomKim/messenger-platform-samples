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

        if (output === false || output.RESULT == false)
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
            callback(null, comment);
        }
    });
}
exports.identify = function(phone, callback)
{
    var phonenumber = "params={'phone':'" + phone + "','req_page':'103','req_channel':'WEB'}";
    var target = "API-003.phk";

    APICall(phonenumber, target, function(err, result){
        var output = JSON.parse(result);

        if (err) console.log(err);

        if (result === false || output.RESULT == false) {
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

        if (output === false || output.RESULT == false) {
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

        if (output === false || output.SEARCH_RESULT == "[]") {
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
        var testOutput = JSON.parse(output.SEARCH_RESULT);
        if (err) console.log(err);

        if (isEmpty(output) || isEmpty(testOutput)){
            callback(null, false);
        } else {
            callback(null, output);
        }
    });
}
exports.checkMembership = function(cardNo, callback)
{
    var inputdata = "params={'cardNo':'" + cardNo + "'}";
    var target = "API-310.phk";
    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);
        if (err) console.log(err);

        if (output === false) {
            callback(null, false);
        } else {
            callback(null, result);
        }
    });
    return true;
}
exports.order_now = function(NumOrder, branchID, branchName, orderType, timestamp, couponID, couponValue, discountValue, nMenu, price, address, phoneRegion, phone,
                             custName, qty, ClassID, SizeID, BaseID, ProductID, selectedMenu, selectedMenuPrice, cardNo, fmcUse, fmcAmount, x, y, callback)
{
    var inputdata = "params=";
    var target = "API-309.phk";
    var result = new Object();
    var MD = new Object();

    var totalSaleSum = 0;

    var aOrderMasterDataVO = new Array();
    var aOrderItems = new Object();
    var aOrderItemDataVO = new Array();

    for(var i = 0; i < nMenu; i++) {

        var ObjectItemData = new Object();
        ObjectItemData.orderId = "";
        ObjectItemData.orderSeq = String(i+1);
        ObjectItemData.agentid = "WEB";
        ObjectItemData.branchId = branchID;
        ObjectItemData.createDateTime = timestamp;
        ObjectItemData.mDeal = "";
        ObjectItemData.mGroup = "";
        ObjectItemData.qty = String(qty[i]);
        ObjectItemData.classId = ClassID[i];
        ObjectItemData.sizeId = SizeID[i];
        if(BaseID[i] == "SB")
        {
            ObjectItemData.baseId = "";
        }else{
            ObjectItemData.baseId = BaseID[i];
        }
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
        if(ClassID[i] == 'P')
        {
            ObjectItemData.couponId = couponID;
            ObjectItemData.couponVal= String(selectedMenuPrice[i]* qty[i] *(couponValue/100));
            totalSaleSum += selectedMenuPrice[i]* qty[i] *(couponValue/100);
            ObjectItemData.listPrice = String(selectedMenuPrice[i] * qty[i]);
            ObjectItemData.discPrice = String(selectedMenuPrice[i]* qty[i] *(couponValue/100));
        }else{
            ObjectItemData.couponId = "";
            ObjectItemData.couponVal= "";
            ObjectItemData.listPrice = String(selectedMenuPrice[i]* qty[i]);
            ObjectItemData.discPrice = "";
        }

        ObjectItemData.cdate = "";
        ObjectItemData.chour = "";

        aOrderItemDataVO.push(ObjectItemData);
    }
    aOrderItems.aOrderItemDataVO = aOrderItemDataVO;


    var ObjectMasterData = new Object();

    ObjectMasterData.orderId = "";
    ObjectMasterData.custId = "";
    ObjectMasterData.agentId = "WEB";
    ObjectMasterData.branchId = branchID;
    ObjectMasterData.orderType = orderType;
    ObjectMasterData.orderDateTime = timestamp;
    ObjectMasterData.packDataTime = timestamp;
    ObjectMasterData.reserveDateTime = "";
    ObjectMasterData.couponId = "";
    ObjectMasterData.discount = "";
    ObjectMasterData.couponVal = "";
    ObjectMasterData.empMeal = "";
    ObjectMasterData.items = nMenu;
    ObjectMasterData.listPrice = String(price);
    ObjectMasterData.discPrice = String(totalSaleSum);
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
    ObjectMasterData.allyCouponId = NumOrder;

    MD.aOrderMasterDataVO = ObjectMasterData;           //주문 마스터정보

    MD.aOrderItems = aOrderItems;           //주문 아이템

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
    aCustMasterDataVO.fmcAmount = String(fmcAmount);
    aCustMasterDataVO.lastUpdate = "";
    aCustMasterDataVO.lastUpdateTime = "";
    aCustMasterDataVO.createUpdate = "";
    aCustMasterDataVO.createUpdateTime = "";
    aCustMasterDataVO.zipcode = "";
    aCustMasterDataVO.orderAmt = "";
    aCustMasterDataVO.custMemo = "";
    aCustMasterDataVO.pointX = x;
    aCustMasterDataVO.pointY = y;

    MD.aCustMasterDataVO = aCustMasterDataVO;           //주문 고객 정보

    result.fullOrderVO = MD;

    inputdata = inputdata + JSON.stringify(result);
    console.log("ORDER_DATA: " + inputdata);

    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);

        console.log(output);
        if(output === false || output.RESULT == false){
            callback(null, false);
        }else{
            callback(null, result);
        }
    });
}
exports.getMenuDetail = function(baseID, callback)
{
    var input = "params={'Base_Id':'" + baseID + "'}";
    var target = "API-30701.phk";
    var url = "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/top/P_RG_GB_1.jpg";

    var buttonContents;
    var menuArray = new Array();
    var menuContents;
    var size = "";
    var base_desc = "";

    APICall(input, target, function(err, result){
        var output = JSON.parse(result);
        if(err) console.log(err);

        if(output === false || output.RESULT == false){
            callback(null, false);
        }else{
            var n = 0, pivot;
            while(true){
                var buttonArray = new Array();
                var menuContents = new Object();
                if(output["LIST"][n]["BASE_DESC"] === undefined)
                {
                    base_desc = "";
                }else{
                    base_desc = output["LIST"][n]["BASE_DESC"] + "-";
                }
                menuContents.title = base_desc + output["LIST"][n]["PRODUCT_DESC"];
                menuContents.subtitle = output["LIST"][n]["PRODUCT_DESC_SHORT"];
                //menuContents.image_url = url;
                if(output["LIST"][n]["CLASS_ID"] == "P")            //피자
                {
                    menuContents.image_url = "http://akamai.pizzahut.co.kr/IPizzahut/mobile/menu/pizza/MENU_IMG_"
                        + output["LIST"][n]["CLASS_ID"] + "_" + output["LIST"][n]["BASE_ID"] + "_" + output["LIST"][n]["PRODUCT_ID"] + ".png";


                }else if(output["LIST"][n]["CLASS_ID"] == "SB"){            //음료
                    menuContents.image_url = "http://cdn.pizzahut.co.kr/IPizzahut/mobile/menu/drink/MENU_IMG_"
                        + output["LIST"][n]["CLASS_ID"] + "__" + output["LIST"][n]["PRODUCT_ID"] + "_" + output["LIST"][n]["SIZE_ID"] + ".png";
                }else{          //사이드
                    menuContents.image_url = "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/side/"
                        + output["LIST"][n]["CLASS_ID"] + "_" + output["LIST"][n]["BASE_ID"] + "_" + output["LIST"][n]["SIZE_ID"] + "_" + output["LIST"][n]["PRODUCT_ID"]   + ".jpg";
                }

                pivot = output["LIST"][n]["PRODUCT_DESC"];
                if (pivot == output["LIST"][n+1]["PRODUCT_DESC"])
                {
                    for(var i = n; i < n+2; i++) {
                        if(output["LIST"][i]["SIZE_CD"] === undefined)
                        {
                            size = " ";
                        }else {
                            size = output["LIST"][i]["SIZE_CD"];
                        }
                        var buttonContents = new Object();
                        buttonContents.type = 'postback';
                        buttonContents.title = size + " " + output["LIST"][i]["PRICE"] + " 원";
                        buttonContents.payload = 'MENUORDER' + "/" + output["LIST"][i]["CLASS_ID"] + "/" + output["LIST"][i]["SIZE_ID"]
                            + "/" + output["LIST"][i]["BASE_ID"] + "/" + output["LIST"][i]["PRODUCT_ID"] + "/" + output["LIST"][i]["PRICE"]
                        + "/" + base_desc + output["LIST"][n]["PRODUCT_DESC"] + " " + size;
                        buttonArray.push(buttonContents);
                    }
                    n += 2;
                }else{
                    if(output["LIST"][n]["SIZE_CD"] === undefined)
                    {
                        size = " ";
                    }else {
                        size = output["LIST"][n]["SIZE_CD"];
                    }
                    var buttonContents = new Object();
                    buttonContents.type = 'postback';
                    buttonContents.title = size + " " + output["LIST"][n]["PRICE"] + " 원";
                    buttonContents.payload = 'MENUORDER' + "/" + output["LIST"][n]["CLASS_ID"] + "/" + output["LIST"][n]["SIZE_ID"]
                        + "/" + output["LIST"][n]["BASE_ID"] + "/" + output["LIST"][n]["PRODUCT_ID"] + "/" + output["LIST"][n]["PRICE"]
                    + "/" + base_desc + output["LIST"][n]["PRODUCT_DESC"] + " " + size;
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
exports.getCoupon = function(gbn, callback)
{
    var inputdata = "params={'gbn':'" + gbn + "'}";
    var target = "API-308.phk";

    APICall(inputdata, target, function(err, result){
        var output = JSON.parse(result);
        if(err) console.log(err);

        if(output === false || output["RESULT"] === false){
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
exports.getReceipData = function(nMenu, selectedMenu, qty, ClassID, SizeID, BaseID, ProductID, selectedMenuPrice,
                                 address, price, discountValue, couponName, couponValue, fmcUse, fmcAmount, orderType, shopName, callback)
{
    var order_Array = new Array();
    var result = new Object();

    var nPrice = Number(price);
    var nDiscountValue = Number(discountValue);
    var nFmcAmount = Number(fmcAmount);

    for(var i = 0; i < nMenu; i++) {
        var order_Object = new Object();

        order_Object.title = selectedMenu[i];
        order_Object.quantity = qty[i];
        order_Object.price = Number(selectedMenuPrice[i]);
        order_Object.currency = "KRW";
        if(ClassID[i] == "P")
        {
            order_Object.image_url = "http://akamai.pizzahut.co.kr/IPizzahut/mobile/menu/pizza/MENU_IMG_"
                + ClassID[i] + "_" + BaseID[i] + "_" + ProductID[i] + ".png";


        }else if(ClassID[i] == "SB"){
            order_Object.image_url = "http://cdn.pizzahut.co.kr/IPizzahut/mobile/menu/drink/MENU_IMG_"
                + ClassID[i] + "__" + ProductID[i] + "_"+ SizeID[i] + ".png";
        }else{
            order_Object.image_url = "http://cdn.pizzahut.co.kr/reno_pizzahut/images/products/side/"
                + ClassID[i] + "_" + BaseID[i] + "_" + SizeID[i] + "_" + ProductID[i] + ".jpg";
        }

        order_Array.push(order_Object);
    }
    console.log(order_Array);
    result.order_contents = order_Array;

    var address_object = new Object();
    var addr = address;
    var tmp = " ";

    console.log(orderType + ":getReciept!!!");

    address_object.postal_code = "08912";
    if(orderType == "2")        //배달
    {
        tmp = getAddress(addr);
        addr = addr.substring(addr.indexOf(" ")+1);
        address_object.city = "[배달] " + tmp;

        tmp = getAddress(addr);
        addr = addr.substring(addr.indexOf(" ")+1);
        address_object.state = tmp;

        tmp = getAddress(addr);
        addr = addr.substring(addr.indexOf(" ")+1);
        address_object.street_2 = tmp;
        address_object.street_1 = addr;

    }else{      //3: 포장
        console.log(orderType + ":getReciept!!!Who are you????");

        tmp = getAddress(addr);
        addr = addr.substring(addr.indexOf(" ")+1);
        address_object.city = "[포장] " + tmp;

        tmp = getAddress(addr);
        addr = addr.substring(addr.indexOf(" ")+1);
        address_object.state = tmp;

        addr = addr.substring(addr.indexOf(" ")+1);
        address_object.street_2 = addr;
        address_object.street_1 = shopName;
    }
    address_object.country = "KR";

    result.address_contents = address_object;

    var cost_object = new Object();
    var sale_array = new Array();
    var sale_object = new Object();

    cost_object.subtotal = nPrice;

    if(couponName != "")
    {
        cost_object.total_cost = nPrice - nDiscountValue;

        var sale_object = new Object();
        sale_object.name = couponName;
        sale_object.amount = (-nDiscountValue);
        sale_array.push(sale_object);
    }

    if(fmcUse =='2')
    {
        cost_object.total_cost = cost_object.total_cost - nFmcAmount;
        sale_object = new Object();
        sale_object.name = "멤버십 할인";
        sale_object.amount = (- nFmcAmount);
        sale_array.push(sale_object);
    }

    result.total = cost_object;
    result.sale_contents = sale_array;

    console.log(JSON.stringify(result));

    callback(null, result);
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
exports.numberWithCommas = function(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
            callback(error, false);
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
    }else if(state == "3")
    {
        return "토핑중";
    }else if(state == "4")
    {
        return "제조중";
    }else if(state == "5")
    {
        return "배달 중";
    }else{      //에러
        return "에러-문의요망";
    }
}
function getAddress(addr)
{
    if(addr === undefined || addr == "" || addr == " ")
    {
        return "_";
    }
    var tmp = addr.substring(0, addr.indexOf(" "));

    return tmp;
}
var isEmpty = function(value)
{
    if( value == "" || value == null || value == undefined || ( value != null && typeof value == "object" && !Object.keys(value).length ) )
    {
        return true
    }else{
        return false
    }
};