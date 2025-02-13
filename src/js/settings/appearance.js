($ => {
    "use strict";

    $.AppearanceHelper = function (s) {

        const previews = {
            sidebar: {template: "sidebar", styles: ["sidebar"]},
            general: {template: "sidebar", styles: ["sidebar"]},
            overlay: {template: "overlay", styles: ["overlay"]},
            indicator: {template: "indicator", styles: ["contentBase", "content"]}
        };

        const presets = {
            sidebarHeaderHeight: {xs: 32, s: 36, l: 55},
            bookmarksFontSize: {xs: 11, s: 12, l: 16},
            bookmarksLineHeight: {xs: 20, s: 26, l: 45},
            sidebarWidth: {xs: 250, s: 300, l: 400},
            bookmarksDirIndentation: {xs: 20, s: 22, l: 30},
            bookmarksHorizontalPadding: {xs: 6, s: 10, l: 18},
            bookmarksIconSize: {xs: 12, s: 14, l: 18},
            directoriesIconSize: {xs: 12, s: 14, l: 18},
            scrollBarWidth: {xs: 10, s: 11, l: 12},
            tooltipFontSize: {xs: 9, s: 9, l: 12}
        };

        let lastTooltipChange = null;
        let tooltipTimeout = null;

        /**
         * Initialises the appearance settings
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                initPreviews().then(() => {
                    ["darkMode", "directoryArrows"].forEach((field) => {
                        let checked = false;
                        if (s.helper.model.getData("a/" + field) === true) {
                            s.elm.checkbox[field].trigger("click");
                            checked = true;
                        }
                        s.elm.checkbox[field].children("input").data("initial", checked);
                    });

                    if (s.helper.model.getUserType() !== "default") {
                        const customCss = s.helper.model.getData("u/customCss");
                        s.elm.textarea.customCss[0].value = customCss;
                        s.elm.textarea.customCss.data("initial", customCss);
                        s.elm.textarea.customCss.attr("placeholder", "section#sidebar {\n   ...\n}");
                        s.elm.textarea.customCss.parent().append("<span>" + s.helper.i18n.get("settings_not_synced") + "</span>");
                    } else {
                        s.elm.textarea.customCss.addClass($.cl.settings.inactive);
                        s.addNoPremiumText(s.elm.textarea.customCss.parent());
                    }

                    const styles = s.helper.model.getData("a/styles");

                    Object.entries(styles).forEach(([key, value]) => {
                        if (s.elm.range[key]) {
                            s.elm.range[key][0].value = value.replace("px", "");
                            s.elm.range[key].data("initial", value.replace("px", ""));
                            s.elm.range[key].trigger("change");
                        } else if (s.elm.color[key]) {
                            if (key === "iconColor" && value === "auto") { // since 'auto' isn't a valid color for the picker, we choose the default icon color for the light OS preference as predefined color
                                value = $.opts.defaultColors.icon.forLight;
                                s.elm.select.iconColorType[0].value = "auto";
                            }

                            changeColorValue(s.elm.color[key], value);
                            s.elm.color[key].data("initial", s.elm.color[key][0].value);
                        } else if (s.elm.select[key]) {
                            if (key === "fontFamily" && s.elm.select[key].children("option[value='" + value + "']").length() === 0) {
                                value = "default";
                            }

                            s.elm.select[key][0].value = value;
                            s.elm.select[key].data("initial", value);
                        } else if (s.elm.radio[key]) {
                            s.elm.radio[key][0].value = value;
                            s.elm.radio[key].trigger("change");
                            s.elm.radio[key].data("initial", value);
                        }
                    });

                    initEvents();

                    $.delay(100).then(() => {
                        updateAllPreviewStyles();
                        $(window).trigger("resize");
                        resolve();
                    });
                });
            });
        };

        /**
         * Saves the appearance settings
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                const newConfig = getCurrentConfig();

                chrome.storage.sync.get(["appearance"], (conf) => {
                    conf.appearance = conf.appearance || {};

                    Object.entries(newConfig.appearance).forEach(([key, val]) => {
                        conf.appearance[key] = val;
                    });

                    chrome.storage.sync.set({appearance: conf.appearance}, () => {
                        chrome.storage.local.get(["utility"], (obj) => {
                            const utility = obj.utility || {};
                            utility.customCss = newConfig.utility.customCss;

                            chrome.storage.local.set({utility: utility}, () => {
                                resolve();
                            });
                        });
                    });
                });
            });
        };

        /**
         * Changes the value of the color picker
         *
         * @param elm
         * @param value
         */
        const changeColorValue = (elm, value) => {
            const picker = elm.data("picker");
            if (picker) {
                picker.setColor(value);
            }
        };

        /**
         * Updates all previews
         */
        const updateAllPreviewStyles = () => {
            Object.keys(s.elm.preview).forEach((key) => {
                updatePreviewStyle(key);
            });
        };

        /**
         * Updates the given preview
         *
         * @param key
         */
        const updatePreviewStyle = (key) => {
            const config = getCurrentConfig();

            if (s.elm.preview[key]) {
                s.elm.preview[key].find("head > style").remove();

                if (config.appearance.styles.fontFamily === "default") {
                    const fontInfo = s.helper.font.getDefaultFontInfo();
                    config.appearance.styles.fontFamily = fontInfo.name;
                }

                Object.assign(config.appearance.styles, s.helper.font.getFontWeights(config.appearance.styles.fontFamily));

                let css = previews[key].css;
                css += config.utility.customCss;

                Object.keys(config.appearance.styles).forEach((key) => {
                    css = css.replace(new RegExp("\"?%" + key + "\"?", "g"), config.appearance.styles[key]);
                });

                s.elm.preview[key].find("[" + $.attr.style + "]").forEach((elm) => {
                    let style = $(elm).attr($.attr.style);
                    Object.keys(config.appearance.styles).forEach((key) => {
                        style = style.replace(new RegExp("\"?%" + key + "\"?", "g"), config.appearance.styles[key]);
                    });
                    elm.style.cssText = style;
                });

                s.elm.preview[key].find("[" + $.attr.settings.hideOnFalse + "]").forEach((elm) => {
                    const attr = $(elm).attr($.attr.settings.hideOnFalse);

                    if (typeof config.appearance[attr] === "undefined" || config.appearance[attr] === false) {
                        $(elm).css("display", "none");
                    } else {
                        $(elm).css("display", "block");
                    }
                });

                s.elm.preview[key].find("head").append("<style>" + css + "</style>");

                if (config.appearance.darkMode) {
                    s.elm.preview[key].find("body").addClass($.cl.page.darkMode);
                } else {
                    s.elm.preview[key].find("body").removeClass($.cl.page.darkMode);
                }

                if (config.appearance.directoryArrows) {
                    s.elm.preview[key].find("div#bookmarkBox a.dir").addClass($.cl.sidebar.dirArrow);
                } else {
                    s.elm.preview[key].find("div#bookmarkBox a.dir").removeClass($.cl.sidebar.dirArrow);
                }

                updatePreviewTooltip(s.elm.preview[key]);
                updatePreviewSidebarHeader(s.elm.preview[key]);
                updatePreviewIndicator(s.elm.preview[key]);
            } else if (key === "icon") {
                s.helper.model.call("updateIcon", {
                    name: config.appearance.styles.iconShape,
                    color: s.elm.select.iconColorType[0].value === "auto" ? "auto" : config.appearance.styles.iconColor,
                    onlyCurrentTab: true
                });
            }
        };

        /**
         * Updates the preview of the indicator
         *
         * @param {jsu} preview
         */
        const updatePreviewIndicator = (preview) => {
            const indicator = preview.find("div#blockbyte-bs-indicator");

            if (indicator.length() > 0) {
                const height = +s.elm.range.toggleArea_height[0].value;
                const top = +s.elm.range.toggleArea_top[0].value;

                indicator.css({
                    height: height + "%",
                    top: top + "%"
                });

                if (height === 100) {
                    indicator.addClass($.cl.settings.appearance.preview.fullHeight);
                } else {
                    indicator.removeClass($.cl.settings.appearance.preview.fullHeight);
                }
            }
        };

        /**
         * Updates the preview of the sidebar header
         *
         * @param {jsu} preview
         */
        const updatePreviewSidebarHeader = (preview) => {
            const sidebar = preview.find("section#sidebar");

            if (sidebar.length() > 0) {
                const sidebarHeader = sidebar.find("> header");
                sidebarHeader.find("> h1").removeClass($.cl.hidden);
                sidebarHeader.find("> h1 > span").removeClass($.cl.hidden);

                ["label", "amount"].forEach((type) => {
                    let lastOffset = null;

                    sidebarHeader.children("a").forEach((icon) => {
                        if (lastOffset === null) {
                            lastOffset = icon.offsetTop;
                        } else if (lastOffset !== icon.offsetTop || sidebarHeader.find("> h1")[0].offsetTop === 0) { // header elements  are not in one line anymore -> header to small -> remove some markup
                            if (type === "label") {
                                sidebarHeader.find("> h1 > span").addClass($.cl.hidden);
                            } else if (type === "amount") {
                                sidebarHeader.find("> h1").addClass($.cl.hidden);
                            }
                            return false;
                        }
                    });
                });
            }
        };

        /**
         * Updates the preview of the tooltip,
         * shows the tooltip if the last change was within the last 2s
         *
         * @param {jsu} preview
         */
        const updatePreviewTooltip = (preview) => {
            const tooltip = preview.find("div.tooltip");
            const entry = preview.find("li > a.hover");

            if (tooltip.length() > 0 && entry.length() > 0) {
                if (+new Date() - lastTooltipChange < 2000) {
                    const rect = entry[0].getBoundingClientRect();
                    tooltip.addClass($.cl.visible);

                    let left = rect.x - tooltip[0].offsetWidth;
                    if (s.helper.i18n.isRtl()) {
                        left = rect.x + entry[0].offsetWidth;
                    }

                    tooltip.css({
                        top: (rect.y + entry.realHeight() / 2 - tooltip.realHeight() / 2) + "px",
                        left: left + "px"
                    });
                } else {
                    tooltip.removeClass($.cl.visible);
                }
            }
        };

        /**
         * Returns the current values of the appearance configuration
         *
         * @returns object
         */
        const getCurrentConfig = () => {
            const ret = {
                utility: {
                    customCss: s.helper.model.getUserType() === "default" ? "" : s.elm.textarea.customCss[0].value.replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
                },
                appearance: {
                    darkMode: s.helper.checkbox.isChecked(s.elm.checkbox.darkMode),
                    directoryArrows: s.helper.checkbox.isChecked(s.elm.checkbox.directoryArrows),
                    highContrast: false,
                    showIndicator: true,
                    showIndicatorIcon: true,
                    showBookmarkIcons: true,
                    showDirectoryIcons: true,
                    styles: {}
                }
            };

            const styles = s.helper.model.getData("a/styles");

            Object.keys(styles).forEach((key) => {
                if (s.elm.range[key]) {
                    ret.appearance.styles[key] = s.elm.range[key][0].value + "px";
                } else if (s.elm.color[key]) {
                    const colorValue = getColorValue(key, s.elm.color[key][0].value);
                    ret.appearance.styles[key] = colorValue.color;

                    if (key === "colorScheme") {
                        const lum = colorValue.luminance ? colorValue.luminance : 0;
                        ret.appearance.styles.foregroundColor = $.opts.defaultColors.foregroundColor[lum > 170 ? "dark" : "light"];

                        if (lum > 215) {
                            ret.appearance.highContrast = true;
                        }
                    }
                } else if (s.elm.select[key]) {
                    ret.appearance.styles[key] = s.elm.select[key][0].value;
                } else if (s.elm.radio[key]) {
                    ret.appearance.styles[key] = s.elm.radio[key][0].value;
                }
            });

            Object.entries({
                indicatorWidth: "showIndicator",
                indicatorIconSize: "showIndicatorIcon",
                bookmarksIconSize: "showBookmarkIcons",
                directoriesIconSize: "showDirectoryIcons"
            }).forEach(([field, attr]) => {
                if (parseInt(ret.appearance.styles[field]) === 0) {
                    ret.appearance[attr] = false;
                }
            });

            if (s.elm.select.iconColorType[0].value === "auto") {
                ret.appearance.styles.iconColor = "auto";
            }

            return ret;
        };

        /**
         * Returns information about the color of the given field
         *
         * @param {string} field
         * @param {string} val
         * @returns {object}
         */
        const getColorValue = (field, val) => {
            let luminance = null;
            const elm = s.elm.color[field];
            const picker = elm.data("picker");

            if (picker) {
                const colorObj = picker.getColorObj();
                if (colorObj.a === 0) {
                    val = "transparent";
                }
                luminance = 0.299 * colorObj.r + 0.587 * colorObj.g + 0.114 * colorObj.b; // based on https://www.w3.org/TR/AERT#color-contrast
            }

            return {
                color: val,
                luminance: luminance
            };
        };

        /**
         * Initialises the previews
         *
         * @returns {Promise}
         */
        const initPreviews = () => {
            return new Promise((resolve) => {
                let previewsLoaded = 0;
                const previewAmount = Object.keys(previews).length;

                Object.keys(previews).forEach((key) => {
                    previews[key].css = "";

                    s.elm.preview[key] = $("<iframe />")
                        .attr($.attr.settings.appearance, key)
                        .appendTo(s.elm.body);

                    $.xhr(chrome.extension.getURL("html/template/" + previews[key].template + ".html")).then((xhr) => {
                        if (xhr && xhr.responseText) {
                            let html = xhr.responseText;
                            html = html.replace(/__DATE__CREATED__/g, s.helper.i18n.getLocaleDate(new Date("2016-11-25")));
                            html = html.replace(/__POSITION__/g, s.helper.i18n.isRtl() ? "left" : "right");

                            const previewBody = s.elm.preview[key].find("body");
                            previewBody.html(html);
                            previewBody.parent("html").attr("dir", s.helper.i18n.isRtl() ? "rtl" : "ltr");

                            s.helper.i18n.parseHtml(s.elm.preview[key]);
                            s.helper.font.addStylesheet(s.elm.preview[key]);

                            previewsLoaded++;

                            if (previewsLoaded === previewAmount) {
                                resolve();
                            }
                        }
                    });

                    previews[key].styles.forEach((stylesheet) => {
                        $.xhr(chrome.extension.getURL("css/" + stylesheet + ".css")).then((xhr) => {
                            if (xhr && xhr.responseText) {
                                previews[key].css += xhr.responseText;
                            }
                        });
                    });
                });
            });
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            s.elm.appearance.presetWrapper.children("a").on("click", (e) => {
                const type = $(e.currentTarget).attr($.attr.type);
                const defaults = s.helper.model.getData("a/styles", true);

                Object.entries(presets).forEach(([key, values]) => {
                    if (values[type]) {
                        s.elm.range[key][0].value = values[type];
                    } else {
                        s.elm.range[key][0].value = defaults[key].replace("px", "");
                    }

                    s.elm.range[key].trigger("change");
                });
            });

            s.elm.select.iconColorType.on("change, input", (e) => { //
                if (e.currentTarget.value === "auto") {
                    s.elm.appearance.iconColorWrapper.addClass($.cl.hidden);
                } else {
                    s.elm.appearance.iconColorWrapper.removeClass($.cl.hidden);
                }

                updatePreviewStyle("icon");
            }).trigger("input");


            s.elm.range.tooltipFontSize.on("change, input", () => { // show tooltip in preview for 2s when changing the font size
                lastTooltipChange = +new Date();
                if (tooltipTimeout) {
                    clearTimeout(tooltipTimeout);
                }

                tooltipTimeout = setTimeout(() => {
                    updatePreviewStyle("sidebar");
                }, 2001);
            });

            s.elm.appearance.content.find("input, textarea, select").on("change input", (e) => {
                const elm = $(e.currentTarget);
                const initialVal = elm.data("initial");
                let val = e.currentTarget.value;

                if (typeof initialVal !== "undefined") {

                    if (elm.attr("type") === "checkbox") {
                        val = e.currentTarget.checked;

                        if ($(elm).parent()[0] === s.elm.checkbox.darkMode[0]) { // darkmode checkbox -> change some other colors, too
                            const scheme = {
                                "new": val ? "dark" : "light",
                                "old": val ? "light" : "dark"
                            };

                            const textColor = $.opts.defaultColors.textColor[scheme["new"]];
                            changeColorValue(s.elm.color.textColor, textColor);
                            changeColorValue(s.elm.color.bookmarksDirColor, textColor);

                            ["sidebarMaskColor", "colorScheme", "hoverColor"].forEach((colorName) => {
                                if (colorName === "hoverColor" || s.elm.color[colorName][0].value === $.opts.defaultColors[colorName][scheme.old]) { // only change, if it was the default color before
                                    const color = $.opts.defaultColors[colorName][scheme["new"]];
                                    changeColorValue(s.elm.color[colorName], color);
                                }
                            });
                        }
                    }

                    const box = $(e.currentTarget).parents("div." + $.cl.settings.box).eq(0);
                    if (val !== initialVal) {
                        if (box.children("a." + $.cl.settings.revert).length() === 0) {
                            $("<a href='#' />").addClass($.cl.settings.revert).data("elm", box).appendTo(box);
                        }
                    } else {
                        box.children("a." + $.cl.settings.revert).remove();
                    }

                    const path = s.helper.menu.getPath();
                    updatePreviewStyle(path[1]);
                }
            });

            s.elm.appearance.content.on("click", "a." + $.cl.settings.revert, (e) => { // revert the changes of the specific field
                e.preventDefault();
                $(e.currentTarget).parent("div." + $.cl.settings.box).find("input, select").forEach((elm) => {
                    const elmObj = $(elm);
                    const value = elmObj.data("initial");

                    if (elmObj.data("picker")) {
                        changeColorValue(elmObj, value);
                    } else if (typeof value !== "undefined") {
                        if (elmObj.attr("type") === "checkbox" && typeof value === "boolean") { // revert checkbox
                            if (elm.checked !== value) { // trigger click if value has changed
                                elmObj.parent("div").trigger("click");
                            }
                        } else { // revert any other field
                            elm.value = value;
                            elmObj.trigger("change");
                        }
                    }
                });
            });

            $(document).on($.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[0] === "appearance") {
                    updatePreviewStyle(e.detail.path[1]);
                }
            });
        };
    };

})(jsu);