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

export function useWeather() {
  const weather = ref<Weather | null>(null)
  const loading = ref(false)
  const error = ref('')

  /** 通过 IP 定位拿经纬度+城市（不弹授权） */
  async function locateByIP(): Promise<{ lat: number; lon: number; city: string } | null> {
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

  /** 浏览器定位（更精准，会弹授权）；失败回退 IP 定位 */
  function locateByBrowser(): Promise<{ lat: number; lon: number } | null> {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 },
      )
    })
  }

  async function fetchWeather() {
    loading.value = true
    error.value = ''
    try {
      // 先 IP 定位拿城市名，再尝试浏览器定位拿更精准坐标
      const ip = await locateByIP()
      const browser = await locateByBrowser()
      const lat = browser?.lat ?? ip?.lat
      const lon = browser?.lon ?? ip?.lon
      const city = ip?.city || '所在地'
      if (lat == null || lon == null) {
        error.value = '无法定位'
        return
      }
      const j = await $fetch<any>('https://api.open-meteo.com/v1/forecast', {
        params: {
          latitude: lat,
          longitude: lon,
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
      weather.value = {
        city,
        temp: Math.round(cur.temperature_2m),
        desc,
        emoji,
        humidity: cur.relative_humidity_2m,
        wind: cur.wind_speed_10m,
      }
    } catch (e: any) {
      error.value = '天气获取失败'
    } finally {
      loading.value = false
    }
  }

  return { weather, loading, error, fetchWeather }
}
