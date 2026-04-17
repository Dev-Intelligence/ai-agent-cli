import { describe, it, expect } from 'vitest';
import {
  API_IMAGE_MAX_BASE64_SIZE,
  IMAGE_TARGET_RAW_SIZE,
  IMAGE_MAX_WIDTH,
  IMAGE_MAX_HEIGHT,
  PDF_TARGET_RAW_SIZE,
  API_PDF_MAX_PAGES,
  PDF_EXTRACT_SIZE_THRESHOLD,
  PDF_MAX_EXTRACT_SIZE,
  PDF_MAX_PAGES_PER_READ,
  PDF_AT_MENTION_INLINE_THRESHOLD,
  API_MAX_MEDIA_PER_REQUEST,
} from '../../../src/core/constants/apiLimits.js';

describe('apiLimits 常量', () => {
  it('图片尺寸上限 5MB，原图目标 ≈ 3.75MB', () => {
    expect(API_IMAGE_MAX_BASE64_SIZE).toBe(5 * 1024 * 1024);
    expect(IMAGE_TARGET_RAW_SIZE).toBe(((5 * 1024 * 1024) * 3) / 4);
    expect(IMAGE_MAX_WIDTH).toBe(2000);
    expect(IMAGE_MAX_HEIGHT).toBe(2000);
  });

  it('PDF 相关阈值递增合理', () => {
    expect(PDF_EXTRACT_SIZE_THRESHOLD).toBeLessThan(PDF_TARGET_RAW_SIZE);
    expect(PDF_TARGET_RAW_SIZE).toBeLessThan(PDF_MAX_EXTRACT_SIZE);
    expect(API_PDF_MAX_PAGES).toBe(100);
    expect(PDF_MAX_PAGES_PER_READ).toBeLessThan(API_PDF_MAX_PAGES);
    expect(PDF_AT_MENTION_INLINE_THRESHOLD).toBeLessThan(API_PDF_MAX_PAGES);
  });

  it('单请求媒体数上限 100', () => {
    expect(API_MAX_MEDIA_PER_REQUEST).toBe(100);
  });
});
