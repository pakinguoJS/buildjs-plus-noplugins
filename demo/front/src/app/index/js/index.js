define(function(require, exports, module){
    require('zepto');

    var IPICKAlert = require('ipick.alert');
    $('#click').click(function(){
    	IPICKAlert.alert("After click me!", "success");
    })
})