import { createServer } from "node:http";
import { ProxyUtils } from "@/core/proxy-utils";
import { convertSubscriptions } from "@/core/convert";

createServer(async (req, res) => {
    const method = (req.method || "").toUpperCase();
    const route = req.url || "";
    const url = new URL(route, "http://localhost");
    const pathname = url.pathname;
    const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket.remoteAddress || "-";
    const secret = process.env.SECRET || "secret";
    const log = (response, extra = "") => console.log(`[${new Date().toISOString()}] ${method} ${ip} ${response} ${route} ${extra ? ` ${extra}` : ""}`);
    if (
        !(method === "POST" && pathname === `/${secret}/api/proxy/parse`) &&
        !(method === "GET" && pathname === `/${secret}/sub`)
    ) {
        res.writeHead(403);
        res.end();
        log("403");
        return;
    }

    try {
        if (method === "POST") {
            let raw = "";
            for await (const chunk of req) raw += chunk;
            const { data, client } = JSON.parse(raw || "{}");
            const proxies = ProxyUtils.parse(data);
            const par_res = ProxyUtils.produce(proxies, client);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ status: "success", data: { par_res } }));
            log("200", `parsed ${proxies.length} nodes, target client: ${client || "-"}`);
            return;
        }

        const target = url.searchParams.get("target");
        const rawUrls = url.searchParams.get("url");

        if (!target || !rawUrls) {
            res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("missing target or url");
            log("400");
            return;
        }

        const proto = (req.headers["x-forwarded-proto"] || "http").toString().split(",")[0].trim();
        const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toString().split(",")[0].trim();
        const { result, count, headers } = await convertSubscriptions({
            rawUrls,
            target,
            userAgent: url.searchParams.get("ua"),
            config: url.searchParams.get("config") === "1",
            managedUrl: host ? `${proto}://${host}${route}` : "",
            filename: url.searchParams.get("filename"),
        });

        res.writeHead(200, headers);
        res.end(result);
        log("200", `parsed ${count} nodes, target client: ${target || "-"}`);
    } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end(String(e?.message || e));
        log("500", String(e?.message || e));
    }
}).listen(Number(process.env.PORT) || 3000, process.env.HOST || "0.0.0.0", () => {
    console.log(`Server is running at http://${process.env.HOST || "0.0.0.0"}:${Number(process.env.PORT) || 3000}`);
});
