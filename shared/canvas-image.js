// Browser images expose naturalWidth; WeChat Canvas images expose width directly.
export const imageWidth = image => image?.naturalWidth ?? image?.width ?? 0;
export const imageHeight = image => image?.naturalHeight ?? image?.height ?? 0;
export const imageReady = image => imageWidth(image) > 0 && imageHeight(image) > 0;
