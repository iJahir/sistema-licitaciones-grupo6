package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Rubrica;
import com.licitaciones.sistema.entity.Criterio;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.repository.RubricaRepository;
import com.licitaciones.sistema.repository.CriterioRepository;
import com.licitaciones.sistema.repository.LicitacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Service
public class RubricaService {

    @Autowired
    private RubricaRepository rubricaRepository;

    @Autowired
    private CriterioRepository criterioRepository;

    @Autowired
    private LicitacionRepository licitacionRepository;

    public Optional<Rubrica> findByLicitacion(Long licitacionId) {
        return rubricaRepository.findByLicitacionId(licitacionId);
    }

    @Transactional
    public Rubrica save(Rubrica rubrica) {
        // Validate total weights = 100%
        if (rubrica.getCriterios() != null) {
            double totalPeso = rubrica.getCriterios().stream()
                    .mapToDouble(Criterio::getPeso)
                    .sum();
            
            if (Math.abs(totalPeso - 100.0) > 0.001) {
                throw new RuntimeException("La suma de los pesos de los criterios debe ser exactamente 100%. Actual: " + totalPeso + "%");
            }

            // Link criteria to rubric
            rubrica.getCriterios().forEach(c -> c.setRubrica(rubrica));
        }

        return rubricaRepository.save(rubrica);
    }

    public void delete(Long id) {
        rubricaRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public ByteArrayInputStream exportCriteriosPdf(Long licitacionId) {
        Licitacion licitacion = licitacionRepository.findById(licitacionId)
                .orElseThrow(() -> new RuntimeException("Licitación no encontrada"));
        
        Optional<Rubrica> rubricaOpt = rubricaRepository.findByLicitacionId(licitacionId);
        Rubrica rubrica;
        boolean isDefault = false;
        
        if (rubricaOpt.isPresent()) {
            rubrica = rubricaOpt.get();
        } else {
            isDefault = true;
            rubrica = Rubrica.builder()
                    .licitacion(licitacion)
                    .nombre("Rúbrica Estándar - " + (licitacion.getArea() != null ? licitacion.getArea().getNombre() : "General"))
                    .build();
        }

        java.util.List<Criterio> listCriterios = rubrica.getCriterios();
        if (listCriterios == null || listCriterios.isEmpty()) {
            isDefault = true;
            String areaName = licitacion.getArea() != null ? licitacion.getArea().getNombre() : "General";
            java.util.List<String> preguntas = getPreguntasPorArea(areaName);
            listCriterios = new java.util.ArrayList<>();
            for (String q : preguntas) {
                listCriterios.add(Criterio.builder()
                        .nombre(q)
                        .peso(20.0)
                        .puntajeMaximo(10)
                        .build());
            }
            rubrica.setCriterios(listCriterios);
        }

        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font fontTitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new java.awt.Color(30, 58, 138));
            Font fontSubtitle = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.GRAY);
            Font fontSection = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new java.awt.Color(51, 65, 85));
            Font fontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.DARK_GRAY);
            Font fontNormal = FontFactory.getFont(FontFactory.HELVETICA, 10, java.awt.Color.DARK_GRAY);

            // Title
            Paragraph title = new Paragraph("RÚBRICA Y CRITERIOS DE EVALUACIÓN", fontTitle);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(5);
            document.add(title);

            Paragraph subtitle = new Paragraph("SISTEMA GENERAL DE CONTRATACIONES DEL ESTADO", fontSubtitle);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(25);
            document.add(subtitle);

            // 1. INFORMACIÓN DE LA LICITACIÓN
            Paragraph sec1 = new Paragraph("1. INFORMACIÓN GENERAL DE LA LICITACIÓN", fontSection);
            sec1.setSpacingAfter(10);
            document.add(sec1);

            PdfPTable tableInfo = new PdfPTable(2);
            tableInfo.setWidthPercentage(100);
            tableInfo.setWidths(new float[]{1, 2});

            tableInfo.addCell(new Phrase("Licitación / Concurso:", fontBold));
            tableInfo.addCell(new Phrase(licitacion.getTitulo(), fontNormal));

            tableInfo.addCell(new Phrase("Código:", fontBold));
            tableInfo.addCell(new Phrase("LP-2026-" + String.format("%03d", licitacion.getId()), fontNormal));

            tableInfo.addCell(new Phrase("Área Solicitante:", fontBold));
            tableInfo.addCell(new Phrase(licitacion.getArea() != null ? licitacion.getArea().getNombre() : "General", fontNormal));

            tableInfo.addCell(new Phrase("Tipo de Adjudicación:", fontBold));
            tableInfo.addCell(new Phrase(licitacion.getTipo() != null ? licitacion.getTipo() : "Técnico-Económica", fontNormal));

            tableInfo.addCell(new Phrase("Nombre de la Rúbrica:", fontBold));
            tableInfo.addCell(new Phrase(rubrica.getNombre() + (isDefault ? " (Estándar)" : ""), fontNormal));

            tableInfo.setSpacingAfter(20);
            document.add(tableInfo);

            // 2. DESGLOSE DE CRITERIOS
            Paragraph sec2 = new Paragraph("2. CRITERIOS TÉCNICOS DETALLADOS", fontSection);
            sec2.setSpacingAfter(10);
            document.add(sec2);

            PdfPTable tableScores = new PdfPTable(4);
            tableScores.setWidthPercentage(100);
            tableScores.setWidths(new float[]{1, 4, 2, 2});

            tableScores.addCell(new Phrase("N°", fontBold));
            tableScores.addCell(new Phrase("Criterio de Evaluación", fontBold));
            tableScores.addCell(new Phrase("Peso Relativo (%)", fontBold));
            tableScores.addCell(new Phrase("Puntaje Máximo", fontBold));

            int count = 1;
            double totalPeso = 0;
            int totalMax = 0;

            String areaName = licitacion.getArea() != null ? licitacion.getArea().getNombre() : "General";
            java.util.List<String> preguntas = getPreguntasPorArea(areaName);

            for (int i = 0; i < listCriterios.size(); i++) {
                Criterio c = listCriterios.get(i);
                String criterioNombre = c.getNombre();
                
                // Map legacy names or clean names to the actual area-specific question
                if (i < preguntas.size() && (criterioNombre == null || 
                                             criterioNombre.equals("Precio") || 
                                             criterioNombre.equals("Calidad Técnica") || 
                                             criterioNombre.equals("Experiencia") || 
                                             criterioNombre.equals("Tiempo de Entrega") || 
                                             criterioNombre.equals("Viabilidad Regional") ||
                                             criterioNombre.contains("Criterio") ||
                                             criterioNombre.isBlank() ||
                                             !criterioNombre.startsWith("¿"))) {
                    criterioNombre = preguntas.get(i);
                }

                tableScores.addCell(new Phrase(String.valueOf(count++), fontNormal));
                tableScores.addCell(new Phrase(criterioNombre, fontNormal));
                tableScores.addCell(new Phrase(c.getPeso() != null ? c.getPeso() + "%" : "N/A", fontNormal));
                tableScores.addCell(new Phrase(c.getPuntajeMaximo() != null ? c.getPuntajeMaximo() + " pts" : "N/A", fontNormal));
                
                if (c.getPeso() != null) totalPeso += c.getPeso();
                if (c.getPuntajeMaximo() != null) totalMax += c.getPuntajeMaximo();
            }

            tableScores.addCell(new Phrase("", fontBold));
            tableScores.addCell(new Phrase("TOTALES CONSOLIDADOS:", fontBold));
            tableScores.addCell(new Phrase(totalPeso + "%", fontBold));
            tableScores.addCell(new Phrase(totalMax + " pts", fontBold));

            tableScores.setSpacingAfter(25);
            document.add(tableScores);

            // 3. DECLARACIÓN DE TRANSPARENCIA
            Paragraph sec3 = new Paragraph("3. MARCO DE TRANSPARENCIA Y PROBIDAD", fontSection);
            sec3.setSpacingAfter(10);
            document.add(sec3);

            Paragraph complianceText = new Paragraph(
                    "Todos los criterios de evaluación listados en este documento han sido validados por el Comité de Adquisición y " +
                    "se fundamentan en principios constitucionales de igualdad, competencia y libre acceso a la contratación pública. " +
                    "Los evaluadores técnicos acreditados están obligados a ceñirse exclusivamente a la presente rúbrica para calificar " +
                    "los expedientes digitales presentados por los proveedores postulantes.",
                    fontNormal
            );
            complianceText.setLeading(14);
            complianceText.setSpacingAfter(40);
            document.add(complianceText);

            // Stamp and footer
            Paragraph footer = new Paragraph(
                    "Código de Control: RUB-EVAL-LIC-" + licitacionId + "-" + (System.currentTimeMillis() / 1000) + "\n" +
                    "Fecha de Generación: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")) + "\n" +
                    "Este documento representa la versión oficial cargada en el expediente electrónico de la licitación.",
                    fontSubtitle
            );
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return new ByteArrayInputStream(out.toByteArray());
    }

    public java.util.List<String> getPreguntasPorArea(String areaName) {
        if (areaName == null) {
            return java.util.Arrays.asList(
                "¿La solución técnica es adecuada?",
                "¿Cumple requisitos funcionales?",
                "¿Es escalable?",
                "¿Cumple estándares de seguridad?",
                "¿Arquitectura correcta?"
            );
        }
        String normalized = java.text.Normalizer.normalize(areaName, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase();

        switch (normalized) {
            case "FINANZAS":
                return java.util.Arrays.asList(
                    "¿El precio es competitivo?",
                    "¿Cumple con requisitos financieros?",
                    "¿La estructura de costos es clara?",
                    "¿El riesgo financiero es bajo?",
                    "¿El ROI es favorable?"
                );
            case "LOGISTICA":
                return java.util.Arrays.asList(
                    "¿Tiempo de entrega adecuado?",
                    "¿Capacidad operativa suficiente?",
                    "¿Distribución eficiente?",
                    "¿Cobertura adecuada?",
                    "¿Experiencia comprobada?"
                );
            case "RRHH":
                return java.util.Arrays.asList(
                    "¿Perfil adecuado?",
                    "¿Experiencia del equipo?",
                    "¿Cumple normativa laboral?",
                    "¿Equipo competente?",
                    "¿Propuesta clara?"
                );
            case "OPERACIONES":
                return java.util.Arrays.asList(
                    "¿Viabilidad operativa?",
                    "¿Optimiza procesos?",
                    "¿Reduce costos?",
                    "¿Implementación fácil?",
                    "¿Impacto bajo?"
                );
            case "COMERCIAL":
                return java.util.Arrays.asList(
                    "¿Valor comercial?",
                    "¿Potencial de crecimiento?",
                    "¿Competitividad?",
                    "¿Mejora posicionamiento?",
                    "¿Proveedor confiable?"
                );
            case "JURIDICO":
                return java.util.Arrays.asList(
                    "¿Cumple normativas?",
                    "¿Contrato claro?",
                    "¿Riesgos legales bajos?",
                    "¿Cláusulas favorables?",
                    "¿Antecedentes adecuados?"
                );
            case "TI":
            default:
                return java.util.Arrays.asList(
                    "¿La solución técnica es adecuada?",
                    "¿Cumple requisitos funcionales?",
                    "¿Es escalable?",
                    "¿Cumple estándares de seguridad?",
                    "¿Arquitectura correcta?"
                );
        }
    }
}
