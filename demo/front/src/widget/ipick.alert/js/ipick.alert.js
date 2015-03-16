define(function(require, exports, module){
    require('zepto');
    require('../css/ipick.alert.css');

    console.log('ipick')

    function ipickAlert(){
        this.tpl = '<div class="ipick-alert-wrap">\
                    <div class="ipick-alert-main">\
                        <div id="ipickAlertIcon" class="ipick-alert-icon"></div>\
                        <div id="ipickAlertMsg" class="ipick-alert-msg"></div>\
                        <div id="ipickAlertOk" class="ipick-alert-ok"></div>\
                    </div>\
                </div>';
        this.icon = {
            empty: '',
            success: '<icon class="ipick-alert-icon-success"></icon>',
            fail: '<icon class="ipick-alert-icon-fail"></icon>'
        };
        this.ok = 'OK';
        this.delay = 3000;
        this.msg = 'Message is empty';
    }


    /**
    * 配置默认参数
    * @param   {object}  data
    * data主要包括两个属性：icon和delay，icon是弹出框上半部分显示的图标，默认是"success"对应的图标；delay是弹出框弹出后多少时间后消失，以毫秒为单位
    * data = {
    *     icon: {
    *          fail: '<icon class"..."></icon>'
    *     },
    *     delay: 5000
    * }
    */
    ipickAlert.prototype.config = function(data){
        if(!data){
            return;
        }
        $.extend(this.icon, data.icon);
        data.delay ? this.delay = data.delay : null;
        data.ok ? this.ok = data.ok : null;
    }


    /**
    * 弹出框主要调用接口
    * @param   {string}    msg     文本格式，不支持html
    * @param   {string}    type    图标类型，默认是success；其对应配置的字段属性
    */
    ipickAlert.prototype.alert = function(msg, type, use, usecallback){
        msg = msg || this.msg;
        type = type || 'empty';
        var $target = $(this.tpl);

        // Setting
        $target.find('#ipickAlertIcon').html(this.icon[type]);
        $target.find('#ipickAlertMsg').text(msg);
        use ? $target.find('#ipickAlertOk').text(this.ok) : $target.find('#ipickAlertOk').remove();

        // Render
        $target.appendTo($('body'));

        // hack
        var zoom = $('body').parent().css('zoom');

        $target.children().css({
            'margin-top': ($(window).height() - $target.children().height()) / 2 / (zoom ? zoom : 1) || 0
        });
        $target.css({
            'opacity': 1
        })

        // Clear
        if(use){
            $target.find('#ipickAlertOk').click(function(){
                $target.hide().remove();
                typeof usecallback === 'function' ? usecallback() : null;
            })
        }else{
            var i = setTimeout(function(){
                $target.hide().remove();
                clearTimeout(i);
            }, this.delay)
        }
    }

    module.exports = new ipickAlert();
})