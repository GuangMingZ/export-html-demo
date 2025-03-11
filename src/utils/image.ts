// 图片上传到 OSS 的函数
export const uploadToOSS = async (blob: Blob): Promise<string> => {
  // 这里替换为实际的上传逻辑
  const formData = new FormData();
  formData.append("file", blob);

  // 替换为你自己的图床地址
  const response = await fetch("https://oss.image.com/upload", {
    method: "POST",
    body: formData,
  });

  const { url } = await response.json();
  return url;
};

// 下载图片并转换为 Blob
export const downloadImage = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  return response.blob();
};
