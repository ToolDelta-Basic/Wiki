# ToolDelta - 用户操作手册

## ToolDelta 站点漫游指南

[[toc]]

## 下载 ToolDelta

| [Windows 用户点我](https://tdload.tblstudio.cn/github.com/ToolDelta/ToolDelta/releases/download/0.5.11/ToolDelta-windows.exe) | [Linux 用户点我](https://tdload.tblstudio.cn/github.com/ToolDelta/ToolDelta/releases/download/0.5.11/ToolDelta-linux) |
| -- | -- |

安卓手机用户请使用 Termux 运行这段命令：

```bash
apt-get update -y --force-yes && apt-get upgrade -y --force-yes && curl -sSL  https://tdload.tblstudio.cn/raw.githubusercontent.com/ToolDelta/ToolDelta/main/install.sh | bash
```

## ToolDelta，启动！

Windows: 双击所获得的 exe 文件即可。
Linux: 输入 `./ToolDelta` 即可。

将会出现类似如下界面：
```
[15:00]  加载  ToolDelta 正在启动..
[15:00]  加载  ToolDelta - Panel Embed By SuperScript
[15:00]  加载  ToolDelta v 0.5.9
[15:00]  加载  ToolDelta - Panel 已启动
[15:03]  输入  请输入租赁服号:
```

这时候输入**租赁服号**，回车键之后再输入**密码**，输入之后就不用手动填写租赁服登录配置了。
```
[15:00]  信息  请选择登录方法:
```
请注意，ToolDelta 需要使用机器人账号登录租赁服，所以你在这之前可能需要找到任意一个验证服务器注册 (或购买) 账号。

这里使用的是 **FastBuilder 的用户中心** [点我前往用户中心→](https://user.fastbuilder.pro)

接下来出现的是选择界面：
```
[15:05]  信息   1 - FastBuilder External 模式 (经典模式) (已停止维护, 无法适应新版本租赁服!)
[15:05]  信息   2 - NeOmega 框架 (NeOmega模式, 租赁服适应性强)
[15:05]  信息   3 - NeOmega 框架 (NeOmegay连接模式, 需要先启动对应的neOmega接入点)
```
如果您不很熟悉 ToolDelta，请选择 2 (输入 2 然后回车)。

接下来 ToolDelta 会下载一些运行所需要的文件，等待下载即可。下载过程中若出现了问题，请重新运行 ToolDelta。
如果数次下载都出现了问题，请 [点击这里提交 Issue](https://github.com/ToolDelta/ToolDelta/issues)

因为你目前还没有安装任何插件，所以会出现这么一行输出：
```
[15:06]  成功  成功载入 0 个组合式插件, 0 个注入式插件, 0 个DotCS插件
```

没关系！你以后可以通过 **插件市场** 或者自己下载插件来安装更多的插件功能。
之后等待机器人进入服务器，直到出现这样的输出：

```
[15:06]  成功  初始化完成, 在线玩家: FSkyBlueBot, 机器人ID: FSkyBlueBot
[15:06]  信息  在控制台输入 help / ? 可查看控制台命令
[15:06]  成功  NEOMEGA 接入已就绪
[15:06]  信息  [!] ToolDelta Enabled!
[15:06]  信息  [!] 北京时间 15 : 33
[15:06]  信息  [!] 输入 .help 获取更多帮助哦
```
恭喜你，你的机器人成功进服并运行起来了！现在，你可以在控制台输入 `help` 看看你有什么可用的命令提示 (鉴于你还没有安装插件，所以在游戏里输入 `.help`什么都不会发生)

## 所有插件全部启动启动！ {#安装插件}

然而，让机器人空转可不是什么好主意。我们需要一些让 ToolDelta 活跃起来的东西？

啊？找不到？没关系，ToolDelta 内置的插件市场提供了许多对新人友好的插件。刚才你输入 `help` 的时候发现什么了？
```
[15:06]  信息  以下是可选的菜单指令项:
[15:06]  信息   ...
[15:06]  信息   插件市场  ->  进入插件市场
```
这个插件市场该怎么用？不妨在控制台输入 **插件市场** 试试吧。
```
[15:12]  信息  ToolDelta插件市场 Official: 欢迎使用 ToolDelta 插件市场.
[15:12]  信息   1. 聊天栏菜单 v0.0.4 @SuperScript 组合式插件
[15:12]  信息   2. 控制台执行MCFB指令 v0.0.2 @SuperScript 组合式插件
[15:12]  信息   3. 库-基本组件API v0.0.1 @SuperScript 组合式插件
[15:12]  信息   4. 库-世界交互 v0.0.1 @SuperScript 组合式插件
[15:12]  信息   5. @玩家 v0.0.2 @wling 注入式插件
[15:12]  信息   6. SuperSoundMixer v0.0.1 @SuperScript/wling 注入式插件
[15:12]  信息   7. 井字棋 v0.0.1 @SuperScript/wling 注入式插件
[15:12]  信息   8. 清空末影箱 v0.0.1 @wling 注入式插件
[15:12]  信息  输入 +/- 翻页, 输入插件序号选择插件
[15:12]  输入  回车键继续上次操作, q 退出, 请输入:
```
**输入 + 或 - 可以进行向前或向后翻页的操作**，浏览你喜欢的插件。一般来说，较为常用和重要的插件会优先放在前面。
按照提示进行操作，选择插件之后可以查看详情，详情页输入 `Y` 即可自动下载该插件到对应文件夹，是不是很方便？
插件市场插件的前置插件不需要你手动下载，系统会自动下载好。

> 安装完插件之后，重启 ToolDelta 之后插件才会生效。

## 嗯······该下线了 {#关闭}

玩累了？或者你刚刚安装了喜欢的插件，需要先退出 ToolDelta？

- 优雅的做法：在控制台输入 `exit`，直到显示日志保存成功，ToolDelta 就退出了。
- ~~不优雅的做法：`Ctrl + C`，这样退出的风险极大，很可能没有保存好数据文件！~~

# 我有意见！

启动或者运行的时候遇到问题？
 - ToolDelta 的大多数异常报错通常会在控制台里显示原因和解决方法。
 - 若有你自己无法解决的问题，请在 QQ 群中告诉我们。
