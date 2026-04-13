/**
 * BannerView - 启动横幅
 *
 * 使用完整版 LogoV2（双栏边框布局UI）。
 */

import type { BannerConfig } from '../types.js';
import { LogoV2 } from './LogoV2/LogoV2.js';

export interface BannerViewProps {
  config: BannerConfig;
}

export function BannerView({ config }: BannerViewProps) {
  return <LogoV2 config={config} />;
}
