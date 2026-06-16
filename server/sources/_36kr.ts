import type { NewsItem } from "@shared/types"

// 36Kr API 响应类型定义
interface KrTemplateMaterial {
  itemId: number
  widgetTitle: string
  widgetContent?: string
  publishTime: number
  authorName?: string
  statRead?: number
  statPraise?: number
  statFormat?: string
}

interface KrItem {
  itemId: number
  itemType: number
  templateMaterial: KrTemplateMaterial
  route: string
  siteId: number
}

const quick = defineSource(async () => {
  const url = "https://gateway.36kr.com/api/mis/nav/newsflash/flow"

  const response = await myFetch<any>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      partner_id: "wap",
      param: {
        siteId: 1,
        platformId: 2,
        pageSize: 30,
        pageEvent: 0,
      },
    }),
  })

  if (response?.code !== 0 || !response?.data?.itemList) {
    throw new Error("36Kr 快讯 API 返回异常")
  }

  const news: NewsItem[] = []
  const items: KrItem[] = response.data.itemList

  for (const item of items) {
    const material = item.templateMaterial
    if (!material?.widgetTitle) continue

    news.push({
      id: String(item.itemId),
      title: material.widgetTitle,
      url: `https://36kr.com/newsflashes/${item.itemId}`,
      extra: {
        date: material.publishTime,
        hover: material.widgetContent,
      },
    })
  }

  return news
})

const renqi = defineSource(async () => {
  const url = "https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot"

  const response = await myFetch<any>(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      partner_id: "wap",
      param: {
        siteId: 1,
        platformId: 2,
      },
    }),
  })

  if (response?.code !== 0 || !response?.data?.hotRankList) {
    throw new Error("36Kr 人气榜 API 返回异常")
  }

  const articles: NewsItem[] = []
  const items: KrItem[] = response.data.hotRankList

  for (const item of items) {
    const material = item.templateMaterial
    if (!material?.widgetTitle) continue

    articles.push({
      id: String(item.itemId),
      title: material.widgetTitle,
      url: `https://36kr.com/p/${item.itemId}`,
      extra: {
        info: `${material.authorName || ""}  |  ${material.statFormat || ""}`,
      },
    })
  }

  return articles
})

export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": renqi,
})
