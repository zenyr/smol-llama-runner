export const beautfyFilesize = (size: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unit = 0;
  while (size > 1024) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(2)} ${units[unit]}`;
};
