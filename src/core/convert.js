import { ProxyUtils } from "@/core/proxy-utils";
import { fetchSubscriptions } from "@/utils/subscription";
import { isSurgeTarget, renderSurgeConfig } from "@/templates/surge";

const DEFAULT_SURGE_FILENAME = "MiniSubConvert";

/**
 * 拉取订阅并转换为目标平台格式；config 为 true 且目标为 Surge 时按模板输出完整配置。
 * @returns {Promise<{ result: string, count: number, headers: Record<string, string> }>}
 */
export async function convertSubscriptions({ rawUrls, target, userAgent, config, managedUrl, filename }) {
    const subscriptions = (await fetchSubscriptions(rawUrls, userAgent)).map(({ url, content }) => ({
        url,
        proxies: ProxyUtils.parse(content),
    }));
    const count = subscriptions.reduce((sum, { proxies }) => sum + proxies.length, 0);

    if (config && isSurgeTarget(target)) {
        const result = renderSurgeConfig(
            subscriptions.map(({ url, proxies }) => ({ url, proxyText: ProxyUtils.produce(proxies, target) })),
            { managedUrl },
        );
        // Surge 从 URL 安装配置时据此命名配置文件；缺少该响应头时安装会静默失败
        return { result, count, headers: buildHeaders(filename || DEFAULT_SURGE_FILENAME) };
    }

    const result = ProxyUtils.produce(subscriptions.flatMap(({ proxies }) => proxies), target);
    return { result, count, headers: buildHeaders(filename) };
}

function buildHeaders(filename) {
    const headers = { "Content-Type": "text/plain; charset=utf-8" };
    const name = String(filename || "").replace(/[\\/:*?"<>|\r\n]/g, "").trim();
    if (name) {
        headers["Content-Disposition"] = `attachment; filename*=utf-8''${encodeURIComponent(name)}`;
    }
    return headers;
}
