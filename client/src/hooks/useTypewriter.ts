import { useState, useEffect } from 'react';

export function useTypewriter(text: string, typingSpeed: number = 100, deletingSpeed: number = 50, pauseDuration: number = 1500) {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayText.length < text.length) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length + 1));
        }, typingSpeed);
      } else {
        // Pause after typing completes
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseDuration);
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length - 1));
        }, deletingSpeed);
      } else {
        // Add pause before starting new cycle to avoid glitch
        timeout = setTimeout(() => {
          setIsDeleting(false);
        }, 300);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, text, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}
