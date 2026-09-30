'use client';

import { DotIndicator } from 'flickering-dots/react';

export function Indicator() {
  return <DotIndicator set="pulse" state="thinking" size={48} />;
}
