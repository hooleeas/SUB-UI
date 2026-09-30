# SUB-UI
## ✨ 功能一览

| 模块 | 功能 |
|---|---|
| 🔗 订阅聚合 | 多订阅合并、自建节点混合、节点去重 |
| ⚙️ 转换 | SUBAPI、SUBCONFIG、自动格式识别 |
| 🚫 节点过滤 | NOADS 节点屏蔽 |
| 📱 客户端 | Clash / Mihomo、Sing-box、Surge、Quantumult X、Loon、Base64 |
| 📲 公开页面 | 生成链接、复制、二维码 |
| 🗑️ 链接管理 | 可选密钥、销毁聚合订阅 |
| 🛠️ 管理后台 | SUB、URL、SUBAPI、SUBCONFIG、NOADS、站点设置 |
| 📦 JSON 管理 | 搜索、查看、单删、勾选批量删除、全部删除 |
| 🎨 站点 | Logo、站点名称、管理员路径 |

---

## 🧩 工作方式

订阅地址 / 自建节点
        │
        ▼
   SUB-UI 聚合
        │
   ┌────┼────┐
   ▼    ▼    ▼
SUBAPI SUBCONFIG NOADS
   │    │    │
   └────┼────┘
        ▼
   生成聚合订阅
        │
        ▼
   /随机Token

每次生成聚合订阅都会创建新的随机 Token，并保存独立的 `URL:<token>` JSON。

> 相同内容也不会复用旧链接。

---

# 🚀 部署

SUB-UI 支持 **Cloudflare Workers** 和 **Cloudflare Pages**。

两种方式的核心配置只有一个：

| 配置 | 要求 |
|---|---|
| Cloudflare KV | 必须 |
| KV Binding 名称 | `KV` |
| 环境变量 | **不需要** |

---

## ☁️ Cloudflare Workers

### 1. 创建 KV

进入：

`Cloudflare → Workers & Pages → KV → Create a namespace`

创建一个 KV Namespace，名称可以自行设置。

### 2. 创建 Worker

创建 Worker，并使用项目中的：

_worker.js

完整代码。

### 3. 绑定 KV

进入：

`Worker → Settings → Bindings → KV Namespace`

添加刚刚创建的 KV Namespace。

**变量名称必须填写：**

KV

对应关系：

KV  →  你的 KV Namespace

### 4. 部署

保存并部署即可。

---

## 📄 Cloudflare Pages

### 1. 创建 KV

创建一个 Cloudflare KV Namespace。

### 2. 创建 Pages 项目

创建 Cloudflare Pages 项目，并使用本项目的：

_worker.js

作为 Worker 代码。

### 3. 绑定 KV

进入：

`Pages → Settings → Functions → KV Namespace Bindings`

添加 KV Namespace。

**变量名称必须填写：**

KV

对应关系：

KV  →  你的 KV Namespace

### 4. 部署

完成 KV Binding 后直接部署即可。

> **不需要额外设置环境变量。**

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
