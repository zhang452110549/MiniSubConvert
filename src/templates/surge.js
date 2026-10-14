// 基于 surge.conf 模板生成完整的 Surge 配置。放在 producers 之外，避免被 scripts/sync.js 同步上游时覆盖。
//
// 模板约定：
// - [Proxy]：填入全部节点（重名节点自动追加序号）。
// - [Proxy Group]：每个订阅生成一个 select 节点池组，追加在该段末尾；池名取订阅地址的 #片段，缺省为域名。
// - {{POOLS}}：替换为全部节点池组名，用于 include-other-group="{{POOLS}}"。
// - {{SUBSCRIPTION_RULES}}：独占一行，替换为订阅地址的直连规则。
import template from "./surge.conf";
import { isIPv4, isIPv6 } from "@/utils";

const BUILTIN_POLICIES = ["DIRECT", "REJECT", "REJECT-DROP", "REJECT-NO-DROP", "REJECT-TINYGIF"];

/**
 * @param {{ url: string, proxyText: string }[]} subscriptions 每个订阅及其 Surge producer 输出的节点行
 * @param {{ managedUrl?: string }} [options]
 */
export function renderSurgeConfig(subscriptions, { managedUrl } = {}) {
    const lines = template.split(/\r?\n/);
    const usedNames = new Set([...BUILTIN_POLICIES, ...getGroupNames(lines)]);

    const nodeLines = [];
    const pools = subscriptions.map(({ url, proxyText }) => {
        const members = [];
        for (const line of String(proxyText || "").split("\n")) {
            const index = line.indexOf("=");
            if (line.trim().startsWith("#") || index <= 0) continue;
            const name = uniqueName(line.slice(0, index).trim(), usedNames);
            nodeLines.push(`${name}=${line.slice(index + 1).trim()}`);
            members.push(name);
        }
        return { url, members };
    });

    // 没有节点的订阅不生成节点池：空组在 Surge 中会静默回落为 DIRECT
    const poolLines = [];
    const poolNames = [];
    for (const { url, members } of pools) {
        if (members.length === 0) continue;
        const name = uniqueName(getPoolName(url, poolNames.length + 1), usedNames);
        poolNames.push(name);
        poolLines.push(`${name} = select, ${members.join(", ")}`);
    }
    if (poolNames.length === 0) {
        throw new Error("no proxies available in subscriptions");
    }

    const rules = [...new Set(subscriptions.map(({ url }) => getDirectRule(url)).filter(Boolean))];
    const output = lines
        .flatMap((line) => (line.trim() === "{{SUBSCRIPTION_RULES}}" ? rules : [line]))
        .map((line) => line.replaceAll("{{POOLS}}", poolNames.join(", ")));
    appendToSection(output, "Proxy", nodeLines);
    appendToSection(output, "Proxy Group", poolLines);

    if (managedUrl) {
        output.unshift(`#!MANAGED-CONFIG ${managedUrl} interval=86400 strict=false`, "");
    }
    return output.join("\n");
}

export function isSurgeTarget(target) {
    return ["surge", "Surge", "SurgeMac"].includes(target);
}

function getGroupNames(lines) {
    const names = [];
    let section = null;
    for (const line of lines) {
        const trimmed = line.trim();
        const header = trimmed.match(/^\[(.+)\]$/);
        if (header) {
            section = header[1];
        } else if (section === "Proxy Group" && trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            names.push(trimmed.slice(0, trimmed.indexOf("=")).trim());
        }
    }
    return names;
}

function appendToSection(lines, section, items) {
    const start = lines.findIndex((line) => line.trim() === `[${section}]`);
    if (start === -1) {
        throw new Error(`surge template is missing [${section}] section`);
    }
    let end = lines.findIndex((line, index) => index > start && /^\[.+\]$/.test(line.trim()));
    if (end === -1) end = lines.length;
    while (end > start + 1 && lines[end - 1].trim() === "") end--;
    lines.splice(end, 0, ...items);
}

function uniqueName(name, usedNames) {
    let result = name;
    for (let i = 2; usedNames.has(result); i++) {
        result = `${name} ${i}`;
    }
    usedNames.add(result);
    return result;
}

function getPoolName(url, index) {
    try {
        const { hash, hostname } = new URL(url);
        // 组名中的 , = " 会破坏 Surge 的参数解析
        const name = decodeURIComponent(hash.slice(1)).replace(/[,="]/g, "").trim();
        return name || hostname;
    } catch {
        return `订阅${index}`;
    }
}

function getDirectRule(url) {
    let hostname;
    try {
        hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
    } catch {
        return null;
    }
    if (isIPv4(hostname)) return `IP-CIDR,${hostname}/32,DIRECT,no-resolve`;
    if (isIPv6(hostname)) return `IP-CIDR6,${hostname}/128,DIRECT,no-resolve`;
    return hostname ? `DOMAIN,${hostname},DIRECT` : null;
}
