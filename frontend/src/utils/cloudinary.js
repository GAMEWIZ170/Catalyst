// low asks Cloudinary for its smaller-file quality setting (used by low-data mode).
export function imageUrl(url, width, low = false) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,${low ? "q_auto:low" : "q_auto"},c_limit,w_${width}/`);
}
