import type { SourceID } from "@shared/types"
import { typeSafeObjectEntries } from "@shared/type.util"
import * as x from "glob:./sources/{*.ts,**/index.ts}"
import { defineRSSSource } from "./utils/source"
import { sources } from "@shared/sources"
import type { SourceGetter } from "./types"

export const getters = (function () {
  const getters = {} as Record<SourceID, SourceGetter>
  typeSafeObjectEntries(x).forEach(([id, x]) => {
    if (x.default instanceof Function) {
      Object.assign(getters, { [id]: x.default })
    } else {
      Object.assign(getters, x.default)
    }
  })

  // Dynamically inject RSS getters for sources without explicit .ts files
  typeSafeObjectEntries(sources).forEach(([id, source]) => {
    if (source.rss && !getters[id as SourceID]) {
      Object.assign(getters, { [id]: defineRSSSource(source.rss) })
    }
  })

  return getters
})()
