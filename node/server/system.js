'use strict';

exports.confirm = function(text)
{
    if(text.includes("sp")|| text.includes("네") || text.includes("맞아") || text.includes("응") || text.includes("ㅇ") || text.includes("넹") || text.includes("얍") || text.includes("넵") || text.includes("예") || text.includes("d"))
    {
        return true;
    }else return false;
}
exports.order_confirm = function(num)
{
    var current_state = "배달 중";
    var shop = "가나다 매장(02-111-1111)"
    var content = "[주문번호:" + num + "]\n--- 제품 ---\nAAAAA\nBBBBB\nCCCCC\n금액:00000원\n[주문상태:"+ current_state + " ]\n[주문매장: " + shop + "]";
    return content;
}
exports.identify = function(num)
{
    return true;
}
exports.verification = function(num)
{
    return true;
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