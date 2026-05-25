package com.licitaciones.sistema.service;

import com.licitaciones.sistema.dto.*;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

@Service
public class ReportePdfService {

    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.US);

    private void addHeader(Document document, String title) throws DocumentException {
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.DARK_GRAY);
        Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.GRAY);

        Paragraph pTitle = new Paragraph(title, titleFont);
        pTitle.setAlignment(Element.ALIGN_CENTER);
        document.add(pTitle);

        Paragraph pSub = new Paragraph("Sistema Nacional de Licitaciones - Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")), subFont);
        pSub.setAlignment(Element.ALIGN_CENTER);
        pSub.setSpacingAfter(20);
        document.add(pSub);
    }

    private PdfPCell createHeaderCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE)));
        cell.setBackgroundColor(new Color(37, 99, 235)); // Premium Blue
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(6);
        return cell;
    }

    private PdfPCell createCell(String text, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK)));
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(5);
        return cell;
    }

    public byte[] generarPdfLicitaciones(ReporteLicitacionesDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "REPORTE RESUMEN DE LICITACIONES");

            // KPI Box
            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen Ejecutivo:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            kpis.add("• Total de Licitaciones: " + dto.getTotalLicitaciones() + "\n");
            BigDecimal pres = dto.getPresupuestoTotal() != null ? dto.getPresupuestoTotal() : BigDecimal.ZERO;
            kpis.add("• Presupuesto Total: " + currencyFormatter.format(pres) + "\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            // Table
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 3f, 2f, 2f, 2f, 2f});

            table.addCell(createHeaderCell("ID"));
            table.addCell(createHeaderCell("Título"));
            table.addCell(createHeaderCell("Área"));
            table.addCell(createHeaderCell("Estado"));
            table.addCell(createHeaderCell("Presupuesto"));
            table.addCell(createHeaderCell("Fecha Cierre"));

            for (ReporteLicitacionesDTO.LicitacionReportItem item : dto.getItems()) {
                table.addCell(createCell(String.valueOf(item.getId()), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getTitulo(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getArea(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getEstado(), Element.ALIGN_CENTER));
                table.addCell(createCell(currencyFormatter.format(item.getPresupuesto()), Element.ALIGN_RIGHT));
                table.addCell(createCell(item.getFechaFin(), Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    public byte[] generarPdfPropuestas(ReportePropuestasDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "REPORTE DE PROPUESTAS RECIBIDAS");

            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen Ejecutivo:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            kpis.add("• Total de Propuestas: " + dto.getTotalPropuestas() + "\n");
            kpis.add("• Promedio de Calificación: " + String.format("%.2f", dto.getPromedioPuntaje()) + " / 100\n");
            BigDecimal totalOfertado = dto.getMontoTotalOfertado() != null ? dto.getMontoTotalOfertado() : BigDecimal.ZERO;
            kpis.add("• Flujo Total Ofertado: " + currencyFormatter.format(totalOfertado) + "\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 3f, 2f, 2f, 1.5f, 1.5f});

            table.addCell(createHeaderCell("ID"));
            table.addCell(createHeaderCell("Licitación"));
            table.addCell(createHeaderCell("Empresa"));
            table.addCell(createHeaderCell("Monto"));
            table.addCell(createHeaderCell("Puntaje"));
            table.addCell(createHeaderCell("Estado"));

            for (ReportePropuestasDTO.PropuestaReportItem item : dto.getItems()) {
                table.addCell(createCell(String.valueOf(item.getId()), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getLicitacionTitulo(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getEmpresa(), Element.ALIGN_LEFT));
                double val = item.getMonto() != null ? item.getMonto() : 0.0;
                table.addCell(createCell(currencyFormatter.format(val), Element.ALIGN_RIGHT));
                table.addCell(createCell(item.getPuntaje() != null ? String.valueOf(item.getPuntaje()) : "N/A", Element.ALIGN_CENTER));
                table.addCell(createCell(item.getEstado(), Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    public byte[] generarPdfEvaluaciones(ReporteEvaluacionesDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "REPORTE DE ADJUDICACIONES Y EVALUACIONES");

            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen Ejecutivo:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            kpis.add("• Total de Evaluaciones: " + dto.getTotalEvaluaciones() + "\n");
            kpis.add("• Promedio General de Estrellas: " + String.format("%.2f", dto.getPromedioEstrellas()) + " ★\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 2.5f, 2.5f, 2f, 1.5f, 1.5f});

            table.addCell(createHeaderCell("ID"));
            table.addCell(createHeaderCell("Propuesta"));
            table.addCell(createHeaderCell("Empresa"));
            table.addCell(createHeaderCell("Evaluador"));
            table.addCell(createHeaderCell("Calificación"));
            table.addCell(createHeaderCell("Resultado"));

            for (ReporteEvaluacionesDTO.EvaluacionReportItem item : dto.getItems()) {
                table.addCell(createCell(String.valueOf(item.getId()), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getPropuesta(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getEmpresa(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getEvaluador(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getPuntajeTotal() != null ? String.valueOf(item.getPuntajeTotal()) : "N/A", Element.ALIGN_CENTER));
                table.addCell(createCell(item.getResultado(), Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    public byte[] generarPdfEvaluadores(ReporteEvaluadoresDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "ANÁLISIS FINANCIERO Y DESEMPEÑO DE COMISIONES");

            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen Ejecutivo:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            kpis.add("• Total de Comités/Evaluadores: " + dto.getTotalEvaluadores() + "\n");
            kpis.add("• Calificaciones Totales Procesadas: " + dto.getTotalEvaluaciones() + "\n");
            kpis.add("• Promedio de Estrellas Otorgado: " + String.format("%.2f", dto.getPromedioEstrellasGeneral()) + " ★\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2f, 2f, 2f, 2f, 2f, 2f});

            table.addCell(createHeaderCell("Nombre"));
            table.addCell(createHeaderCell("Usuario"));
            table.addCell(createHeaderCell("Revisiones"));
            table.addCell(createHeaderCell("Aprobadas"));
            table.addCell(createHeaderCell("Prom. Estrellas"));
            table.addCell(createHeaderCell("Prom. Puntaje"));

            for (ReporteEvaluadoresDTO.EvaluadorStatsItem item : dto.getItems()) {
                table.addCell(createCell(item.getNombre(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getUsername(), Element.ALIGN_LEFT));
                table.addCell(createCell(String.valueOf(item.getEvaluacionesRealizadas()), Element.ALIGN_CENTER));
                table.addCell(createCell(String.valueOf(item.getPropuestasAprobadas()), Element.ALIGN_CENTER));
                table.addCell(createCell(String.format("%.1f", item.getPromedioEstrellas()) + " ★", Element.ALIGN_CENTER));
                table.addCell(createCell(String.format("%.1f", item.getPromedioPuntaje()), Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    public byte[] generarPdfContratos(ReporteContratosDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "REPORTE DE CONTRATOS POR ESTADO");

            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen Ejecutivo:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            kpis.add("• Total Contratos Registrados: " + dto.getTotalContratos() + "\n");
            kpis.add("• Contratos Firmados (Activos): " + dto.getContratosFirmados() + "\n");
            kpis.add("• Contratos en Trámite/Pendientes: " + dto.getContratosPendientes() + "\n");
            BigDecimal totalMonto = dto.getMontoTotalContratos() != null ? dto.getMontoTotalContratos() : BigDecimal.ZERO;
            kpis.add("• Monto Total Contratado: " + currencyFormatter.format(totalMonto) + "\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 2.5f, 2.5f, 2f, 1.5f, 1.5f});

            table.addCell(createHeaderCell("Código"));
            table.addCell(createHeaderCell("Licitación"));
            table.addCell(createHeaderCell("Proveedor"));
            table.addCell(createHeaderCell("Monto"));
            table.addCell(createHeaderCell("Fecha Firma"));
            table.addCell(createHeaderCell("Estado"));

            for (ReporteContratosDTO.ContratoReportItem item : dto.getItems()) {
                table.addCell(createCell(item.getCodigo(), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getLicitacionTitulo(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getProveedorNombre(), Element.ALIGN_LEFT));
                double val = item.getMonto() != null ? item.getMonto() : 0.0;
                table.addCell(createCell(currencyFormatter.format(val), Element.ALIGN_RIGHT));
                table.addCell(createCell(item.getFechaFirma(), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getEstado(), Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    public byte[] generarPdfAdjudicaciones(ReporteAdjudicacionesDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "REPORTE DE ADJUDICACIONES POR PERIODO");

            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen Ejecutivo:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            kpis.add("• Total de Adjudicaciones: " + dto.getTotalAdjudicaciones() + "\n");
            BigDecimal totalAdjudicado = dto.getMontoTotalAdjudicado() != null ? dto.getMontoTotalAdjudicado() : BigDecimal.ZERO;
            kpis.add("• Monto Total Adjudicado: " + currencyFormatter.format(totalAdjudicado) + "\n");
            kpis.add("• Promedio por Adjudicación: " + currencyFormatter.format(dto.getPromedioMontoAdjudicado()) + "\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1f, 2.5f, 2f, 2f, 2f, 1.5f});

            table.addCell(createHeaderCell("ID Licitación"));
            table.addCell(createHeaderCell("Licitación"));
            table.addCell(createHeaderCell("Área"));
            table.addCell(createHeaderCell("Proveedor"));
            table.addCell(createHeaderCell("Monto"));
            table.addCell(createHeaderCell("Fecha"));

            for (ReporteAdjudicacionesDTO.AdjudicionReportItem item : dto.getItems()) {
                table.addCell(createCell(String.valueOf(item.getLicitacionId()), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getLicitacionTitulo(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getAreaNombre(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getProveedorNombre(), Element.ALIGN_LEFT));
                table.addCell(createCell(currencyFormatter.format(item.getMontoAdjudicado()), Element.ALIGN_RIGHT));
                table.addCell(createCell(item.getFechaAdjudicacion(), Element.ALIGN_CENTER));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    public byte[] generarPdfFinanciero(ReporteFinancieroDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "INFORME DE ANÁLISIS FINANCIERO Y PRESUPUESTARIO");

            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen Ejecutivo de Presupuestos:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            BigDecimal presTotal = dto.getPresupuestoTotal() != null ? dto.getPresupuestoTotal() : BigDecimal.ZERO;
            BigDecimal presEjec = dto.getPresupuestoEjecutado() != null ? dto.getPresupuestoEjecutado() : BigDecimal.ZERO;
            BigDecimal montoAdj = dto.getMontoAdjudicado() != null ? dto.getMontoAdjudicado() : BigDecimal.ZERO;
            kpis.add("• Presupuesto Estimado Total: " + currencyFormatter.format(presTotal) + "\n");
            kpis.add("• Presupuesto Ejecutado (Contratos): " + currencyFormatter.format(presEjec) + "\n");
            kpis.add("• Monto Total Adjudicado: " + currencyFormatter.format(montoAdj) + "\n");
            kpis.add("• Contratos Activos: " + dto.getContratosActivos() + "   |   Contratos Finalizados: " + dto.getContratosFinalizados() + "\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            Paragraph subtitle = new Paragraph("TOP 5 CONTRATOS DE MAYOR CUANTÍA", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.DARK_GRAY));
            subtitle.setSpacingAfter(10);
            document.add(subtitle);

            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 3f, 2.5f, 2f, 1.5f});

            table.addCell(createHeaderCell("Código"));
            table.addCell(createHeaderCell("Licitación"));
            table.addCell(createHeaderCell("Proveedor"));
            table.addCell(createHeaderCell("Monto"));
            table.addCell(createHeaderCell("Estado"));

            for (ReporteFinancieroDTO.TopContratoItem item : dto.getTopContratos()) {
                table.addCell(createCell(item.getCodigo(), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getLicitacionTitulo(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getProveedorNombre(), Element.ALIGN_LEFT));
                table.addCell(createCell(currencyFormatter.format(item.getMonto()), Element.ALIGN_RIGHT));
                table.addCell(createCell(item.getEstado(), Element.ALIGN_CENTER));
            }
            document.add(table);

            Paragraph subtitle2 = new Paragraph("\nTOP 5 PROVEEDORES POR CAPTACIÓN DE FONDOS", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.DARK_GRAY));
            subtitle2.setSpacingAfter(10);
            document.add(subtitle2);

            PdfPTable table2 = new PdfPTable(3);
            table2.setWidthPercentage(100);
            table2.setWidths(new float[]{4f, 2f, 3f});

            table2.addCell(createHeaderCell("Proveedor"));
            table2.addCell(createHeaderCell("Contratos Adjudicados"));
            table2.addCell(createHeaderCell("Monto Total Acumulado"));

            for (ReporteFinancieroDTO.TopProveedorItem item : dto.getTopProveedores()) {
                table2.addCell(createCell(item.getProveedorNombre(), Element.ALIGN_LEFT));
                table2.addCell(createCell(String.valueOf(item.getContratosAdjudicados()), Element.ALIGN_CENTER));
                table2.addCell(createCell(currencyFormatter.format(item.getMontoTotal()), Element.ALIGN_RIGHT));
            }
            document.add(table2);

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }

    public byte[] generarPdfCronograma(ReporteCronogramaDTO dto) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            addHeader(document, "CRONOGRAMA DE EVENTOS Y HITOS DE LICITACIONES");

            // KPI Box
            Paragraph kpis = new Paragraph();
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK));
            kpis.add("Resumen de Eventos:\n");
            kpis.setFont(FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK));
            kpis.add("• Total de Eventos Registrados: " + dto.getTotalEventos() + "\n");
            kpis.add("• Eventos de Licitaciones: " + dto.getTotalLicitacionesAsociadas() + "\n");
            kpis.add("• Eventos de Propuestas: " + dto.getTotalPropuestasAsociadas() + "\n\n");
            kpis.setSpacingAfter(15);
            document.add(kpis);

            // Table
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2f, 3.5f, 2f, 1.5f, 1.5f, 1.5f});

            table.addCell(createHeaderCell("Fecha/Hora"));
            table.addCell(createHeaderCell("Título / Descripción"));
            table.addCell(createHeaderCell("Tipo"));
            table.addCell(createHeaderCell("Prioridad"));
            table.addCell(createHeaderCell("Área"));
            table.addCell(createHeaderCell("Responsable"));

            for (ReporteCronogramaDTO.CronogramaReportItem item : dto.getItems()) {
                table.addCell(createCell(item.getFechaEvento(), Element.ALIGN_CENTER));
                
                String titleAndDesc = item.getTitulo() + (item.getDescripcion() != null && !item.getDescripcion().isEmpty() ? "\n" + item.getDescripcion() : "");
                table.addCell(createCell(titleAndDesc, Element.ALIGN_LEFT));
                table.addCell(createCell(item.getTipoEvento(), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getPrioridad(), Element.ALIGN_CENTER));
                table.addCell(createCell(item.getArea(), Element.ALIGN_LEFT));
                table.addCell(createCell(item.getUsuario(), Element.ALIGN_LEFT));
            }

            document.add(table);
            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return out.toByteArray();
    }
}
