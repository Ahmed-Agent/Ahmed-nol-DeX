import { useState, useEffect } from 'react';

export function useTypewriter(texts: string | string[], typingSpeed: number = 60, deletingSpeed: number = 30, pauseDuration: number = 900) {
  const textArray = Array.isArray(texts) ? texts : [texts];
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const currentText = textArray[textIndex];

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayText.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentText.slice(0, displayText.length + 1));
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
          setDisplayText(currentText.slice(0, displayText.length - 1));
        }, deletingSpeed);
      } else {
        // Move to next text or loop back to start
        const nextIndex = (textIndex + 1) % textArray.length;
        setTextIndex(nextIndex);
        setIsDeleting(false);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, currentText, textIndex, textArray, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}
