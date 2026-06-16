// FreeBuf - 通过官方 RSS 源获取文章列表，避免直接爬取 HTML 被 WAF 拦截（405 错误）

export default defineSource(async () => {
  const data = await rss2json("https://www.freebuf.com/feed")
  if (!data?.items.length) throw new Error("无法获取 FreeBuf RSS 数据")

  return data.items.map(item => ({
    id: item.link,
    title: item.title,
    url: item.link,
    extra: {
      hover: item.description,
      date: item.created ? new Date(item.created).valueOf() : undefined,
    },
  }))
})
