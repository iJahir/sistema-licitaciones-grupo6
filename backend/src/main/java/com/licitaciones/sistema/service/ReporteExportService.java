package com.licitaciones.sistema.service;

import com.licitaciones.sistema.dto.*;
import com.licitaciones.sistema.entity.EstadoLicitacion;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ReporteExportService {

    @Autowired
    private ReporteService reporteService;

    @Autowired
    private ReportePdfService pdfService;

    @Autowired
    private ReporteExcelService excelService;

    public byte[] exportarReporte(String tipoReporte, String formato, Long areaId, String estado, 
                                  String fechaInicio, String fechaFin, Long licitacionId, Long evaluadorId) {
        
        boolean isPdf = "pdf".equalsIgnoreCase(formato);

        switch (tipoReporte.toLowerCase()) {
            case "licitaciones":
                EstadoLicitacion estadoLic = null;
                if (estado != null && !estado.isEmpty()) {
                    try {
                        estadoLic = EstadoLicitacion.valueOf(estado.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        // ignore
                    }
                }
                ReporteLicitacionesDTO licDto = reporteService.getReporteLicitaciones(areaId, estadoLic, fechaInicio, fechaFin);
                return isPdf ? pdfService.generarPdfLicitaciones(licDto) : excelService.generarExcelLicitaciones(licDto);

            case "propuestas":
                ReportePropuestasDTO propDto = reporteService.getReportePropuestas(licitacionId, estado);
                return isPdf ? pdfService.generarPdfPropuestas(propDto) : excelService.generarExcelPropuestas(propDto);

            case "evaluaciones":
                ReporteEvaluacionesDTO evalDto = reporteService.getReporteEvaluaciones(evaluadorId);
                return isPdf ? pdfService.generarPdfEvaluaciones(evalDto) : excelService.generarExcelEvaluaciones(evalDto);

            case "evaluadores":
                ReporteEvaluadoresDTO evaluadoresDto = reporteService.getReporteEvaluadores();
                return isPdf ? pdfService.generarPdfEvaluadores(evaluadoresDto) : excelService.generarExcelEvaluadores(evaluadoresDto);

            case "contratos":
                ReporteContratosDTO contDto = reporteService.getReporteContratos(estado, fechaInicio, fechaFin);
                return isPdf ? pdfService.generarPdfContratos(contDto) : excelService.generarExcelContratos(contDto);

            case "adjudicaciones":
                ReporteAdjudicacionesDTO adjDto = reporteService.getReporteAdjudicaciones(areaId, fechaInicio, fechaFin);
                return isPdf ? pdfService.generarPdfAdjudicaciones(adjDto) : excelService.generarExcelAdjudicaciones(adjDto);

            case "financiero":
                ReporteFinancieroDTO finDto = reporteService.getReporteFinanciero();
                return isPdf ? pdfService.generarPdfFinanciero(finDto) : excelService.generarExcelFinanciero(finDto);

            case "cronograma":
                ReporteCronogramaDTO cronDto = reporteService.getReporteCronograma();
                return isPdf ? pdfService.generarPdfCronograma(cronDto) : excelService.generarExcelCronograma(cronDto);

            default:
                throw new IllegalArgumentException("Tipo de reporte no soportado: " + tipoReporte);
        }
    }
}
