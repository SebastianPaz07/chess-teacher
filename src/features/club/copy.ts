/** Copia texto al portapapeles. Si el navegador lo impide, lo muestra para copiarlo a mano. */
export async function copyText(text: string, fallbackLabel = 'Copia el texto'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt(fallbackLabel, text);
    return false;
  }
}
