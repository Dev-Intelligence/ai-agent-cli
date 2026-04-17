/**
 * Anthropic API 的服务器端限制常量
 *
 * 这些值由 Anthropic API 强制执行，客户端提前校验以给出更清晰的错误。
 * 保持本文件零依赖，避免循环引用。
 *
 * 来源参考：api/api/schemas/messages/blocks/ 与 api/api/config.py。
 */

// =============================================================================
// 图片限制
// =============================================================================

/**
 * API 允许的 base64 图片字符串最大长度（不是原始字节数）。
 * base64 编码会把体积放大 ~33%，所以 5MB base64 大约对应 3.75MB 原图。
 */
export const API_IMAGE_MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * 原始图片体积目标上限：5MB * 3/4 ≈ 3.75MB。
 * 高于这个值编码后会撞 base64 长度限制。
 */
export const IMAGE_TARGET_RAW_SIZE = (API_IMAGE_MAX_BASE64_SIZE * 3) / 4;

/**
 * 客户端图片缩放的宽高上限。
 *
 * 注：API 服务端会把超过 1568px 的图片自动缩放（不会报错），
 * 客户端定在 2000px 略宽，尽量保留信息；真正会报错的硬顶还是
 * API_IMAGE_MAX_BASE64_SIZE。
 */
export const IMAGE_MAX_WIDTH = 2000;
export const IMAGE_MAX_HEIGHT = 2000;

// =============================================================================
// PDF 限制
// =============================================================================

/**
 * 整个请求（含上下文）的大小上限是 32MB；base64 展开后约 4/3，
 * 这里留出对话上下文空间，把单 PDF 目标大小定在 20MB。
 */
export const PDF_TARGET_RAW_SIZE = 20 * 1024 * 1024; // 20 MB

/** API 接受的单个 PDF 最多页数 */
export const API_PDF_MAX_PAGES = 100;

/**
 * 超过此阈值的 PDF 不再整体作为 base64 document 块发送，
 * 而是被拆成一张张页面图片送入。
 */
export const PDF_EXTRACT_SIZE_THRESHOLD = 3 * 1024 * 1024; // 3 MB

/** 走"页面抽取"路径时单 PDF 的最大体积 */
export const PDF_MAX_EXTRACT_SIZE = 100 * 1024 * 1024; // 100 MB

/** Read 工具单次调用能抽取的最大页数 */
export const PDF_MAX_PAGES_PER_READ = 20;

/** @ 提及 PDF 时：超过此页数不再内联，改成引用方式 */
export const PDF_AT_MENTION_INLINE_THRESHOLD = 10;

// =============================================================================
// 多媒体总数限制
// =============================================================================

/**
 * 单次 API 请求允许的媒体项（图片 + PDF）总数。
 * 超限时 API 会报一个不直观的错误，所以客户端提前卡。
 */
export const API_MAX_MEDIA_PER_REQUEST = 100;
