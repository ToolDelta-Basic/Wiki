import {
    defineConfig
} from "vitepress";
import pkg from "../../package.json";
// https://vitepress.dev/reference/site-config


export default defineConfig({
    lastUpdated: true,
    lang: "zh-CN",
    title: "ToolDelta Wiki",
    description: "ToolDelta 文档",
    ignoreDeadLinks: true,
    cleanUrls: true,
    head: [
        ["link", {
            rel: "icon",
            href: "/ico.svg"
        }],
        ["script", {
            async: "",
            src: "/m.js"
        }],
        ["script", {
            async: "true",
            src: "/cursor.js"
        }],
    ],

    sitemap: {
        hostname: "https://wiki.tooldelta.top",
    },

    themeConfig: {
        logo: { src: '/ico.svg', width: 24, height: 24 },
        notFound: {
            code: "404",
            title: "页面没有找到",
            quote: "这里还没有对应的文档。你可以返回首页，或从导航栏继续查找 ToolDelta 的使用与插件开发内容。",
            linkLabel: "返回 ToolDelta Wiki 首页",
            linkText: "返回首页",
        },
        search: {
            provider: "local",
            options: {
                _render(src, env, md) {
                    const html = md.render(src, env);
                    if (env.frontmatter?.search === false) {
                        return "";
                    }
                    return html;
                },
            },
        },
        // https://vitepress.dev/reference/default-theme-config
        // logo: { src: "/logo.ico", width: 23, height: 15 },
        editLink: {
            pattern: "https://github.com/ToolDelta-Basic/Wiki/tree/main/docs/:path",
        },

        nav: [
            {
                text: "使用",
                link: "/use"
            },
            {
                text: "插件市场",
                link: "/PluginMarket"
            },
            {
                text: "插件开发指南",
                link: "/plugin-dev"
            },
            {
                text: "协助文档维护",
                link: "/help"
            },
            {
                text: "关于",
                items: [{
                    text: "关于我们",
                    link: "/intro"
                },
                {
                    text: "联系我们",
                    link: "/contact"
                },
                ],
            },
        ],

        sidebar: {
            "/use": [
                {
                    text: "👋 欢迎来到 ToolDelta Wiki",
                    link: "./"
                },
                {
                    text: "🌹 FAQ",
                    link: "./FAQ"
                },
                {
                    text: "使用教程",
                    collapsed: true,
                    items: [
                        {
                            text: "📖 使用教程",
                            link: "./learn_use"
                        },
                        {
                            text: "🧊 插件市场",
                            link: "./plugin_market"
                        },
                    ],
                }
            ],
            "/plugin-dev": [
                {
                    text: "✨ 公用开发接口",
                    collapsed: true,
                    items: [{
                        text: "💻️ 系统框架与控制台命令",
                        link: "/plugin-dev/api/框架与控制台命令"
                    },
                    {
                        text: "🎮️ 高级游戏交互接口",
                        link: "/plugin-dev/api/高级游戏交互接口"
                    },
                    {
                        text: "🔧 实用方法",
                        link: "/plugin-dev/api/实用方法"
                    },
                    {
                        text: "📚 游戏文本翻译",
                        link: "/plugin-dev/api/游戏文本翻译"
                    },
                    {
                        text: "🎨 控制台输出管理",
                        link: "/plugin-dev/api/控制台输出管理"
                    },
                    {
                        text: "📄 配置文件",
                        link: "/plugin-dev/api/配置文件"
                    },
                    {
                        text: "💾 快速json文件读写",
                        link: "/plugin-dev/api/缓存式json文件"
                    },
                    {
                        text: "👨‍👩‍👧‍👧 玩家信息",
                        link: "/plugin-dev/api/玩家信息"
                    },
                    {
                        text: "👈 指令和数据包发送等",
                        link: "/plugin-dev/api/指令和数据包发送等"
                    },
                    {
                        text: "👂 数据包监听",
                        link: "/plugin-dev/api/数据包监听"
                    },
                    {
                        text: "🔌 各启动框架的额外接口",
                        collapsed: true,
                        items: [
                            {
                                text: "NeOmega 接入点",
                                link: "/plugin-dev/api/spec-neomega"
                            },
                        ],
                    },
                    {
                        text: "👑 官方前置插件的接口",
                        collapsed: true,
                        items: [{
                            text: "介绍",
                            link: "/plugin-dev/api/pref-plugins"
                        },
                        {
                            text: "聊天栏菜单",
                            link: "/plugin-dev/api/pref-plugins/聊天栏菜单"
                        },
                        {
                            text: "世界交互",
                            link: "/plugin-dev/api/pref-plugins/世界交互"
                        },
                        {
                            text: "玩家 XUID 获取",
                            link: "/plugin-dev/api/pref-plugins/玩家XUID获取"
                        },
                        {
                            text: "tps 计算器",
                            link: "/plugin-dev/api/pref-plugins/tps计算器"
                        },
                        {
                            text: "MIDI 播放器",
                            link: "/plugin-dev/api/pref-plugins/MIDI播放器"
                        },]
                    },
                    ],
                },
                {
                    text: "✨ 标准插件开发指南",
                    collapsed: true,
                    items: [{
                        text: "创建插件",
                        link: "/plugin-dev/class-plugin/创建插件"
                    },
                    {
                        text: "编写插件主体",
                        link: "/plugin-dev/class-plugin/插件主体"
                    },
                    {
                        text: "跨插件调用",
                        link: "/plugin-dev/class-plugin/前置插件"
                    },
                    {
                        text: "插件的数据文件",
                        link: "/plugin-dev/class-plugin/插件数据"
                    },
                    {
                        text: "插件编写实战-商店系统",
                        link: "/plugin-dev/class-plugin/demo/示例插件.md"
                    }],
                },
                // {
                //     text: "额外功能",
                //     items: [{
                //         text: "ToolDelta中文编程",
                //         items: [{
                //             text: "介绍",
                //             link: "/plugin-dev/api/extras/Z-Basic/intro"
                //         },
                //         {
                //             text: "入门ZBasic",
                //             link: "/plugin-dev/api/extras/Z-Basic/入门ZBasic"
                //         },
                //         {
                //             text: "指令语句",
                //             link: "/plugin-dev/api/extras/Z-Basic/所有指令语句"
                //         },
                //         {
                //             text: "内置函数",
                //             link: "/plugin-dev/api/extras/Z-Basic/内置函数"
                //         },
                //         {
                //             text: "扩展函数&语法",
                //             link: "/plugin-dev/api/extras/Z-Basic/扩展功能"
                //         }],
                //     }],
                // },
            ],
        },

        socialLinks: [{
            icon: "github",
            link: "https://github.com/ToolDelta/ToolDelta"
        },],
        externalLinkIcon: true, // 展示站外链接箭头 ↗
        footer: {
            message: `<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">桂ICP备2025061689号-1</a> | 文档版本 ${pkg.version}`,
            copyright: `版权所有 © 2023-${new Date().getFullYear()} ToolDelta`,
        },
        docFooter: {
            prev: "上一页",
            next: "下一页",
        },
        langMenuLabel: "多语言",
        returnToTopLabel: "回到顶部",
        sidebarMenuLabel: "菜单",
        darkModeSwitchLabel: "主题",
        lightModeSwitchTitle: "切换到浅色模式",
        darkModeSwitchTitle: "切换到深色模式",
    },
    markdown: {
        lineNumbers: true,
        image: {
            // 图片懒加载
            lazyLoading: true,
        },
        container: {
            tipLabel: "提示",
            warningLabel: "警告",
            dangerLabel: "危险",
            infoLabel: "信息",
            detailsLabel: "详细信息",
        },
    },
});
