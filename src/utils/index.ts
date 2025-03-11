/**
 * 休眠指定的毫秒数
 * @param ms 休眠时间（毫秒）
 * @returns Promise对象
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
