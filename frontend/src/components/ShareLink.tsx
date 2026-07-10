"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ShareLink.module.css";

export default function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
  }

  return (
    <div className={styles.box}>
      <span className={styles.label}>共有リンク</span>
      <input
        ref={inputRef}
        className={styles.url}
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" className={styles.copy} onClick={copy}>
        {copied ? "コピーしました ✓" : "コピー"}
      </button>
    </div>
  );
}
