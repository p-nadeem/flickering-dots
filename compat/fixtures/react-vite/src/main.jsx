import { createRoot } from 'react-dom/client';
import { DotIndicator } from 'flickering-dots/react';

createRoot(document.getElementById('root')).render(<DotIndicator set="pulse" state="thinking" size={48} />);
