/**
 * MapService.js
 * 住所から緯度経度への変換(GAS標準の Maps.newGeocoder)と、導入企業の半径検索。
 * 距離はハバーサイン公式で計算する。
 */

/** 住所変換の結果をキャッシュする時間(秒)。同じ住所で無料枠を消費しないようにする */
const GEOCODE_CACHE_SECONDS = 6 * 60 * 60;

/** 架電モードに表示する「近隣の導入企業数」の半径(km) */
const NEARBY_RADII_KM = [1, 3];

/** 地球の半径(km) */
const EARTH_RADIUS_KM = 6371;

/**
 * 住所を緯度経度に変換する
 * @param {string} address
 * @return {{lat: number, lng: number, address: string}}
 */
function geocodeAddress_(address) {
  const query = String(address || '').trim().slice(0, 200);
  if (!query) throw new Error('住所を入力してください。');

  const cache = CacheService.getScriptCache();
  const key = 'geo:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, query, Utilities.Charset.UTF_8));
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  let res;
  try {
    res = Maps.newGeocoder().setRegion('jp').setLanguage('ja').geocode(query);
  } catch (e) {
    writeLog_('geocode', '失敗', e.message);
    throw new Error('住所の検索サービスを利用できませんでした(1日の利用上限に達した可能性があります)。時間をおいてお試しください。');
  }
  if (res.status !== 'OK' || !res.results || !res.results.length) {
    throw new Error('「' + query + '」の場所が見つかりませんでした。住所や駅名を変えてお試しください。');
  }
  const top = res.results[0];
  const result = {
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    address: String(top.formatted_address || query).replace(/^日本、(〒\d{3}-\d{4} )?/, ''),
  };
  cache.put(key, JSON.stringify(result), GEOCODE_CACHE_SECONDS);
  return result;
}

/**
 * 導入企業をすべて取得する
 * @return {{id: string, company: string, address: string, lat: number, lng: number, startDate: string, plan: string, pots: number}[]}
 */
function getCustomers_() {
  const sheet = getSheet_(SHEET.CUSTOMERS);
  if (sheet.getLastRow() < 2) return [];
  const C = COL.CUSTOMER;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.CUSTOMERS].length).getValues()
    .filter(function (r) { return r[C.ID] !== '' && r[C.LAT] !== '' && r[C.LNG] !== ''; })
    .map(function (r) {
      return {
        id: String(r[C.ID]),
        company: String(r[C.COMPANY]),
        address: String(r[C.ADDRESS]),
        lat: Number(r[C.LAT]),
        lng: Number(r[C.LNG]),
        startDate: formatDate_(r[C.START_DATE], 'yyyy-MM-dd'),
        plan: String(r[C.PLAN]),
        pots: Number(r[C.POTS]) || 0,
      };
    });
}

/**
 * 2点間の距離(km)をハバーサイン公式で求める
 * @return {number}
 */
function haversineKm_(lat1, lng1, lat2, lng2) {
  const toRad = function (deg) { return deg * Math.PI / 180; };
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * 指定地点から半径内の導入企業を近い順に返す
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusKm
 * @param {Object[]=} customers 省略時はシートから取得
 * @return {Object[]} distanceKm 付きの導入企業
 */
function findCustomersWithin_(lat, lng, radiusKm, customers) {
  return (customers || getCustomers_())
    .map(function (c) { return Object.assign({ distanceKm: haversineKm_(lat, lng, c.lat, c.lng) }, c); })
    .filter(function (c) { return c.distanceKm <= radiusKm; })
    .sort(function (a, b) { return a.distanceKm - b.distanceKm; });
}

/**
 * 架電モード用:見込み客の近くの導入企業数(半径1km・3km)
 * 「この近くで導入している会社はありますか?」にその場で答えるため。
 * @param {Object} prospect
 * @return {{radiusKm: number, count: number}[]} 緯度経度が無ければ空配列
 */
function countNearbyCustomers_(prospect) {
  if (prospect.lat == null || prospect.lng == null) return [];
  const customers = getCustomers_();
  return NEARBY_RADII_KM.map(function (r) {
    return { radiusKm: r, count: findCustomersWithin_(prospect.lat, prospect.lng, r, customers).length };
  });
}
