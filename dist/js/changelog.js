/*! (c) Philipp König under GPL-3.0 */
(e=>{"use strict";window.changelog=function(){this.opts={elm:{body:e("body"),title:e("head > title"),infobox:e("section.infobox"),close:e("a.close"),showChangelog:e("a.showChangelog")},classes:{visible:"visible",flipped:"flipped",initLoading:"initLoading"},manifest:chrome.runtime.getManifest()},this.run=(()=>{t(),this.helper.model.init().then(()=>this.helper.i18n.init()).then(()=>{this.helper.font.init(),this.helper.stylesheet.init(),this.helper.stylesheet.addStylesheets(["changelog"],e(document)),this.helper.i18n.parseHtml(document),this.opts.elm.title.text(this.opts.elm.title.text()+" - "+this.helper.i18n.get("extension_name")),i(),this.opts.elm.infobox.addClass(this.opts.classes.visible),this.helper.model.call("trackPageView",{page:"/changelog"}),setTimeout(()=>{this.opts.elm.body.removeClass(this.opts.classes.initLoading)},100)})});let t=()=>{this.helper={i18n:new window.I18nHelper(this),font:new window.FontHelper(this),stylesheet:new window.StylesheetHelper(this),model:new window.ModelHelper(this)}},i=()=>{this.opts.elm.close.on("click",e=>{e.preventDefault(),window.close()}),this.opts.elm.showChangelog.on("click",e=>{e.preventDefault(),this.helper.model.call("trackEvent",{category:"changelog",action:"view",label:"view"}),this.opts.elm.infobox.addClass(this.opts.classes.flipped)}),e("section.infobox ul.changelog + a").on("click",()=>{location.href=chrome.extension.getURL("html/intro.html")})}},(new window.changelog).run()})(jsu);