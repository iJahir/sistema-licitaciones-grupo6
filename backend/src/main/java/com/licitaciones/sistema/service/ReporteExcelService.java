package com.licitaciones.sistema.service;

import com.licitaciones.sistema.dto.*;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Map;

@Service
public class ReporteExcelService {

    private void applyGeneralStyles(Workbook workbook, Sheet sheet, String title) {
        // Enforce grid lines visible
        sheet.setDisplayGridlines(true);
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 10);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        font.setColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFont(font);
        return style;
    }

    private CellStyle createSubTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setItalic(true);
        font.setFontHeightInPoints((short) 9);
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFont(font);
        return style;
    }

    private CellStyle createKpiStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 9);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook, HorizontalAlignment alignment) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 9);
        style.setFont(font);
        style.setAlignment(alignment);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook workbook) {
        CellStyle style = createDataStyle(workbook, HorizontalAlignment.RIGHT);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("$#,##0.00"));
        return style;
    }

    private void autoSizeColumns(Sheet sheet, int colCount) {
        for (int i = 0; i < colCount; i++) {
            sheet.autoSizeColumn(i);
            // Add a bit of extra margin
            int currentWidth = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, Math.min(255 * 256, currentWidth + 1200));
        }
    }

    public byte[] generarExcelLicitaciones(ReporteLicitacionesDTO dto) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Licitaciones");
            applyGeneralStyles(workbook, sheet, "Reporte Resumen de Licitaciones");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("REPORTE RESUMEN DE LICITACIONES");
            titleCell.setCellStyle(createTitleStyle(workbook));

            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Sistema Nacional de Licitaciones - Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            Row kpiRow = sheet.createRow(3);
            Cell k1 = kpiRow.createCell(0);
            k1.setCellValue("Total Licitaciones: " + dto.getTotalLicitaciones());
            k1.setCellStyle(createKpiStyle(workbook));

            BigDecimal pres = dto.getPresupuestoTotal() != null ? dto.getPresupuestoTotal() : BigDecimal.ZERO;
            Cell k2 = kpiRow.createCell(1);
            k2.setCellValue("Presupuesto Total: $" + pres.doubleValue());
            k2.setCellStyle(createKpiStyle(workbook));

            // Table Headers
            String[] headers = {"ID", "Título", "Área", "Estado", "Presupuesto", "Fecha Inicio", "Fecha Fin"};
            Row headerRow = sheet.createRow(5);
            CellStyle hStyle = createHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);
            CellStyle dCurrency = createCurrencyStyle(workbook);

            int rowIdx = 6;
            for (ReporteLicitacionesDTO.LicitacionReportItem item : dto.getItems()) {
                Row row = sheet.createRow(rowIdx++);
                
                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getId());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getTitulo());
                c1.setCellStyle(dLeft);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getArea());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getEstado());
                c3.setCellStyle(dCenter);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getPresupuesto() != null ? item.getPresupuesto().doubleValue() : 0.0);
                c4.setCellStyle(dCurrency);

                Cell c5 = row.createCell(5);
                c5.setCellValue(item.getFechaInicio());
                c5.setCellStyle(dCenter);

                Cell c6 = row.createCell(6);
                c6.setCellValue(item.getFechaFin());
                c6.setCellStyle(dCenter);
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte de licitaciones en Excel", e);
        }
    }

    public byte[] generarExcelPropuestas(ReportePropuestasDTO dto) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Propuestas");
            applyGeneralStyles(workbook, sheet, "Reporte de Propuestas Recibidas");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("REPORTE DE PROPUESTAS RECIBIDAS");
            titleCell.setCellStyle(createTitleStyle(workbook));

            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Sistema Nacional de Licitaciones - Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            Row kpiRow = sheet.createRow(3);
            Cell k1 = kpiRow.createCell(0);
            k1.setCellValue("Total Propuestas: " + dto.getTotalPropuestas());
            k1.setCellStyle(createKpiStyle(workbook));

            Cell k2 = kpiRow.createCell(1);
            k2.setCellValue("Promedio Calificación: " + String.format("%.2f", dto.getPromedioPuntaje()));
            k2.setCellStyle(createKpiStyle(workbook));

            BigDecimal totalOfertado = dto.getMontoTotalOfertado() != null ? dto.getMontoTotalOfertado() : BigDecimal.ZERO;
            Cell k3 = kpiRow.createCell(2);
            k3.setCellValue("Monto Total Ofertado: $" + totalOfertado.doubleValue());
            k3.setCellStyle(createKpiStyle(workbook));

            // Table Headers
            String[] headers = {"ID", "Licitación", "Empresa", "Monto", "Puntaje", "Estrellas", "Fecha Envío", "Estado"};
            Row headerRow = sheet.createRow(5);
            CellStyle hStyle = createHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);
            CellStyle dCurrency = createCurrencyStyle(workbook);

            int rowIdx = 6;
            for (ReportePropuestasDTO.PropuestaReportItem item : dto.getItems()) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getId());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getLicitacionTitulo());
                c1.setCellStyle(dLeft);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getEmpresa());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getMonto() != null ? item.getMonto() : 0.0);
                c3.setCellStyle(dCurrency);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getPuntaje() != null ? String.valueOf(item.getPuntaje()) : "N/A");
                c4.setCellStyle(dCenter);

                Cell c5 = row.createCell(5);
                c5.setCellValue(item.getEstrellas() != null ? String.valueOf(item.getEstrellas()) : "N/A");
                c5.setCellStyle(dCenter);

                Cell c6 = row.createCell(6);
                c6.setCellValue(item.getFechaEnvio());
                c6.setCellStyle(dCenter);

                Cell c7 = row.createCell(7);
                c7.setCellValue(item.getEstado());
                c7.setCellStyle(dCenter);
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte de propuestas en Excel", e);
        }
    }

    public byte[] generarExcelEvaluaciones(ReporteEvaluacionesDTO dto) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Evaluaciones");
            applyGeneralStyles(workbook, sheet, "Reporte de Adjudicaciones y Evaluaciones");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("REPORTE DE ADJUDICACIONES Y EVALUACIONES");
            titleCell.setCellStyle(createTitleStyle(workbook));

            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Sistema Nacional de Licitaciones - Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            Row kpiRow = sheet.createRow(3);
            Cell k1 = kpiRow.createCell(0);
            k1.setCellValue("Total Evaluaciones: " + dto.getTotalEvaluaciones());
            k1.setCellStyle(createKpiStyle(workbook));

            Cell k2 = kpiRow.createCell(1);
            k2.setCellValue("Promedio Estrellas: " + String.format("%.2f", dto.getPromedioEstrellas()) + " ★");
            k2.setCellStyle(createKpiStyle(workbook));

            // Table Headers
            String[] headers = {"ID", "Propuesta", "Empresa", "Evaluador", "Puntaje Total", "Puntaje Ponderado", "Estrellas", "Resultado", "Fecha"};
            Row headerRow = sheet.createRow(5);
            CellStyle hStyle = createHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);

            int rowIdx = 6;
            for (ReporteEvaluacionesDTO.EvaluacionReportItem item : dto.getItems()) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getId());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getPropuesta());
                c1.setCellStyle(dLeft);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getEmpresa());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getEvaluador());
                c3.setCellStyle(dLeft);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getPuntajeTotal() != null ? String.valueOf(item.getPuntajeTotal()) : "N/A");
                c4.setCellStyle(dCenter);

                Cell c5 = row.createCell(5);
                c5.setCellValue(item.getPuntajePonderado() != null ? String.valueOf(item.getPuntajePonderado()) : "N/A");
                c5.setCellStyle(dCenter);

                Cell c6 = row.createCell(6);
                c6.setCellValue(item.getEstrellas() != null ? String.valueOf(item.getEstrellas()) + " ★" : "N/A");
                c6.setCellStyle(dCenter);

                Cell c7 = row.createCell(7);
                c7.setCellValue(item.getResultado());
                c7.setCellStyle(dCenter);

                Cell c8 = row.createCell(8);
                c8.setCellValue(item.getFecha());
                c8.setCellStyle(dCenter);
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte de evaluaciones en Excel", e);
        }
    }

    public byte[] generarExcelEvaluadores(ReporteEvaluadoresDTO dto) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Comisiones");
            applyGeneralStyles(workbook, sheet, "Análisis de Desempeño de Comisiones");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("ANÁLISIS DE DESEMPEÑO DE COMISIONES");
            titleCell.setCellStyle(createTitleStyle(workbook));

            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Sistema Nacional de Licitaciones - Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            Row kpiRow = sheet.createRow(3);
            Cell k1 = kpiRow.createCell(0);
            k1.setCellValue("Total Evaluadores: " + dto.getTotalEvaluadores());
            k1.setCellStyle(createKpiStyle(workbook));

            Cell k2 = kpiRow.createCell(1);
            k2.setCellValue("Total Evaluaciones: " + dto.getTotalEvaluaciones());
            k2.setCellStyle(createKpiStyle(workbook));

            Cell k3 = kpiRow.createCell(2);
            k3.setCellValue("Promedio Estrellas General: " + String.format("%.2f", dto.getPromedioEstrellasGeneral()) + " ★");
            k3.setCellStyle(createKpiStyle(workbook));

            // Table Headers
            String[] headers = {"ID Evaluador", "Nombre", "Usuario", "Evaluaciones Realizadas", "Propuestas Aprobadas", "Promedio Estrellas", "Promedio Puntaje"};
            Row headerRow = sheet.createRow(5);
            CellStyle hStyle = createHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);

            int rowIdx = 6;
            for (ReporteEvaluadoresDTO.EvaluadorStatsItem item : dto.getItems()) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getId());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getNombre());
                c1.setCellStyle(dLeft);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getUsername());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getEvaluacionesRealizadas());
                c3.setCellStyle(dCenter);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getPropuestasAprobadas());
                c4.setCellStyle(dCenter);

                Cell c5 = row.createCell(5);
                c5.setCellValue(String.format("%.1f", item.getPromedioEstrellas()) + " ★");
                c5.setCellStyle(dCenter);

                Cell c6 = row.createCell(6);
                c6.setCellValue(String.format("%.1f", item.getPromedioPuntaje()));
                c6.setCellStyle(dCenter);
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte de evaluadores en Excel", e);
        }
    }

    public byte[] generarExcelContratos(ReporteContratosDTO dto) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Contratos");
            applyGeneralStyles(workbook, sheet, "Reporte de Contratos por Estado");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("REPORTE DE CONTRATOS POR ESTADO");
            titleCell.setCellStyle(createTitleStyle(workbook));

            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Sistema Nacional de Licitaciones - Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            Row kpiRow = sheet.createRow(3);
            Cell k1 = kpiRow.createCell(0);
            k1.setCellValue("Total Contratos: " + dto.getTotalContratos());
            k1.setCellStyle(createKpiStyle(workbook));

            Cell k2 = kpiRow.createCell(1);
            k2.setCellValue("Firmados: " + dto.getContratosFirmados());
            k2.setCellStyle(createKpiStyle(workbook));

            Cell k3 = kpiRow.createCell(2);
            k3.setCellValue("Pendientes: " + dto.getContratosPendientes());
            k3.setCellStyle(createKpiStyle(workbook));

            BigDecimal totalMonto = dto.getMontoTotalContratos() != null ? dto.getMontoTotalContratos() : BigDecimal.ZERO;
            Cell k4 = kpiRow.createCell(3);
            k4.setCellValue("Monto Total Contratado: $" + totalMonto.doubleValue());
            k4.setCellStyle(createKpiStyle(workbook));

            // Table Headers
            String[] headers = {"ID Contrato", "Código", "Licitación", "Proveedor Nombre", "Monto", "Fecha Firma", "Estado"};
            Row headerRow = sheet.createRow(5);
            CellStyle hStyle = createHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);
            CellStyle dCurrency = createCurrencyStyle(workbook);

            int rowIdx = 6;
            for (ReporteContratosDTO.ContratoReportItem item : dto.getItems()) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getId());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getCodigo());
                c1.setCellStyle(dCenter);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getLicitacionTitulo());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getProveedorNombre());
                c3.setCellStyle(dLeft);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getMonto() != null ? item.getMonto() : 0.0);
                c4.setCellStyle(dCurrency);

                Cell c5 = row.createCell(5);
                c5.setCellValue(item.getFechaFirma());
                c5.setCellStyle(dCenter);

                Cell c6 = row.createCell(6);
                c6.setCellValue(item.getEstado());
                c6.setCellStyle(dCenter);
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte de contratos en Excel", e);
        }
    }

    public byte[] generarExcelAdjudicaciones(ReporteAdjudicacionesDTO dto) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Adjudicaciones");
            applyGeneralStyles(workbook, sheet, "Reporte de Adjudicaciones por Periodo");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("REPORTE DE ADJUDICACIONES POR PERIODO");
            titleCell.setCellStyle(createTitleStyle(workbook));

            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Sistema Nacional de Licitaciones - Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            Row kpiRow = sheet.createRow(3);
            Cell k1 = kpiRow.createCell(0);
            k1.setCellValue("Total Adjudicaciones: " + dto.getTotalAdjudicaciones());
            k1.setCellStyle(createKpiStyle(workbook));

            BigDecimal totalAdj = dto.getMontoTotalAdjudicado() != null ? dto.getMontoTotalAdjudicado() : BigDecimal.ZERO;
            Cell k2 = kpiRow.createCell(1);
            k2.setCellValue("Monto Total Adjudicado: $" + totalAdj.doubleValue());
            k2.setCellStyle(createKpiStyle(workbook));

            Cell k3 = kpiRow.createCell(2);
            k3.setCellValue("Promedio por Adjudicación: $" + dto.getPromedioMontoAdjudicado());
            k3.setCellStyle(createKpiStyle(workbook));

            // Table Headers
            String[] headers = {"ID Licitación", "Licitación", "Área Solicitante", "Proveedor Ganador", "Monto Adjudicado", "Fecha Adjudicación", "Estado"};
            Row headerRow = sheet.createRow(5);
            CellStyle hStyle = createHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);
            CellStyle dCurrency = createCurrencyStyle(workbook);

            int rowIdx = 6;
            for (ReporteAdjudicacionesDTO.AdjudicionReportItem item : dto.getItems()) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getLicitacionId());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getLicitacionTitulo());
                c1.setCellStyle(dLeft);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getAreaNombre());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getProveedorNombre());
                c3.setCellStyle(dLeft);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getMontoAdjudicado() != null ? item.getMontoAdjudicado().doubleValue() : 0.0);
                c4.setCellStyle(dCurrency);

                Cell c5 = row.createCell(5);
                c5.setCellValue(item.getFechaAdjudicacion());
                c5.setCellStyle(dCenter);

                Cell c6 = row.createCell(6);
                c6.setCellValue(item.getEstado());
                c6.setCellStyle(dCenter);
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte de adjudicaciones en Excel", e);
        }
    }

    public byte[] generarExcelFinanciero(ReporteFinancieroDTO dto) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Resumen Financiero");
            applyGeneralStyles(workbook, sheet, "Informe de Análisis Financiero");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("INFORME DE ANÁLISIS FINANCIERO Y EJECUCIÓN");
            titleCell.setCellStyle(createTitleStyle(workbook));

            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Generado el " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            Row kpiRow = sheet.createRow(3);
            Cell k1 = kpiRow.createCell(0);
            BigDecimal presTotal = dto.getPresupuestoTotal() != null ? dto.getPresupuestoTotal() : BigDecimal.ZERO;
            k1.setCellValue("Presupuesto Total Estimado: $" + presTotal.doubleValue());
            k1.setCellStyle(createKpiStyle(workbook));

            BigDecimal presEjec = dto.getPresupuestoEjecutado() != null ? dto.getPresupuestoEjecutado() : BigDecimal.ZERO;
            Cell k2 = kpiRow.createCell(1);
            k2.setCellValue("Presupuesto Ejecutado (Contratos): $" + presEjec.doubleValue());
            k2.setCellStyle(createKpiStyle(workbook));

            BigDecimal montoAdj = dto.getMontoAdjudicado() != null ? dto.getMontoAdjudicado() : BigDecimal.ZERO;
            Cell k3 = kpiRow.createCell(2);
            k3.setCellValue("Monto Total Adjudicado: $" + montoAdj.doubleValue());
            k3.setCellStyle(createKpiStyle(workbook));

            // Top Contracts Table
            Row sectionHeaderRow = sheet.createRow(5);
            Cell secCell = sectionHeaderRow.createCell(0);
            secCell.setCellValue("TOP 5 CONTRATOS DE MAYOR CUANTÍA");
            secCell.setCellStyle(createTitleStyle(workbook));

            String[] headers = {"Código", "Licitación vinculada", "Proveedor Ganador", "Monto Contrato", "Estado"};
            Row headerRow = sheet.createRow(7);
            CellStyle hStyle = createHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);
            CellStyle dCurrency = createCurrencyStyle(workbook);

            int rowIdx = 8;
            for (ReporteFinancieroDTO.TopContratoItem item : dto.getTopContratos()) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getCodigo());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getLicitacionTitulo());
                c1.setCellStyle(dLeft);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getProveedorNombre());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getMonto() != null ? item.getMonto().doubleValue() : 0.0);
                c3.setCellStyle(dCurrency);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getEstado());
                c4.setCellStyle(dCenter);
            }

            // Top Suppliers Table
            Row sectionHeaderRow2 = sheet.createRow(rowIdx + 2);
            Cell secCell2 = sectionHeaderRow2.createCell(0);
            secCell2.setCellValue("TOP 5 PROVEEDORES POR MONTO ACUMULADO");
            secCell2.setCellStyle(createTitleStyle(workbook));

            String[] headers2 = {"Proveedor Adjudicado", "Contratos Registrados", "Monto Total Acumulado"};
            Row headerRow2 = sheet.createRow(rowIdx + 4);
            for (int i = 0; i < headers2.length; i++) {
                Cell cell = headerRow2.createCell(i);
                cell.setCellValue(headers2[i]);
                cell.setCellStyle(hStyle);
            }

            int rowIdx2 = rowIdx + 5;
            for (ReporteFinancieroDTO.TopProveedorItem item : dto.getTopProveedores()) {
                Row row = sheet.createRow(rowIdx2++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getProveedorNombre());
                c0.setCellStyle(dLeft);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getContratosAdjudicados());
                c1.setCellStyle(dCenter);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getMontoTotal() != null ? item.getMontoTotal().doubleValue() : 0.0);
                c2.setCellStyle(dCurrency);
            }

            autoSizeColumns(sheet, 5);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte financiero en Excel", e);
        }
    }

    public byte[] generarExcelCronograma(ReporteCronogramaDTO dto) {
        Workbook workbook = new XSSFWorkbook();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            Sheet sheet = workbook.createSheet("Cronograma");
            applyGeneralStyles(workbook, sheet, "Cronograma");

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("CRONOGRAMA DE EVENTOS Y HITOS DE LICITACIONES");
            titleCell.setCellStyle(createTitleStyle(workbook));

            // Subtitle
            Row subRow = sheet.createRow(1);
            Cell subCell = subRow.createCell(0);
            subCell.setCellValue("Generado automáticamente por el Sistema Nacional de Licitaciones");
            subCell.setCellStyle(createSubTitleStyle(workbook));

            // KPIs
            CellStyle kStyle = createKpiStyle(workbook);
            Row kpiRow = sheet.createRow(3);
            Cell k0 = kpiRow.createCell(0);
            k0.setCellValue("Total Eventos: " + dto.getTotalEventos());
            k0.setCellStyle(kStyle);

            Cell k1 = kpiRow.createCell(1);
            k1.setCellValue("Licitaciones: " + dto.getTotalLicitacionesAsociadas());
            k1.setCellStyle(kStyle);

            Cell k2 = kpiRow.createCell(2);
            k2.setCellValue("Propuestas: " + dto.getTotalPropuestasAsociadas());
            k2.setCellStyle(kStyle);

            // Table Headers
            String[] headers = {"Fecha/Hora", "Título", "Descripción", "Tipo Evento", "Prioridad", "Área", "Responsable"};
            CellStyle hStyle = createHeaderStyle(workbook);
            Row headerRow = sheet.createRow(5);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(hStyle);
            }

            // Styles
            CellStyle dLeft = createDataStyle(workbook, HorizontalAlignment.LEFT);
            CellStyle dCenter = createDataStyle(workbook, HorizontalAlignment.CENTER);

            // Table Data
            int rowIdx = 6;
            for (ReporteCronogramaDTO.CronogramaReportItem item : dto.getItems()) {
                Row row = sheet.createRow(rowIdx++);

                Cell c0 = row.createCell(0);
                c0.setCellValue(item.getFechaEvento());
                c0.setCellStyle(dCenter);

                Cell c1 = row.createCell(1);
                c1.setCellValue(item.getTitulo());
                c1.setCellStyle(dLeft);

                Cell c2 = row.createCell(2);
                c2.setCellValue(item.getDescripcion());
                c2.setCellStyle(dLeft);

                Cell c3 = row.createCell(3);
                c3.setCellValue(item.getTipoEvento());
                c3.setCellStyle(dCenter);

                Cell c4 = row.createCell(4);
                c4.setCellValue(item.getPrioridad());
                c4.setCellStyle(dCenter);

                Cell c5 = row.createCell(5);
                c5.setCellValue(item.getArea());
                c5.setCellStyle(dLeft);

                Cell c6 = row.createCell(6);
                c6.setCellValue(item.getUsuario());
                c6.setCellStyle(dLeft);
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error al generar reporte de cronograma en Excel", e);
        }
    }
}
