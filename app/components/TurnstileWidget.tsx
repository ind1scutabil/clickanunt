"use client";

import { useEffect, useRef, useState } from "react";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  action?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({ onVerify, action }: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const devBypass = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_TURNSTILE_DEV_BYPASS === 'true';

  useEffect(() => {
    if (devBypass) {
      onVerify('dev-bypass');
      return;
    }

    if (!siteKey || !ref.current) {
      return;
    }

    const ensureScript = () => {
      if (document.getElementById('turnstile-script')) return;
      const script = document.createElement('script');
      script.id = 'turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    const renderWidget = () => {
      if (!window.turnstile || !ref.current) return;
      const id = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        action,
        callback: (token: string) => onVerify(token),
      });
      setWidgetId(id);
    };

    ensureScript();

    const interval = setInterval(() => {
      if (window.turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
      }
    };
  }, [action, devBypass, onVerify, siteKey, widgetId]);

  if (devBypass) {
    return (
      <div className="text-xs text-green-600">Turnstile bypass (dev)</div>
    );
  }

  return <div ref={ref} />;
}