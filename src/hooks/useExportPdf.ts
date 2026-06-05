import { useState, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function dibujarLogoPortada(): string {
  const size = 120;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;

  ctx.strokeStyle = "#4fc3f7";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const bw = 72, bh = 88, bx = cx - bw / 2, by = 18, br = 6;
  ctx.beginPath();
  ctx.moveTo(bx + br, by);
  ctx.lineTo(bx + bw - br, by);
  ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
  ctx.lineTo(bx + bw, by + bh - br);
  ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
  ctx.lineTo(bx + br, by + bh);
  ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
  ctx.lineTo(bx, by + br);
  ctx.quadraticCurveTo(bx, by, bx + br, by);
  ctx.closePath();
  ctx.stroke();

  const clipW = 28, clipH = 10, clipX = cx - clipW / 2, clipY = by - 5;
  ctx.fillStyle = "#1a2b4a";
  ctx.fillRect(clipX - 2, clipY - 2, clipW + 4, clipH + 4);
  ctx.strokeStyle = "#4fc3f7";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(clipX, clipY);
  ctx.lineTo(clipX + clipW, clipY);
  ctx.lineTo(clipX + clipW, clipY + clipH);
  ctx.lineTo(clipX, clipY + clipH);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = "#4fc3f7";
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  const lx = bx + 14, lw = bw - 28;
  const lineY = [by + 28, by + 42, by + 56, by + 70];
  const lineLens = [lw, lw * 0.8, lw, lw * 0.65];
  lineY.forEach((y, i) => {
    ctx.beginPath();
    ctx.moveTo(lx, y);
    ctx.lineTo(lx + lineLens[i], y);
    ctx.stroke();
  });

  return c.toDataURL("image/png");
}

export function useExportPdf(nombreArchivo: string) {
  const [exportando, setExportando] = useState(false);
  const [errorExport, setErrorExport] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [nombrePdf, setNombrePdf] = useState<string>("");

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const limpiarPdf = useCallback(() => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
  }, [pdfUrl]);

  const exportarPdf = useCallback(async () => {
    setExportando(true);
    setErrorExport(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);

    try {
      const contenido = document.getElementById("dashboard-content");
      if (!contenido) {
        throw new Error("No se encontró el contenido del dashboard.");
      }

      const canvas = await html2canvas(contenido, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#f0f2f5",
        scrollX: 0,
        scrollY: 0,
        windowWidth: contenido.scrollWidth,
        windowHeight: contenido.scrollHeight,
        onclone: (clonedDoc, clonedEl) => {
          clonedDoc.documentElement.classList.remove("dark");
          clonedDoc.body.style.backgroundColor = "#f0f2f5";
          clonedEl.style.height = "auto";
          clonedEl.style.overflow = "visible";
          clonedEl.querySelectorAll("[data-html2canvas-ignore]").forEach((el) => {
            (el as HTMLElement).style.display = "none";
          });
        },
      });

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(26, 43, 74);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.setFillColor(79, 195, 247);
      pdf.rect(0, 0, 6, pageH, "F");

      const logoData = dibujarLogoPortada();
      const logoSize = 28;
      const logoX = pageW / 2 - logoSize / 2;
      const logoY = 14;
      pdf.addImage(logoData, "PNG", logoX, logoY, logoSize, logoSize);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("Dashboard de Registros", pageW / 2, logoY + logoSize + 12, { align: "center" });

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(148, 163, 184);
      pdf.text("Análisis mensual de registros · Estilo Power BI", pageW / 2, logoY + logoSize + 22, { align: "center" });

      pdf.setFontSize(10);
      pdf.setTextColor(203, 213, 225);
      const archivoCortado = nombreArchivo.length > 60 ? nombreArchivo.slice(0, 57) + "..." : nombreArchivo;
      pdf.text(`Archivo: ${archivoCortado}`, pageW / 2, logoY + logoSize + 36, { align: "center" });

      const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
      pdf.text(`Generado el ${fecha}`, pageW / 2, logoY + logoSize + 46, { align: "center" });

      pdf.setDrawColor(79, 195, 247);
      pdf.setLineWidth(0.4);
      pdf.line(30, logoY + logoSize + 54, pageW - 30, logoY + logoSize + 54);

      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Sistema de Análisis de Datos · Municipalidad", pageW / 2, pageH - 8, { align: "center" });

      const imgW = pageW;
      const pagesNeeded = Math.ceil((canvas.height * imgW) / canvas.width / pageH);

      for (let i = 0; i < pagesNeeded; i++) {
        pdf.addPage();
        const scale = canvas.width / imgW;
        const srcY = i * pageH * scale;
        const srcH = Math.min(pageH * scale, canvas.height - srcY);

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.round(srcH);
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        }
        const sliceH = (srcH * imgW) / canvas.width;
        pdf.addImage(sliceCanvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, imgW, sliceH);
      }

      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const nombre = `registros-${new Date().toISOString().slice(0, 10)}.pdf`;
      setPdfUrl(url);
      setNombrePdf(nombre);
    } catch (e) {
      console.error("[useExportPdf] Error al generar PDF:", e);
      setErrorExport(
        e instanceof Error ? e.message : "No se pudo generar el PDF. Intentá de nuevo."
      );
    } finally {
      setExportando(false);
    }
  }, [nombreArchivo, pdfUrl]);

  return { exportarPdf, exportando, errorExport, pdfUrl, nombrePdf, limpiarPdf };
}
