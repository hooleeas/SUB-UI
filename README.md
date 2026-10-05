# SUB-UI

一个基于 Cloudflare Workers / Pages + KV 的订阅聚合与管理工具。

## ✨ 功能一览

| 模块 | 功能 |
|---|---|
| 🔗 聚合 | 多个聚合节点组合、多订阅混合、节点去重 |
| ⚙️ 转换 | SUBAPI、SUBCONFIG，可使用预设或自定义地址 |
| 🚫 过滤 | NOADS 节点屏蔽规则 |
| 📱 客户端 | Clash / Mihomo、Sing-box、Surge、Quantumult X、Loon、NekoBox、V2RayN、V2RayNG、Shadowrocket 等 |
| 📲 公开页 | 生成订阅链接、复制链接、二维码 |
| 🔀 路径 | 自动生成或手动指定公开订阅路径 |
| 🗑️ 链接 | 浏览器保存生成历史、检查链接状态、销毁聚合订阅 |
| 🔑 销毁 | 可为公开订阅设置可选销毁密钥 |
| 🔄 更新 | 可设置推荐更新时间，并可单独启用 / 禁用 |
| 🛠️ 后台 | SUB、URL、SUBAPI、SUBCONFIG、站点设置 |
| 📦 JSON | 搜索、查看、删除聚合订阅数据 |
| ↕️ 排序 | SUB、SUBAPI、SUBCONFIG 支持排序 |
| 🎨 站点 | 站点名称、Logo、管理员路径、管理员账号密码 |
| 🪄 伪装 | 支持首页伪装模式及相关配置 |
| 📡 检测 | SUBAPI / SUBCONFIG 状态检测 |

---

# 🧩 工作方式

```text
订阅地址 / 单节点
        │
        ▼
      SUB-UI
        │
   ┌────┼────────┐
   ▼    ▼        ▼
  SUB  SUBAPI  SUBCONFIG
   │    │        │
   └────┼────────┘
        ▼
      NOADS
        │
        ▼
   聚合 / 去重 / 转换
        │
        ▼
   生成公开订阅链接
        │
        ▼
     /随机Token
```

SUB-UI 将「聚合节点配置」和「公开订阅 URL」分开管理：

- **SUB**：保存一组订阅地址 / 单节点，可被多个 URL 复用。
- **URL**：保存公开订阅路径以及绑定的 SUB。
- **SUBAPI / SUBCONFIG**：作为订阅转换配置，可选择后台预设或直接使用自定义地址。
- **NOADS**：用于生成订阅时进行节点屏蔽。

每次生成新的聚合订阅都会创建独立的 URL 数据，相同内容也不会自动复用旧链接。

---

# 🚀 部署

支持 **Cloudflare Workers** 和 **Pages**。需要一个 KV Namespace，并绑定为 `KV`；无需设置环境变量。

## ☁️ Cloudflare Workers

1. 创建 KV Namespace。
2. 创建 Worker，部署项目的 `_worker.js`。
3. 在 **Settings → Bindings** 添加 KV Namespace，变量名填写 `KV`，然后部署。

## 📄 Cloudflare Pages

1. Fork 本项目的 Git 仓库。
2. 在 Cloudflare Pages 创建项目并连接 Fork 的仓库；构建输出目录设为仓库根目录（`.`），无需构建命令。
3. 在 **Settings → Functions → KV Namespace Bindings** 绑定 KV Namespace，变量名填写 `KV`，然后部署。

---

# 🔐 管理后台

默认管理员入口：

```text
/admin
```

管理员路径可以在后台修改。

例如修改为：

```text
/apple
```

对应：

| 页面 | 地址 |
|---|---|
| 管理后台 | `/apple` |
| JSON 管理 | `/apple/json` |
| 退出 | `/apple/logout` |

管理员路径支持：

`字母` · `数字` · `_` · `-`

长度：

**2–60 个字符**

---

# 🛠️ 管理后台功能

## SUB 聚合节点

每个 SUB 可以包含：

- 订阅地址
- 单节点
- 多个订阅地址与单节点混合

支持：

- 添加
- 编辑
- 删除
- 启用状态管理
- 长按 / 拖动排序
- 自动处理已经绑定该 SUB 的 URL

删除 SUB 后，已经绑定该 SUB 的 URL 会自动移除对应绑定关系。

## URL

URL 是实际对外使用的公开订阅入口。

支持：

- 添加
- 编辑
- 删除
- 自定义路径
- 自动生成随机路径
- 绑定多个 SUB
- 管理订阅名称

实际 KV Key：

```text
URL:<token>
```

例如：

```text
URL:AbCdEf12
```

## SUBAPI

支持：

- 添加
- 编辑
- 删除
- 设置默认后端
- 自定义后端地址
- 排序
- 状态检测

生成聚合订阅时，可以使用后台保存的 SUBAPI，也可以直接填写自定义 SUBAPI。

## SUBCONFIG

支持：

- 添加
- 编辑
- 删除
- 设置默认规则
- 自定义规则地址
- 排序
- 状态检测

生成聚合订阅时，可以使用后台保存的 SUBCONFIG，也可以直接填写自定义 SUBCONFIG。

## NOADS

NOADS 用于设置节点屏蔽规则，生成订阅时可以单独填写。

## 站点设置

包括：

- 站点名称
- Logo
- 管理员路径
- 管理员账号
- 管理员密码
- 首页伪装相关配置

Logo 支持 `http://` 和 `https://` 图片地址。

---

# 🔗 生成聚合订阅

公开首页可以配置：

| 项目 | 说明 |
|---|---|
| 订阅链接 | 一个或多个订阅地址 / 节点 |
| SUBAPI | 预设或自定义订阅转换后端 |
| SUBCONFIG | 预设或自定义订阅转换规则 |
| NOADS | 节点过滤规则 |
| 链接路径 | 自动生成或手动填写 |
| 推荐更新时间 | 设置订阅更新提示值 |
| 更新开关 | 是否启用推荐更新时间 |
| 销毁密钥 | 可选，用于保护公开页面的销毁操作 |

点击：

```text
生成聚合订阅链接
```

即可创建新的公开订阅。

## 🔀 自定义链接路径

不填写时，SUB-UI 会自动生成随机路径。

也可以手动填写，例如：

```text
my-sub
```

最终：

```text
https://example.com/my-sub
```

自定义路径至少需要 **3 个字符**，不能使用系统保留路径。

## 📲 生成结果

生成成功后会显示：

- 公开订阅 URL
- 复制按钮
- 二维码
- 销毁按钮

📋 **复制链接**：显示二维码  
📱 **Sing-box**：扫码导入  
🍎 **iPhone/iPad**：在 Safari 长按二维码导入

例如：

```text
https://example.com/AbCdEf12
```

浏览器同时会保存生成记录，方便后续管理。

---

# 🗑️ 销毁聚合订阅

设置了销毁密钥：

```text
销毁
  ↓
输入密钥
  ↓
验证
  ↓
删除 URL
```

没有设置销毁密钥：

```text
销毁
  ↓
确认
  ↓
删除 URL
```

删除后：

```text
https://example.com/AbCdEf12
```

立即失效。

---

# 📋 已生成链接

公开页面会在浏览器本地保存生成过的订阅链接记录。

支持：

- 查看历史生成链接
- 打开订阅链接
- 销毁链接
- 自动检查链接是否仍有效

如果服务端已经删除某个链接，浏览器中的对应历史记录会在检查后自动移除。

> 浏览器保存的是生成记录，不是服务端的完整订阅数据。

---

# 📱 支持的客户端

SUB-UI 可根据客户端请求自动识别使用场景。

支持识别：

- Clash
- Clash Meta
- Mihomo
- Sing-box
- Surge
- Quantumult X
- Loon
- NekoBox
- V2RayN
- V2RayNG
- Shadowrocket
- Subconverter

支持常见订阅格式 / 使用场景：

- Base64
- Clash / Mihomo
- Sing-box
- Surge
- Quantumult X
- Loon

---

# 📦 JSON 管理

入口：

```text
/管理员路径/json
```

例如：

```text
/apple/json
```

JSON 管理用于查看和清理已经生成的聚合订阅数据。

## 🔎 搜索

搜索针对 JSON 内容进行筛选。

可以搜索：

| 可搜索内容 |
|---|
| Token |
| URL |
| SUB |
| SUB 名称 |
| 订阅地址 |
| SUBAPI |
| SUBCONFIG |
| NOADS |
| JSON 中的其他字段 |

搜索只负责筛选结果：

> **不会因为搜索而自动删除数据。**

## 👁️ 查看 JSON

可以查看单个 JSON 的完整内容，包括：

- Token
- URL
- SUB
- 订阅来源
- SUBAPI
- SUBCONFIG
- NOADS
- 更新时间
- 创建 / 更新时间等数据

## 🗑️ 删除

| 操作 | 作用 |
|---|---|
| 查看 JSON | 查看单个 JSON |
| 删除 | 删除当前 JSON |
| 勾选 + 删除选中 | 删除勾选的数据 |
| 全部删除 | 删除当前管理范围内的聚合 JSON |

删除：

```text
URL:<token>
```

后，对应公开订阅地址立即失效。

---

# 🗃️ KV 数据

SUB-UI 使用一个 Cloudflare KV Binding：

```text
KV
```

主要数据：

| Key | 用途 |
|---|---|
| `CONFIG.json` | 站点、管理员、SUBAPI、SUBCONFIG 等配置 |
| `SUB:<id>` | 聚合节点配置 |
| `URL:<token>` | 公开订阅 URL 配置 |

## CONFIG.json

保存：

- 站点名称
- Logo
- 管理员路径
- 管理员账号密码
- SUBAPI 列表
- SUBCONFIG 列表
- 默认 SUBAPI
- 默认 SUBCONFIG
- NOADS
- 首页伪装相关配置

## SUB:<id>

例如：

```text
SUB:XXXXXXXXXX
```

用于保存一个 SUB 聚合节点配置，一个 SUB 可以被多个 URL 使用。

## URL:<token>

例如：

```text
URL:AbCdEf12
```

用于保存一个公开订阅 URL 配置，一个 URL 可以绑定多个 SUB。

---

# 🌐 页面与 API

## 页面

| 路径 | 用途 |
|---|---|
| `/` | 公开首页 / 订阅生成页面 |
| `/admin` | 默认管理员入口 |
| `/admin/json` | JSON 管理 |
| `/admin/logout` | 管理员退出 |

管理员路径修改后，管理员相关地址中的 `/admin` 会替换为新的路径。

## 主要 API

| API | 用途 |
|---|---|
| `/api/generate` | 生成聚合订阅 |
| `/api/destroy` | 销毁公开订阅 |
| `/api/update-generated-link` | 更新已生成链接相关数据 |
| `/api/verify-generated-link-edit` | 验证已生成链接编辑操作 |
| `/api/generated-links/check` | 检查浏览器保存的链接是否仍有效 |
| `/api/ui-config` | 获取公开页面使用的 SUBAPI / SUBCONFIG 配置 |
| `/api/status` | 检测 SUBAPI / SUBCONFIG 状态 |
| `/api/admin` | 管理后台数据操作 |

---

# 🔄 更新设置

生成聚合订阅时可以设置：

```text
推荐更新时间
```

单位：

**分钟**

允许范围：

```text
0–525600
```

同时可以控制：

```text
更新启用 / 禁用
```

---

# 🧱 数据关系

```text
CONFIG.json
│
├── 站点设置
├── 管理员设置
├── SUBAPI
└── SUBCONFIG

SUB:<id>
│
├── SUB 名称
├── 订阅地址
└── 单节点

URL:<token>
│
├── 公开路径
├── 订阅名称
└── 绑定 SUB
     ├── SUB:A
     ├── SUB:B
     └── SUB:C
```

因此：

```text
一个 SUB
   ↓
可以被多个 URL 复用
```

而：

```text
一个 URL
   ↓
可以绑定多个 SUB
```

---

# 🧭 典型使用流程

### 第一步：配置 SUBAPI

进入：

```text
SUBAPI
```

添加订阅转换后端，并设置默认后端。

### 第二步：配置 SUBCONFIG

进入：

```text
SUBCONFIG
```

添加转换规则，并设置默认规则。

### 第三步：创建 SUB

进入：

```text
SUB
```

添加订阅地址或单节点。

### 第四步：创建 URL

进入：

```text
URL
```

绑定一个或多个 SUB。

### 第五步：获取公开订阅

访问：

```text
/
```

填写或选择：

- SUBAPI
- SUBCONFIG
- NOADS
- 链接路径
- 推荐更新时间
- 销毁密钥

然后生成聚合订阅。

### 第六步：使用订阅

复制生成的 URL，或者扫描二维码导入客户端。

---

# ⚠️ 注意

## KV Binding

必须使用：

```text
KV
```

程序读取：

```text
env.KV
```

## KV Key

不要随意修改以下核心 Key：

```text
CONFIG.json
SUB:
URL:
```

## 部署更新

修改 KV Binding 后，需要重新部署，使新的 Binding 生效。

---

# 📄 License

本项目用于个人学习、研究和订阅聚合管理。

请遵守：

- Cloudflare 相关服务条款
- 相关订阅服务的服务条款
- 所在地区的法律法规

使用者应自行承担因使用本项目产生的相关责任。

---

# 🔐 管理后台

默认管理员入口：

/admin

管理员路径可以在后台修改。

例如修改为：

/apple

对应：

| 页面 | 地址 |
|---|---|
| 管理后台 | `/apple` |
| JSON 管理 | `/apple/json` |
| 退出 | `/apple/logout` |

管理员路径支持：

`字母` · `数字` · `_` · `-`

长度：`2–60` 个字符。

---

# 🛠️ 管理后台功能

## 聚合节点 SUB

- 添加
- 编辑
- 删除
- 长按拖动排序
- 自动处理已绑定 URL

## URL

- 添加
- 编辑
- 删除
- 管理聚合订阅链接

## SUBAPI / SUBCONFIG

- 添加
- 编辑
- 删除
- 设置默认配置
- 支持自定义地址

## 站点

- 站点名称
- Logo
- 管理员路径
- 管理员账号密码
- NOADS

---

# 📦 JSON 管理

入口：

/管理员路径/json

例如：

/apple/json

## 搜索

搜索范围是 **JSON 内容本身**，可以搜索：

| 可搜索内容 |
|---|
| Token |
| 订阅地址 |
| SUB |
| URL |
| SUBAPI |
| SUBCONFIG |
| NOADS |
| JSON 中的其他字段 |

搜索只负责筛选，**不会自动删除**。

## 删除

搜索结果支持：

┌──────────────────────────────────────────────┐
│ JSON 信息                         [查看 JSON] │
│ Token / URL / 其他信息                 [删除] │
└──────────────────────────────────────────────┘

删除方式：

| 操作 | 作用 |
|---|---|
| 查看 JSON | 查看单个 JSON |
| 删除 | 删除当前 JSON |
| 勾选 + 删除选中 | 只删除选中的 JSON |
| 全部删除 | 删除全部聚合订阅 JSON |

删除 `URL:<token>` 后，对应的公开订阅地址立即失效。

---

# 🔗 聚合订阅

公开页面填写：

| 项目 | 说明 |
|---|---|
| 订阅链接 | 需要聚合的订阅地址 / 节点 |
| SUBAPI | 订阅转换后端 |
| SUBCONFIG | 订阅转换规则 |
| NOADS | 节点屏蔽规则 |
| 密钥 | 可选，用于保护公开页面的销毁操作 |

点击：

生成聚合订阅链接

得到：

https://example.com/AbCdEf12

同时生成：

URL:AbCdEf12

---

# 🗑️ 销毁聚合订阅

生成时填写了密钥：

销毁
  ↓
输入密钥
  ↓
验证
  ↓
删除 URL:<token>

没有设置密钥：

销毁
  ↓
确认
  ↓
删除 URL:<token>

删除后：

https://example.com/AbCdEf12

立即失效。

---

# 🗃️ KV 数据

SUB-UI 只使用一个 KV Binding：

KV

核心 Key：

| Key | 用途 |
|---|---|
| `CONFIG.json` | 站点及管理员配置 |
| `SUB:<id>` | 聚合节点配置 |
| `URL:<token>` | 已生成的公开聚合订阅 JSON |

---

# 🌐 API 入口

| 路径 | 用途 |
|---|---|
| `/` | 公开首页 |
| `/admin` | 默认管理员入口 |
| `/admin/json` | JSON 管理 |
| `/admin/logout` | 退出管理员 |
| `/api/generate` | 生成聚合订阅 |
| `/api/admin` | 管理员 API |

> 管理员路径修改后，管理员相关地址中的 `/admin` 会替换为新的路径。

---

# ⚠️ 注意

### KV Binding

必须使用：

KV

程序读取：

env.KV

### KV Key

不要随意修改：

CONFIG.json
SUB:
URL:

### 部署更新

修改 KV Binding 后重新部署，使新的 Binding 生效。

---

## 📄 License

本项目用于个人学习、研究和订阅聚合管理。

请遵守 Cloudflare、相关订阅服务以及所在地区的法律法规和服务条款。
