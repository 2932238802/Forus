import { ref } from 'vue'

export interface Weather {
  city: string
  temp: number
  desc: string
  emoji: string
  humidity: number
  wind: number
}

// WMO 天气代码 → 中文描述 + emoji
const WMO: Record<number, [string, string]> = {
  0: ['晴', '☀️'],
  1: ['晴间多云', '🌤️'],
  2: ['多云', '⛅'],
  3: ['阴', '☁️'],
  45: ['雾', '🌫️'],
  48: ['雾凇', '🌫️'],
  51: ['毛毛雨', '🌦️'],
  53: ['小雨', '🌦️'],
  55: ['中雨', '🌧️'],
  56: ['冻毛毛雨', '🌨️'],
  57: ['冻雨', '🌨️'],
  61: ['小雨', '🌧️'],
  63: ['中雨', '🌧️'],
  65: ['大雨', '🌧️'],
  66: ['冻雨', '🌨️'],
  67: ['冻雨', '🌨️'],
  71: ['小雪', '🌨️'],
  73: ['中雪', '❄️'],
  75: ['大雪', '❄️'],
  77: ['雪粒', '❄️'],
  80: ['阵雨', '🌦️'],
  81: ['阵雨', '🌧️'],
  82: ['强阵雨', '⛈️'],
  85: ['阵雪', '🌨️'],
  86: ['强阵雪', '❄️'],
  95: ['雷阵雨', '⛈️'],
  96: ['雷阵雨伴冰雹', '⛈️'],
  99: ['强雷暴', '⛈️'],
}

interface Coords {
  lat: number
  lon: number
}

interface WeatherCache {
  data: Weather
  coords: Coords | null
  city: string
  at: number
}

const CACHE_KEY = 'forus_weather_v1'
const CACHE_TTL = 30 * 60 * 1000

function readCache(): WeatherCache | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WeatherCache
    if (!parsed?.data || typeof parsed.at !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(payload: WeatherCache) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

/** 只有已经授权定位时才调用浏览器定位，避免每次进入都弹窗。 */
async function canUseBrowserLocation(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return false
  try {
    if (!navigator.permissions?.query) return false
    const status = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    })
    return status.state === 'granted'
  } catch {
    return false
  }
}

export function useWeather() {
  const weather = ref<Weather | null>(null)
  const loading = ref(false)
  const error = ref('')

  /** 通过 IP 定位拿经纬度+城市（不弹授权） */
  async function locateByIP(): Promise<(Coords & { city: string }) | null> {
    try {
      const j = await $fetch<any>('https://ipapi.co/json/')
      if (j && j.latitude && j.longitude) {
        return { lat: j.latitude, lon: j.longitude, city: j.city || '所在地' }
      }
    } catch {
      /* ignore */
    }
    return null
  }

  /** 浏览器定位（仅已授权时调用）；失败回退 IP 定位 */
  function locateByBrowser(): Promise<Coords | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 },
      )
    })
  }

  async function fetchWeather(force = false) {
    loading.value = true
    error.value = ''

    const cache = readCache()
    if (!force && cache && Date.now() - cache.at < CACHE_TTL) {
      weather.value = cache.data
      loading.value = false
      return
    }

    try {
      // 1) 坐标：优先复用缓存，避免重复请求 IP 定位
      let coords: Coords | null = cache?.coords ?? null
      let city = cache?.city || '所在地'

      if (!coords) {
        const ip = await locateByIP()
        if (ip) {
          coords = { lat: ip.lat, lon: ip.lon }
          city = ip.city
        }
        if (await canUseBrowserLocation()) {
          const browser = await locateByBrowser()
          if (browser) coords = browser
        }
      }

      if (!coords) {
        error.value = '无法定位'
        return
      }

      // 2) 天气
      const j = await $fetch<any>('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: coords.lat,
          longitude: coords.lon,
          current: 'temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m',
          timezone: 'auto',
        },
      })
      const cur = j?.current
      if (!cur) {
        error.value = '天气获取失败'
        return
      }

      const [desc, emoji] = WMO[cur.weather_code] || ['未知', '🌡️']
      const data: Weather = {
        city,
        temp: Math.round(cur.temperature_2m),
        desc,
        emoji,
        humidity: cur.relative_humidity_2m,
        wind: cur.wind_speed_10m,
      }
      weather.value = data
      writeCache({ data, coords, city, at: Date.now() })
    } catch {
      error.value = '天气获取失败'
    } finally {
      loading.value = false
    }
  }

  function refresh() {
    return fetchWeather(true)
  }

  return { weather, loading, error, fetchWeather, refresh }
}
