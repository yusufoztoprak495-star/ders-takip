// YKS neti: her 4 yanlış 1 doğruyu götürür. Net hiçbir yerde saklanmaz, hep buradan hesaplanır.
export function netOf(correct, wrong) {
  return Math.round((correct - wrong / 4) * 100) / 100;
}
