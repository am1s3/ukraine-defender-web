import L from "leaflet";
import type { Region } from "./types";
import { TOPONYM_CENTERS } from "./data/toponym-centers";

const GEOJSON_URLS = [
  "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
  "https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1_simplified.geojson",
];

function matchKey(shapeName: string): string | null {
  const low = (shapeName || "").toLowerCase();
  if (low.includes("kyiv") || low.includes("kiev") || low.includes("kyyiv")) {
    return low.includes("oblast") || low.includes("kyyivs") ? "kyiv_oblast" : "kyiv_city";
  }
  const MAP: [string, string[]][] = [
    ["cherkasy", ["cherkas"]], ["chernihiv", ["chernih"]], ["chernivtsi", ["cherniv"]],
    ["dnipro", ["dniprop"]], ["donetsk", ["donets"]], ["ivano_frankivsk", ["ivano"]],
    ["kharkiv", ["kharkiv"]], ["kherson", ["kherson"]], ["khmelnytskyi", ["khmel"]],
    ["kirovohrad", ["kirovoh"]], ["luhansk", ["luhans"]], ["lviv", ["lviv"]],
    ["mykolaiv", ["mykola"]], ["odesa", ["odes", "odessa"]], ["poltava", ["poltav"]],
    ["rivne", ["rivne", "rovno"]], ["sumy", ["sumy"]], ["ternopil", ["ternop"]],
    ["zakarpattia",
