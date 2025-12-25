if (typeof window !== 'undefined') {
  // @ts-ignore
  window.getRecomendedWallets = () => ({});
  // @ts-ignore
  if (!window.Buffer) {
    (window as any).Buffer = {};
  }
}
export {};
