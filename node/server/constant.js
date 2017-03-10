function define(name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

define("PI", 3.14);
define("main_menu", "1. 신제품세트\n2. 인기메뉴\n3. 리치골드\n4. 치즈크러스트\n5. 팬\n6. 더맛있는피자\n7. 트리플박스\n8. 와우세븐박스\n9. 사이드\n10. 음료\n11. 기타\n100. 종료\n목록에서 번호를 입력해 주십시오.");
define("thank", "이용해주셔서 감사합니다.");