# MiniSubConvert

使用 [Sub-Store](https://github.com/sub-store-org/Sub-Store) 作为核心的订阅转换,支持部署到 CloudFlare Worker

## 支持的平台 (Target)

| 平台 | Parameter Keys |
| :--- | :--- |
| **Quantumult X** | `qx`, `QX`, `QuantumultX` |
| **Surge** | `surge`, `Surge`, `SurgeMac` |
| **Loon** | `Loon` |
| **Clash** | `Clash` |
| **Clash Meta / Mihomo** | `meta`, `clashmeta`, `clash.meta`, `Clash.Meta`, `ClashMeta`, `mihomo`, `Mihomo` |
| **Stash** | `stash`, `Stash` |
| **Shadowrocket** | `shadowrocket`, `Shadowrocket`, `ShadowRocket` |
| **Surfboard** | `surfboard`, `Surfboard` |
| **Sing-box** | `singbox`, `sing-box` |
| **Egern** | `egern`, `Egern` |
| **V2Ray** | `v2`, `v2ray`, `V2Ray` |
| **URI** | `uri`, `URI` |
| **JSON** | `json`, `JSON` |

## 部署 

### Worker

1. 点击右上角的 `Fork` 按钮，将仓库复制到你的 GitHub 账户下。

2. 进入 [Worker](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create) 创建页面

3. 选择 `Continue With Github`

4. 选择Fork的仓库

5. 高级设置->变量名称 新增 `SECRET` 变量(选中加密) 

6. 后续更新只需 Github 中 `Sync fork` 即可


接口遵循以下格式：

```
GET <WORKER_DOMAIN>/<SECRET>/sub?target=<TARGET>&url=<URLS>
```

*注意：`<SECRET>` 对应 Worker 环境变量中设置的 `SECRET` 值。*

参数说明

- **target**: 目标平台格式（请参考上方支持列表）。
- **url**: 原始订阅链接。
    - **多订阅合并**：如果需要合并多个订阅，请使用竖线 `|` 分隔链接。
    - **URL 编码**：最终拼接后的字符串必须进行 **URL Encode** 编码。
- **config**（可选，仅 Surge）：设为 `1` 时按 [`src/templates/surge.conf`](src/templates/surge.conf) 模板输出完整的 Surge 配置（带 `#!MANAGED-CONFIG` 以便自动更新）；不传时只返回节点列表，可用于 `policy-path`。
    - 每个订阅生成一个节点池策略组，组名取订阅地址的 `#` 片段（如 `https://example.com/sub1#机场A`），未设置时使用订阅域名。
    - 订阅地址的域名 / IP 会自动加入直连规则；多个订阅中的重名节点会自动追加序号。
- **filename**（可选）：通过 `Content-Disposition` 响应头指定配置文件名，客户端从 URL 安装配置时以此命名。`config=1` 输出 Surge 配置时默认为 `MiniSubConvert`（Surge Mac 从 URL 安装时缺少文件名会安装失败）。
- **ua**（可选）：拉取订阅时使用的 User-Agent，默认 `FlClash/v0.9.0 clash-verge Platform/macos`。部分机场按 UA 下发不同格式的配置，拉取结果为空时可尝试调整。

请求示例 

假设：
- Worker 域名: `example.workers.dev`
- `SECRET`: `129438`
- 目标平台: `mihomo`
- 原始订阅:
    1. `https://example.com/sub1`
    2. `https://example.com/sub2`

**步骤：**

1.  **拼接**: `https://example.com/sub1|https://example.com/sub2`
2.  **编码**: `https%3A%2F%2Fexample.com%2Fsub1%7Chttps%3A%2F%2Fexample.com%2Fsub2`
3.  **最终 URL**:

```
https://example.workers.dev/129438/sub?target=mihomo&url=https%3A%2F%2Fexample.com%2Fsub1%7Chttps%3A%2F%2Fexample.com%2Fsub2
```

### Docker

```bash
docker run -d \
    --name minisubconvert \
    -p 3000:3000 \
    -e SECRET=minisubconvert \
    bestrui/minisubconvert
```