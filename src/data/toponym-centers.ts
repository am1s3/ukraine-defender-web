// Координати + укр. назви топонімів для flyTo / підсвітки / підписів у стрічці
export interface ToponymMeta { coord: [number, number]; name: string; }

export const TOPONYM_CENTERS: Record<string, ToponymMeta> = {
  troieshchyna:    { coord: [50.513, 30.607], name: "Троєщина" },
  brovary:         { coord: [50.511, 30.792], name: "Бровари" },
  irpin:           { coord: [50.521, 30.249], name: "Ірпінь" },
  bucha:           { coord: [50.546, 30.235], name: "Буча" },
  hostomel:        { coord: [50.566, 30.265], name: "Гостомель" },
  vyshhorod:       { coord: [50.585, 30.406], name: "Вишгород" },
  obukhiv:         { coord: [50.103, 30.620], name: "Обухів" },
  boryspil:        { coord: [50.350, 30.950], name: "Бориспіль" },
  desna:           { coord: [50.502, 30.622], name: "Десна" },
  solomianka:      { coord: [50.434, 30.470], name: "Солом'янка" },
  podil:           { coord: [50.466, 30.516], name: "Поділ" },
  darnytsia:       { coord: [50.434, 30.622], name: "Дарниця" },
  sviatoshyn:      { coord: [50.450, 30.400], name: "Святошин" },
  holosiiv:        { coord: [50.390, 30.510], name: "Голосіїв" },
  obolon:          { coord: [50.500, 30.520], name: "Оболонь" },
  pechersk:        { coord: [50.435, 30.560], name: "Печерськ" },
  pozniaky:        { coord: [50.410, 30.620], name: "Позняки" },
  knyazhychi:      { coord: [50.530, 30.900], name: "Княжичі" },
  vplyka_dymerska: { coord: [50.620, 30.920], name: "Велика Димерка" },
  slavutych:       { coord: [51.520, 30.760], name: "Славутич" },
  kyiv:            { coord: [50.450, 30.520], name: "Київ" },
};

export function toponymName(key: string | null, raw: string | null): string {
  if (key && TOPONYM_CENTERS[key]) return TOPONYM_CENTERS[key].name;
  if (raw) return raw;
  return "напрямок невідомий";
}
