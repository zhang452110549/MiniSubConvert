// 与 FlClash 默认订阅 UA 保持一致（lib/common/package.dart），机场通常依据 UA 中的 clash 关键字下发 Clash/Mihomo 配置。
export const DEFAULT_USER_AGENT = "FlClash/v0.9.0 clash-verge Platform/macos";

export async function fetchSubscriptions(rawUrls, userAgent) {
    const headers = { "User-Agent": userAgent || DEFAULT_USER_AGENT };

    return Promise.all(
        rawUrls
            .split("|")
            .map((item) => item.trim())
            .filter(Boolean)
            .map(async (subscribeUrl) => {
                const response = await fetch(subscribeUrl, { headers });
                if (!response.ok) {
                    throw new Error(`fetch subscription failed: HTTP ${response.status} ${new URL(subscribeUrl).host}`);
                }
                return { url: subscribeUrl, content: await response.text() };
            }),
    );
}
