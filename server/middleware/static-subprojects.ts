import { join, extname } from "node:path"
import { readFileSync, existsSync, statSync } from "node:fs"

// 子项目静态文件的 MIME 类型映射
const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".map": "application/json",
}

// 子项目路径白名单
const subProjects = ["/watermark", "/sandphoto"]

/**
 * 中间件：在 SPA fallback 之前拦截子项目路径下的所有静态文件请求
 * 使用中间件而非 server/routes，因为 Nitro 的 catch-all 路由对带扩展名的路径匹配不可靠
 */
export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname

  // 检查是否匹配子项目路径
  const matched = subProjects.find(p => pathname === p || pathname.startsWith(`${p}/`))
  if (!matched) return // 不匹配则放行给后续路由处理

  // 计算子路径: /sandphoto/ → index.html, /sandphoto/assets/x.js → assets/x.js
  let subPath = pathname.slice(matched.length)
  if (!subPath || subPath === "/") {
    subPath = "/index.html"
  }

  const baseDir = join(process.cwd(), "output", "public", matched.slice(1))
  const filePath = join(baseDir, subPath)

  // 安全检查：防止路径穿越
  if (!filePath.startsWith(baseDir)) {
    throw createError({ statusCode: 403, message: "Forbidden" })
  }

  // 如果路径是目录，尝试返回目录下的 index.html
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    const indexPath = join(filePath, "index.html")
    if (existsSync(indexPath)) {
      setResponseHeader(event, "Content-Type", "text/html; charset=utf-8")
      return readFileSync(indexPath, "utf-8")
    }
  }

  if (!existsSync(filePath)) {
    throw createError({ statusCode: 404, message: `Not found: ${subPath}` })
  }

  const ext = extname(filePath).toLowerCase()
  const contentType = mimeTypes[ext] || "application/octet-stream"
  setResponseHeader(event, "Content-Type", contentType)

  // 文本类型返回字符串，二进制类型返回 Buffer
  if (contentType.includes("text/") || contentType.includes("javascript") || contentType.includes("json") || contentType.includes("svg")) {
    return readFileSync(filePath, "utf-8")
  }
  return readFileSync(filePath)
})
