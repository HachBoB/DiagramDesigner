/**
 * Браузерный download helper превращает строку в временный Blob URL и кликает
 * скрытую ссылку, поэтому экспорт не требует отдельного backend route.
 */
export function downloadTextFile(filename, content, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}
