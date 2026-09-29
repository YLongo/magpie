# magpie（个人维护分支）

个人维护分支：基于 [yetone/magpie](https://github.com/yetone/magpie)，随上游合并，中文 README，含本地定制。

一个地方选好每个 Agent 的模型：Codex 用 DeepSeek、Claude Code 用 Kimi、Gemini CLI 用 GLM，全在菜单栏完成。[usemagpie.ai](https://usemagpie.ai)

[![Discord](https://img.shields.io/badge/Discord-join%20the%20community-5865F2?logo=discord&logoColor=white)](https://discord.gg/vGSnD3ZKQF)

`magpie` 是一个单屏应用：列出你机器上的每个 AI Agent 及其当前模型。点一个值，挑一个模型，就这么简单。

它住在菜单栏：点图标弹出一个面板；同一界面也可以作为普通窗口打开（`magpie`，或托盘菜单里的 *Open magpie*），另有终端版（`magpie tui`）和纯 CLI。

```
  ◉ magpie

  ▸ Claude Code   claude-fable-5-1[1m]                        ~/.claude/settings.json
    Codex         gpt-6-astra   effort medium
    Gemini CLI    gemini-3.1-pro
    OpenCode      anthropic/claude-sonnet-5   small anthropic/claude-haiku-4-5
    MiMo Code     anthropic/claude-sonnet-5
    Pi            openrouter/z-ai/glm-5.2:batch
    Goose         anthropic/claude-sonnet-5
    Cursor        auto
    Copilot CLI   claude-fable-5

  ↑↓ agent  ·  ←→ 字段  ·  ↵ 修改  ·  s 保存 profile  ·  p profiles  ·  q 退出
```

- **一个小二进制。** 带桌面应用不超过 15 MB（通过 [Wails](https://wails.io) 使用系统 webview，零捆绑），纯终端构建 7 MB。macOS、Linux、Windows。
- **外科手术式改配置。** 只动你改的那一个键；`settings.json`、`config.toml`、`opencode.jsonc`、`config.yaml` 里的注释、顺序和缩进原样保留。写入都是原子的。
- **每个 Agent 一个端点。** magpie 跑一个本地网关，讲 OpenAI chat completions、OpenAI Responses 和 Anthropic Messages API，转发到模型所属的供应商。Codex、Claude Code、OpenCode 等全部指向 `http://127.0.0.1:3425/v1`，从同一个目录里挑模型；API 之间的翻译在 magpie 内完成，流式与工具调用都支持。
- **你的订阅，共享。** 登录 Claude Code、Codex（ChatGPT）或 Copilot，这个登录就成了一个供应商：其他所有 Agent 都能通过网关用它的模型，零拷贝、无需粘贴 key。
- **供应商只需一个字段。** 挑一个预设（Anthropic、OpenAI、Gemini、DeepSeek、Kimi、GLM、MiniMax、StepFun、Qwen、百度千帆 Token Plan、腾讯云 Token Plan、华为云 MaaS、火山方舟、Mistral、Groq、xAI、OpenRouter、Together、Fireworks、SiliconFlow、AiHubMix、302.AI、Ollama、LM Studio……），粘贴 key，完成。自定义供应商只需要名字和 base URL。magpie 绝不从 shell 环境变量读 key。
- **真实模型列表，零硬编码。** 有了 key，magpie 会问供应商它到底在卖哪些模型，就给那些；[models.dev](https://models.dev) 目录补齐名称、推理档位和无列表供应商的清单，过期自动后台刷新。可以选每个供应商暴露哪些模型，也可以全暴露——今早发布的模型，下次刷新就在选择器里。
- **Profiles。** 把所有 Agent 的当前设置快照成一个名字，一键整体切回。
- **真实 logo，无框架。** 纯 HTML 跑在系统 webview 上；品牌图标来自 [lobehub/icons](https://github.com/lobehub/lobe-icons)。

## Agents

| Agent        | 文件                              | 字段          |
| ------------ | --------------------------------- | --------------- |
| Claude Code  | `~/.claude/settings.json`         | provider、model、opus/sonnet/haiku/fable（经 magpie） |
| Claude Desktop | `~/Library/Application Support` 里的 `Claude/` + `Claude-3p/configLibrary/`（Windows `%LOCALAPPDATA%`、Linux `~/.config`） | provider（其第三方网关模式：Code 和 Cowork 走 magpie，无 Anthropic 登录；重启 Desktop 生效） |
| Codex        | `~/.codex/config.toml`            | provider、model、effort |
| Gemini CLI   | `~/.gemini/settings.json`、`~/.gemini/.env` | auth、model |
| OpenCode     | `~/.config/opencode/opencode.json(c)` | model、small |
| MiMo Code    | `~/.config/mimocode/mimocode.json(c)` | model、small |
| Pi           | `~/.pi/agent/settings.json`       | model           |
| Goose        | `~/.config/goose/config.yaml`     | model           |
| Cursor CLI   | `~/.cursor/cli-config.json`       | model           |
| Copilot CLI  | `~/.copilot/settings.json`        | model           |
| Crush        | `~/.config/crush/crush.json`      | large、small    |
| DeepSeek Harness (dsh) | `~/.dsh/config.yaml`（`$DSH_HOME`） | model |
| Command Code | `~/.commandcode/settings.json`（+ `providers.json`） | model |
| fx           | `~/.fx/settings.json`             | model（免 key 的 `magpie` 供应商） |
| omp (oh-my-pi) | `~/.omp/agent/config.yml`（+ `models.yml`） | model |
| Devin        | `~/.config/devin/config.json`（Windows `%APPDATA%\devin\config.json`） | model |
| Hermes Agent | `~/.hermes/config.yaml`（`$HERMES_HOME`） | model |
| Cline (CLI)  | `~/.cline/data/settings/providers.json`（`$CLINE_DIR`） | model、effort（magpie 接管其 openai 兼容供应商） |
| Qoder (CLI)  | `~/.qoder/settings.json`（`$QODER_CONFIG_DIR`） | model、effort（`magpie` 自定义供应商；需带 BYOK 的 Qoder 套餐） |
| Qoder CN (CLI) | `~/.qoder-cn/settings.json`（`$QODERCN_CONFIG_DIR`） | model、effort（同 Qoder；独立账号，Qoder CN 套餐） |
| Grok Build   | `~/.grok/config.toml`（`$GROK_HOME`） | model、effort |
| ZCode        | `~/.zcode/v2/config.json`         | provider（magpie 的模型出现在 ZCode 选择器里） |
| WorkBuddy    | `~/.workbuddy/models.json`（`$WORKBUDDY_CONFIG_DIR`） | provider（magpie 的模型出现在 WorkBuddy 选择器里） |
| OpenHanako   | `~/.hanako/provider-catalog.json` + `agents/<id>/config.yaml`（`$HANA_HOME`；运行时用其本地 API） | model（主 Agent 的；magpie 模型作为供应商） |
| Alma         | Alma 本地 API（`localhost:23001`，Alma 运行时） | model（Alma 默认；magpie 模型作为供应商） |

供应商作用域的 Agent（OpenCode、MiMo Code、Pi、Goose、Crush、omp、Hermes Agent）取 `provider/model`。
只显示已安装或已配置的 Agent。

## 供应商与网关

Agent 能挑的每个模型都拼作 `provider/model`，由 magpie 的网关供给——Agent 手里永远没有供应商的 key 和 URL。加一个供应商，它的模型就出现在每个 Agent 的选择器里：

```sh
magpie presets                          # magpie 认识的厂商，分组：厂商、中转、本地
magpie provider add deepseek sk-…       # 预设只需要 key
magpie provider add ollama              # 本地服务器连 key 都不用
magpie provider add "My Relay" url=https://relay.example.com/v1 key=sk-… models=gpt-5.5,claude-sonnet-5
magpie providers                        # 主机、key、暴露的模型、谁在用什么
magpie provider deepseek                # 单个供应商详情
magpie provider models deepseek         # 重新拉取厂商模型列表（加 id 选择暴露哪些）
magpie provider test deepseek           # 每个 API 一次极小请求，带延迟
magpie provider key deepseek sk-…       # 换 key
magpie provider rm deepseek
magpie models                           # Agent 看到的目录
magpie claude deepseek/deepseek-chat    # 用它
```

自定义供应商接受 `url=`（OpenAI 兼容 base）、`anthropic=`（Anthropic 兼容 base）或两者，供应商有独立 Responses 端点时加 `responses=`，`catalog=` 借用 models.dev 清单，`models=` 点名要暴露的模型。预设不知道的任何东西都能这样覆盖。

百度千帆 [Token Plan 个人版](https://cloud.baidu.com/doc/qianfan/s/Dmrabu8b6)作为 `qianfan-token-plan` 提供，带专属的 Chat Completions、Responses 和 Anthropic Messages 端点。`magpie provider add qianfan-token-plan <个人版-api-key>` 添加。`qianfan-code-latest` 跟随千帆控制台里选的模型；显式模型 ID（如 `glm-5.3`）直接选那个模型。该套餐没有模型列表端点，预设用文档列出的模型；新模型 ID 也可手填。请用个人版 key：Coding Plan 和企业版端点不同。

### 路由组

路由组是多个模型（可来自多个供应商）打包成一个供 Agent 挑选：`group/<id>`。网关把每个请求在全体成员的 key 和账号间统筹路由。两个供应商用同名供的同一模型自动成组；应用里的 Routing 视图和 `magpie group` 可以组任何别的：

```sh
magpie groups                           # 你建的，然后 magpie 发现的
magpie group add "Opus anywhere" models=claude/claude-opus-5-5,copilot/claude-opus-5.5 routing=order stays=session
magpie group opus-anywhere              # 一个组，成员按序
magpie group set opus-anywhere models+=openrouter/anthropic/claude-opus-5.5 routing=usage
magpie group set opus-anywhere models-=copilot/claude-opus-5.5
magpie group rm opus-anywhere           # magpie 发现的组只是隐藏；magpie group restore <id> 找回
magpie claude group/opus-anywhere       # 用它
```

`routing=` 取 `smart`（默认：还有额度的订阅里，额度最早续的先上）、`order`（第一个顶到不能答再换下一个）、`rotate`（每轮轮换成员）或 `usage`（用得最少的先）。`stays=` 是一段对话黏住答它的 key/账号多久：`auto`（默认，厂商缓存还值得保留时就黏）、`session`、`turn` 或 `off`。`models=` 整表按序替换；只有一个供应商供的模型可省前缀。

应用的“从其他应用导入”对话框可以把 Claude Code `settings.json`（设了 `CLAUDE_CONFIG_DIR` 时用它）和 Codex `config.toml`（设了 `CODEX_HOME` 时用它）里的供应商拷进 magpie。Codex 的自定义 `[model_providers.*]`（带内联 `experimental_bearer_token`）、自定义供应商的固定头（`[model_providers.*.http_headers]`）和 `[profiles.*]`/`model_catalog_json` 里的模型都会导入。导入前请过目；之后 Agent 设置的改动不会自动同步。指回 magpie 的和只写 `env_key` 的条目跳过。

### 登录着的 Agent 即供应商

你登录过的 Agent 就是一份带着模型的订阅，magpie 也把它作为一个供应商。Claude Code（macOS 钥匙串或 `~/.claude/.credentials.json` 里的 OAuth 登录）、Codex（`~/.codex/auth.json` 里的 ChatGPT 登录）、Copilot（`~/.config/github-copilot/apps.json` 里的 GitHub 登录）和 Devin（`devin auth login`，存于 `~/.local/share/devin/credentials.toml`）出现在 `magpie providers` 和供应商页里，标为 *signed in as …*，其模型写作 `claude/claude-sonnet-5`、`codex/gpt-5.5`、`copilot/claude-sonnet-4.5`、`devin/swe-2-max`，出现在其他所有 Agent 的选择器里。magpie 每次都读 Agent 自己的凭据，按 Agent 的方式刷新 token——轮换后的 token 写回 Agent 会读的地方——除了你的模型选择什么都不存；退出该 Agent 登录，这个供应商就消失。模型列表也是厂商自己的：magpie 拿同一登录去问 Anthropic、Copilot 或 Codex 的 API，上游加的模型下次刷新就出现。ChatGPT 后端只走流式且拒绝个别参数，magpie 会翻译非流式请求并去掉会被拒的参数。Claude 订阅不同：即使 OAuth 请求看起来像 Claude Code，Anthropic 也把别的 Agent 的系统提示归类为第三方流量。因此 magpie 为每次 Claude 订阅生成驱动真正的本地 `claude` 二进制——调用方的工具经 MCP 桥进那个活回合，工具结果续在同一 Claude Code 进程里；Pi、OpenCode 等所有 Agent 自动走这条路。生成的 harness 不进 Anthropic 的系统提示分类器，而其指令仍在用户上下文里。这需要 Claude Code 已安装并登录。
Grok 订阅（SuperGrok，用 Grok Build 登录）直连 grok CLI 用的 Responses API，Devin 订阅直连 devin CLI 的 API，Cursor 订阅直连 cursor-agent 的 agent API——各带 CLI 的登录，调用方的工具原样传过（Cursor 的模型把它们当 MCP 工具调；Cursor 自家工具不运行）。Google 登录——Gemini CLI 的和 Antigravity 的——直连 Google Code Assist API：magpie 从 `~/.gemini` 读 Gemini CLI 自己的登录或自己签一个，token 在内存里刷新。Google 已不再向个人账号提供 Gemini CLI 登录，只给 Gemini Code Assist 标准版/企业版，需要指定 Google Cloud 项目（`magpie accounts project gemini <email> <project-id>`，或 `~/.gemini/.env` 里的 `GOOGLE_CLOUD_PROJECT`）。Google 可能封在 Antigravity 之外使用 Antigravity 账号，所以 magpie 添加前会先问；用你舍得丢的账号。

### 连接其他任何东西

网关监听 `127.0.0.1:3425`（`MAGPIE_ADDR` 可改），随应用启动；`magpie serve` 单独跑。它暴露：

| 路径                     | API                        |
| ------------------------ | -------------------------- |
| `/v1/chat/completions`   | OpenAI chat completions    |
| `/v1/responses`          | OpenAI Responses           |
| `/v1/messages`           | Anthropic Messages         |
| `/v1/messages/count_tokens` | Anthropic token 计数 |
| `/v1beta/models/{model}:generateContent` | Google Gemini（另有 `:streamGenerateContent`、`:countTokens`） |
| `/v1/models`、`/v1beta/models` | 目录            |

每个 `/v1/models` 条目带 `reasoning` 和 `supported_reasoning_levels`（`[{"effort":"low"}, …]`）。路由组只列出全体成员都支持的档位。

厂商讲 Agent 的 API 时请求直通，否则翻译——流式、工具调用、推理都含在内。key 是 `magpie`（任意值都行；网关只听环回），模型名 `provider/model`。任何能设 base URL 的东西都能用：

| 工具讲      | Base URL                   | 环境变量                                   |
| ----------- | -------------------------- | --------------------------------------------- |
| OpenAI      | `http://127.0.0.1:3425/v1` | `OPENAI_BASE_URL`、`OPENAI_API_KEY=magpie`      |
| Anthropic   | `http://127.0.0.1:3425`    | `ANTHROPIC_BASE_URL`、`ANTHROPIC_API_KEY=magpie` |
| Gemini      | `http://127.0.0.1:3425`    | `GOOGLE_GEMINI_BASE_URL`、`GEMINI_API_KEY=magpie` |

应用的 *Gateway* 页把这些做成复制按钮和现成片段（shell、curl、Python、Node，每种 API 一套）、模型 id 清单和近期调用；`MAGPIE_DEBUG=1` 把每次调用打到终端。

**Claude Code** 在 `settings.json` 的 `env` 块里得到 `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN` 和模型变量；挑原生模型（`opus`、`sonnet`…）会移除它们并还原原来的内容。

**Codex** 得到一个 `[model_providers.magpie]` 表、指向 `~/.codex/magpie-models.json` 的 `model_catalog_json`（从目录写出，模型出现在 Codex 自己的列表里）和有效的 `model`/`effort`；挑原生模型则全部移除。你的 ChatGPT 登录永远不动。Codex 启动时读模型列表，切换后要重启。

**OpenCode、Pi、Crush** 得到一个 `magpie` 供应商条目和 `magpie/provider/model`。

**Gemini CLI** 在 API key、Google 账号和 Vertex 之间切 `auth`；API key 写进 `~/.gemini/.env`。挑目录模型会把 `GOOGLE_GEMINI_BASE_URL` 指向网关（它讲 Gemini API）、`auth` 设为带网关 token 的 API key、并在 `settings.json` 里点名模型；挑原生模型则还原之前的 auth。

### 导入链接

厂商或中转可以给用户一个现成供应商的链接：

```
magpie://import?preset=deepseek&key=sk-…
magpie://import?name=Acme%20Relay&chat=https://api.acme.example/v1&anthropic=https://api.acme.example&key=sk-…&models=gpt-5.5,claude-sonnet-5
```

打开它会唤起 magpie，展示这个链接将添加的东西：名字、你的提示词和 key 将发往的主机、模型。你不按 *Add* 就什么都不存。`magpie import <link>` 在终端做同样的事。

| 参数   | 含义                                                            |
| ----------- | ------------------------------------------------------------------ |
| `preset`    | 预设 id（`magpie presets`）；用它的端点             |
| `region`    | 带区域的预设，选哪个区域                          |
| `name`      | 供应商名字；无预设时必填                     |
| `id`        | 其 id；缺省由名字推导                          |
| `key`       | API key；缺省由用户粘贴                       |
| `chat`      | OpenAI Chat Completions base URL（`…/v1`）                          |
| `responses` | OpenAI Responses base URL（`…/v1`）                                 |
| `anthropic` | Anthropic Messages base URL（根，不带 `/v1`）              |
| `models`    | 要暴露的模型 id，逗号分隔                               |
| `catalog`   | models.dev 供应商 id，用于模型名和推理档位       |
| `website`、`keys` | 厂商站点和 API-key 页（https）               |
| `icon`      | 厂商自己的 https 图片（PNG、JPEG、GIF、WebP、ICO、SVG，至多 1 MB）。magpie 在你确认导入后下载一次，存进图标目录；没有则回退到目录 logo 或普通标记 |

Base URL 必须 https（纯 http 只允许本机或本地网）。网页和 GitHub 对自定义 scheme 的链接不可靠，可改链 `https://usemagpie.ai/import#<同样参数>`：它会打开 magpie，未安装时提供下载。参数留在 fragment 里，浏览器永远不会发给服务器。完整指南和链接生成器：<https://usemagpie.ai/docs/import>。

## 安装

从 [usemagpie.ai](https://usemagpie.ai) 下载 macOS、Windows 或 Linux 应用，或在终端安装（Linux：装了 WebKitGTK 4.1 给桌面应用，否则给命令行）：

```sh
curl -fsSL https://usemagpie.ai/install.sh | sh
```

Mac 版已签名并公证；Windows 和 Linux 构建暂未签名（Windows SmartScreen 首次运行可能询问）。每个构建自保持更新：应用后台下载新版本，重启（菜单里的 *Restart to Update*）或退出时安装；终端里 `magpie update` 同样。每个发布都在
[yetone/magpie-releases](https://github.com/yetone/magpie-releases/releases)。

从源码：

```sh
go install github.com/yetone/magpie@latest
```

或本地构建：

```sh
make build            # ./magpie，带桌面应用（需 cgo + 平台 webview）
make app              # macOS：magpie.app，无 Dock 图标的菜单栏应用
make cli              # 纯终端构建，无 cgo，随处交叉编译
make release          # dist/：本机应用 + 全平台 cli
make release-windows  # dist/：Windows 应用，amd64 和 arm64（交叉编译）
make release-linux    # dist/：本机架构的 Linux 应用
```

Linux 应用构建需要 `libgtk-3-dev` 和 `libwebkit2gtk-4.1-dev`（Makefile 已加 `gtk3` tag；裸 `go build` 请传 `-tags gtk3`）；Windows 用系统自带的 WebView2 运行时。

### 开发

```sh
make dev
```

以 `-tags dev` 构建并打开应用，UI 直接从 `internal/gui/assets` 供给：保存 `app.css`、`app.js` 或 `index.html`，窗口自己重载。装了 `fswatch`（`brew install fswatch`）时，改 Go 文件也会重建并重启应用。开发构建用独立网关端口（`DEV_ADDR`，默认 127.0.0.1:3426），你正在跑的 magpie 不受影响、继续服务你的 Agent。指向一个临时 home，别把真实 Agent 配置卷进来：

```sh
HOME=/tmp/magpie-home XDG_CONFIG_HOME=/tmp/magpie-home/.config make dev
```

`MAGPIE_THEME=light|dark` 强制配色，`MAGPIE_DEBUG=1` 打印网关翻译内容。

## 使用

```sh
magpie                          # 打开应用：窗口 + 菜单栏图标
magpie tray                     # 只剩菜单栏图标（登录项里用它）
magpie tui                      # 同样的东西，在终端里
magpie web                      # 应用的窗口跑在浏览器里（WSL、SSH 服务器）；--lan、--addr、--no-open
                                # （每次运行新 key；MAGPIE_WEB_KEY 固定一个，适合当服务跑）
magpie ls                       # 列出每个 Agent 及其当前设置
magpie claude opus              # 设模型（Agent 名接受前缀：cc、oc、gem…）
magpie codex gpt-5.6-sol
magpie codex effort high        # 其他字段
magpie codex xhigh              # 裸档位也能识别
magpie codex deepseek/deepseek-chat   # 目录里任何模型，经网关
magpie claude moonshot/kimi-k2.5
magpie claude haiku deepseek/deepseek-v4-flash   # 单独给一档配模型
magpie claude haiku ""          # 该档回主模型
magpie gemini auth api-key
magpie opencode anthropic/claude-sonnet-5
magpie oc small anthropic/claude-haiku-4-5
magpie mimo anthropic/claude-sonnet-5

magpie save work                # 把一切快照成 profile
magpie use work                 # 切回
magpie profiles
magpie rm work

magpie sync                     # 刷新 models.dev 目录和每个在线模型列表
```

应用里点任何值打开过滤列表；输入即搜索，也可以输入未列出的值；`esc` 关面板。Profiles 是底部的 chips：点击应用、`×` 删除、*+ save current* 新增。窗口的 *Providers* 页列出你的供应商和各供应商上的 Agent；点一行改 key 或暴露的模型、*Test* 它，或点 Agent 图标把那个 Agent 指到它的某个模型。*Add provider* 把预设摆成贴片：挑一个，粘 key。

终端版按键：

| 键        | 动作                                |
| ---------- | ------------------------------------- |
| `↑` `↓`    | 选 Agent                          |
| `←` `→`    | 选字段（model、effort、small…） |
| `↵`        | 打开选择器                       |
| 输入       | 过滤；回车接受自定义值   |
| `s`        | 当前配置存为 profile       |
| `p`        | 应用或删除（`ctrl+d`）profile  |
| `S`        | 同步模型目录                |
| `q`        | 退出                                  |

Agent 启动时读配置，跑着的会话会保持它的模型直到你开新的。

### 迁移到另一台机器

```sh
magpie backup                   # 写出 magpie.magpie-backup，两次询问口令
magpie backup --no-keys ~/b.magpie-backup   # 同上，但不含 API key
magpie restore magpie.magpie-backup         # 在另一台机器上
magpie restore --no-agents b.magpie-backup  # 供应商、设置、profiles；Agent 不动
magpie restore --no-library b.magpie-backup # 这台机器上的库不动
```

备份包含你的供应商（带 key，除非 `--no-keys`）、为它们挑的图片、设置、profiles、每个 Agent 的模型和库（除非 `--no-library`）：指令集、MCP 服务器和技能及其文件（超 2 MB 的文件不进）。不含 key 时，服务器的环境变量和长得像 key 的头留空。恢复库会替换机器上的那个——被替换的保留在库的备份里——并写进那台机器的 Agent。备份在本机加密（AES-256-GCM，口令经 PBKDF2-SHA256 派生密钥）；没有口令读不了任何内容。恢复按 id 替换同名供应商、追加其余；没带 key 的保留机器上已有的 key。Agent 模型只写给那台机器上装了的 Agent。订阅不在备份里：每台机器各自登录。管道传入时，口令是 stdin 第一行。

## 文件

- `~/.config/magpie/profiles.json` — 已存 profiles
- `~/.config/magpie/providers.json` — 你的供应商，含 key（0600）
- `~/.config/magpie/stash.json` — magpie 替换掉的值，切回时还原
- `~/.cache/magpie/models.json` — models.dev 目录（存在时用 OpenCode 的缓存
  `~/.cache/opencode/models.json`）
- `~/.cache/magpie/models/<provider>.json` — 从厂商拉取的模型列表

遵循 `XDG_CONFIG_HOME` 和 `XDG_CACHE_HOME`。

## 用户计数

每天一次，运行中的 magpie（应用或 `magpie serve`）向 PostHog 发一个事件，让我们知道有多少人在用：一个在你电脑上生成的随机 id（`~/.config/magpie/install-id`）、magpie 版本、系统和架构。别的什么都不发：没有账号、key、供应商、模型、提示词或用量。设置 → 隐私 → Count me as a user 可关，`DO_NOT_TRACK=1` 或 `MAGPIE_NO_STATS=1` 也行。源码构建永不发送。代码在 [internal/stats](internal/stats/stats.go)。

## 社区

问题、值得分享的配置、想法、bug：来 [Discord](https://discord.gg/vGSnD3ZKQF) 和我们以及其他 magpie 用户聊聊。Issue 和 pull request 也欢迎。

## 许可

MIT。见 [LICENSE](LICENSE)。
