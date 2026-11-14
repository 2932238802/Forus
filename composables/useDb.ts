import { useSupabaseClient } from '#imports'

/**
 * 统一获取 Supabase client。
 *
 * 项目没有生成数据库类型（nuxt.config 中 supabase.types = false），
 * @nuxtjs/supabase 的默认泛型会让 insert/update 参数退化为 never。
 * 这里集中放宽为 any，避免每个 composable 重复处理；后续生成类型后可替换为
 * SupabaseClient<Database>。
 */
export function useDb(): any {
  return useSupabaseClient()
}
