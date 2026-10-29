/**
 * SEO facts for Model 08 (雙點波源干涉). Kept as plain data so metadata, JSON-LD and tests share one source.
 * The canonical origin is the Lab host; the Organization is the single cross-site entity owned by kakau.tw
 * (its `@id` is a published identity contract there), so it is referenced, never redefined, here.
 */
export const LAB_ORIGIN = "https://lab.kakau.tw";
export const KAKAU_ORGANIZATION_ID = "https://kakau.tw/#organization";

export const interferenceSeo = {
  path: "/interference",
  title: "雙點波源干涉模擬｜Kakau Lab",
  description: "在原生互動波場中放置並拖曳觀測點、量測路徑差，透過先預測再觀察的引導活動，建立雙點波源干涉的高中物理模型。",
  shareDescription: "放一個觀測點，看路徑差如何決定相長與相消",
  image: {
    url: "/og/kakau-interference-lab.png",
    width: 1200,
    height: 630,
    alt: "Kakau 雙點波源干涉互動實驗：兩個波源與雙曲線條件線",
  },
  /** Original Streamlit simulator, kept as a fallback for browsers that cannot run the native lab. */
  streamlitUrl: "https://interference.streamlit.app/",
} as const;

export const interferenceUrl = `${LAB_ORIGIN}${interferenceSeo.path}`;

export function interferenceLearningResource() {
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${interferenceUrl}#interactive-lab`,
    url: interferenceUrl,
    name: "雙點波源干涉模擬器",
    description: interferenceSeo.description,
    inLanguage: "zh-Hant",
    educationalLevel: "高中",
    learningResourceType: "互動模擬與教學",
    about: ["雙點波源干涉", "路徑差", "相長條件", "相消條件", "雙曲線"],
    provider: { "@id": KAKAU_ORGANIZATION_ID },
    isAccessibleForFree: true,
  };
}

/** `<` is escaped so a string value can never close the surrounding script element. */
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
