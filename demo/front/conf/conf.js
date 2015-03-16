(function(seajs, seacss) {
    // set base path
    var base = "../../../";

    seajs.config({
        base: base,
        alias: {
            "zepto": "../../../../lib/cmd/zeptojs/1.1.2/zepto.src.js",
            "ipick.alert": "widget/ipick.alert/js/ipick.alert.js"
        },
        map: "{{jsversion}}",
        debug: false
    });

    // To set css files
    seacss.config({
        base: base,
        alias: {
            'reset': 'app/common/css/reset.css',
            'common-applinks': 'app/common/css/common-applinks.css',
            'swiper': 'lib/cmd/swiper/2.7.0/idangerous.swiper.css'
        },
        debug: true,
        map: "{{cssversion}}"
    })
})(seajs, seacss);