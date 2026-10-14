import { ProxyUtils } from "@/core/proxy-utils";
import { fetchSubscriptions } from "@/utils/subscription";
import { isSurgeTarget, renderSurgeConfig } from "@/templates/surge";

/**
 * 拉取订阅并转换为目标平台格式；config 为 true 且目标为 Surge 时按模板输出完整配置。
 * @returns {Promise<{ result: string, count: number }>}
 */
export async function convertSubscriptions({ rawUrls, target, userAgent, config, managedUrl }) {
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
        return { result, count };
    }

    return { result: ProxyUtils.produce(subscriptions.flatMap(({ proxies }) => proxies), target), count };
}
