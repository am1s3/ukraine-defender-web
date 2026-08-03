// ============================================================
// Ukraine Defender — toponym-centers.ts
// FULL FILE
//
// Координаты и названия топонимов по всей Украине.
// Ключи должны совпадать с toponym_key, которые отдаёт API.
// ============================================================

import type { ToponymMeta } from "../types";

export const TOPONYM_CENTERS: Record<string, ToponymMeta> = {
  // ============================================================
  // KYIV CITY / DISTRICTS
  // ============================================================

  kyiv: { coord: [50.45, 30.52], name: "Київ" },

  troieshchyna: { coord: [50.5, 30.62], name: "Троєщина" },
  brovary: { coord: [50.51, 30.79], name: "Бровари" },
  irpin: { coord: [50.52, 30.25], name: "Ірпінь" },
  bucha: { coord: [50.55, 30.22], name: "Буча" },
  hostomel: { coord: [50.57, 30.26], name: "Гостомель" },
  vyshhorod: { coord: [50.58, 30.5], name: "Вишгород" },
  obukhiv: { coord: [50.1, 30.62], name: "Обухів" },
  boryspil: { coord: [50.35, 30.95], name: "Бориспіль" },

  desna: { coord: [50.51, 30.58], name: "Десна" },
  solomianka: { coord: [50.42, 30.47], name: "Солом'янка" },
  podil: { coord: [50.47, 30.5], name: "Поділ" },
  darnytsia: { coord: [50.43, 30.62], name: "Дарниця" },
  sviatoshyn: { coord: [50.45, 30.38], name: "Святошин" },
  holosiiv: { coord: [50.38, 30.5], name: "Голосіїв" },
  obolon: { coord: [50.5, 30.5], name: "Оболонь" },
  pechersk: { coord: [50.43, 30.55], name: "Печерськ" },
  pozniaky: { coord: [50.4, 30.62], name: "Позняки" },

  knyazhychi: { coord: [50.52, 30.88], name: "Княжичі" },
  vplyka_dymerska: { coord: [50.78, 30.95], name: "Велика Димерка" },
  slavutych: { coord: [51.52, 30.76], name: "Славутич" },

  // ============================================================
  // OBLAST CENTERS / MAJOR CITIES
  // ============================================================

  dnipro: { coord: [48.46, 35.05], name: "Дніпро" },
  kryvyi_rih: { coord: [47.91, 33.39], name: "Кривий Ріг" },
  nikopol: { coord: [47.58, 34.36], name: "Нікополь" },
  pavlohrad: { coord: [48.53, 35.87], name: "Павлоград" },
  kremenchuk: { coord: [49.07, 33.42], name: "Кременчук" },

  kharkiv: { coord: [49.99, 36.23], name: "Харків" },
  izium: { coord: [49.22, 37.26], name: "Ізюм" },
  lozova: { coord: [48.89, 36.31], name: "Лозова" },

  odesa: { coord: [46.48, 30.72], name: "Одеса" },

  sumy: { coord: [50.91, 34.8], name: "Суми" },
  okhtyrka: { coord: [50.31, 34.9], name: "Охтирка" },
  konotop: { coord: [51.24, 33.2], name: "Конотоп" },
  shostka: { coord: [51.87, 33.48], name: "Шостка" },

  zaporizhzhia: { coord: [47.84, 35.14], name: "Запоріжжя" },
  melitopol: { coord: [46.85, 35.37], name: "Мелітополь" },
  berdyansk: { coord: [46.76, 36.8], name: "Бердянськ" },

  mykolaiv: { coord: [46.97, 31.99], name: "Миколаїв" },

  kherson: { coord: [46.64, 32.62], name: "Херсон" },

  poltava: { coord: [49.59, 34.55], name: "Полтава" },

  cherkasy: { coord: [49.44, 32.06], name: "Черкаси" },

  chernihiv: { coord: [51.49, 31.29], name: "Чернігів" },

  zhytomyr: { coord: [50.25, 28.66], name: "Житомир" },

  vinnytsia: { coord: [49.23, 28.47], name: "Вінниця" },

  khmelnytskyi: { coord: [49.42, 26.99], name: "Хмельницький" },

  rivne: { coord: [50.62, 26.25], name: "Рівне" },

  ternopil: { coord: [49.55, 25.59], name: "Тернопіль" },

  lviv: { coord: [49.84, 24.03], name: "Львів" },

  ivano_frankivsk: { coord: [48.92, 24.71], name: "Івано-Франківськ" },

  uzhhorod: { coord: [48.62, 22.3], name: "Ужгород" },

  lutsk: { coord: [50.75, 25.33], name: "Луцьк" },

  donetsk: { coord: [48.02, 37.8], name: "Донецьк" },

  luhansk: { coord: [48.57, 39.33], name: "Луганськ" },

  kropyvnytskyi: { coord: [48.51, 32.26], name: "Кропивницький" },

  chernivtsi: { coord: [48.29, 25.94], name: "Чернівці" }
};

// ============================================================
// NAME RESOLVER
// ============================================================

export function toponymName(
  key: string | null | undefined,
  raw?: string | null
): string {
  if (key && TOPONYM_CENTERS[key]) {
    return TOPONYM_CENTERS[key].name;
  }

  if (raw) {
    return raw;
  }

  if (key) {
    return key;
  }

  return "—";
}
