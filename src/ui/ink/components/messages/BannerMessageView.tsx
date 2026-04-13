/**
 * BannerMessageView - 启动横幅展示
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { BannerView } from '../BannerView.js';

type BannerItem = Extract<CompletedItem, { type: 'banner' }>;

export function BannerMessageView({ item }: MessageViewProps<BannerItem>) {
  return <BannerView config={item.config} />;
}

registerMessageView('banner', BannerMessageView);
