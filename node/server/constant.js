function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

define("PI", 3.14);
define("main_menu", "1. 신제품세트\n2. 인기메뉴\n3. 리치골드\n4. 치즈크러스트\n5. 팬\n6. 더맛있는피자\n7. 트리플박스\n8. 와우세븐박스\n9. 사이드\n10. 음료\n11. 기타\n100. 종료\n목록에서 번호를 입력해 주십시오.");
define("thank", "이용해주셔서 감사합니다.");

define("RG", "리치골드");
define("MC", "치즈크러스트");
define("DR", "더맛있는피자");
define("TD", "더블박스");
define("P", "팬");
define("BB", "버거바이트");
define("MG","사이드박스 세트");
define("PA","사이드");
define("AP","사이드");
define("SA","사이드");
define("AB","사이드");
define("SU","사이드");

define("HE","M");       //sizeid
define("E","M");
define("TE","M");
define("M","M");
define("HL","L");
define("S","L");
define("L","L");
define("MB","10개");
define("PE","1.5L");
define("PF","0.5L");

define("SW","4조각");       //productid
define("FS","4조각");
define("FO","4조각");
define("TF","4조각");
define("SN","8조각");
define("KK","8조각");
define("WI","8조각");
define("TT","10조각");
