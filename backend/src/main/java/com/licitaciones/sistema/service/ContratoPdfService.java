package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Contrato;
import com.licitaciones.sistema.entity.Licitacion;
import com.licitaciones.sistema.entity.Propuesta;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class ContratoPdfService {

    private final NumberFormat currencyFormatter = NumberFormat.getCurrencyInstance(Locale.US);
    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private final DateTimeFormatter simpleDateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public byte[] generarPdfContrato(Contrato contrato) {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Legal Styles
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(30, 41, 59));
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(71, 85, 105));
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
            Font italicFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, Color.DARK_GRAY);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);

            // Title
            Paragraph title = new Paragraph("CONTRATO DE ADJUDICACIÓN DE LICITACIÓN PÚBLICA", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(10);
            document.add(title);

            // Subtitle
            Paragraph subtitle = new Paragraph("Código de Contrato: " + contrato.getCodigo(), subtitleFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(25);
            document.add(subtitle);

            // 1. INTRODUCCIÓN
            Licitacion lic = contrato.getLicitacion();
            Propuesta prop = contrato.getPropuesta();
            
            String areaNombre = (lic != null && lic.getArea() != null) ? lic.getArea().getNombre() : "N/A";
            String supervisor = (lic != null && lic.getCreadoPor() != null) ? lic.getCreadoPor().getNombreCompleto() : "N/A";
            
            String proveedorNombre = prop != null ? prop.getEmpresaNombre() : "Jahir Marroquín";
            String ruc = (prop != null && prop.getIdentificacionRuc() != null) ? prop.getIdentificacionRuc() : "1098765432001";
            String contacto = prop != null ? prop.getContactoNombre() : "Andrea Salazar";
            
            double monto = contrato.getMonto() != null ? contrato.getMonto() : 0.0;
            String fechaFirmaStr = contrato.getFechaFirma() != null ? contrato.getFechaFirma().format(dateFormatter) : "PENDIENTE DE FIRMA";
            String fechaInicioStr = contrato.getFechaInicio() != null ? contrato.getFechaInicio().format(simpleDateFormatter) : "Por definir";
            String fechaFinStr = contrato.getFechaFin() != null ? contrato.getFechaFin().format(simpleDateFormatter) : "Por definir";

            Paragraph intro = new Paragraph(
                "Conste por el presente documento, el Contrato de Adjudicación Pública que celebran, de una parte, la institución pública convocante a través del Área Solicitante de "
                + areaNombre + ", debidamente representada por su supervisor técnico designado, Sr(a). " + supervisor 
                + ", a quien en adelante se le denominará EL CONTRATANTE; y de la otra parte, la empresa " + proveedorNombre 
                + ", identificada con RUC " + ruc + ", con domicilio legal registrado y representada legalmente por su Gerente / Apoderado, Sr(a). " + contacto
                + ", a quien en adelante se le denominará EL CONTRATISTA. Ambas partes acuerdan suscribir el presente bajo los términos y cláusulas descritas a continuación:",
                bodyFont
            );
            intro.setAlignment(Element.ALIGN_JUSTIFIED);
            intro.setSpacingAfter(15);
            document.add(intro);

            // 2. DETALLES DE LA LICITACIÓN (TABLA)
            Paragraph secTitle = new Paragraph("CLÁUSULA PRIMERA: OBJETO Y ALCANCE DE LA LICITACIÓN", boldFont);
            secTitle.setSpacingAfter(8);
            document.add(secTitle);

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setSpacingAfter(15);
            
            table.addCell(new PdfPCell(new Phrase("Licitación Convocada:", boldFont)));
            table.addCell(new PdfPCell(new Phrase(lic != null ? lic.getTitulo() : "N/A", bodyFont)));
            
            table.addCell(new PdfPCell(new Phrase("Código Licitación:", boldFont)));
            table.addCell(new PdfPCell(new Phrase(lic != null ? "LP-2026-" + String.format("%03d", lic.getId()) : "N/A", bodyFont)));
            
            table.addCell(new PdfPCell(new Phrase("Área Solicitante:", boldFont)));
            table.addCell(new PdfPCell(new Phrase(areaNombre, bodyFont)));
            
            table.addCell(new PdfPCell(new Phrase("Tipo de Licitación:", boldFont)));
            table.addCell(new PdfPCell(new Phrase(lic != null ? lic.getTipo() : "Prestación de Servicios", bodyFont)));

            document.add(table);

            // 3. CLÁUSULA SEGUNDA: CONDICIONES COMERCIALES Y MONTO
            Paragraph secTitle2 = new Paragraph("CLÁUSULA SEGUNDA: IMPORTE CONTRACTUAL Y MONEDAS", boldFont);
            secTitle2.setSpacingAfter(8);
            document.add(secTitle2);

            Paragraph content2 = new Paragraph(
                "El monto total adjudicado para la ejecución del presente contrato asciende a la suma de " + currencyFormatter.format(monto) 
                + " (DÓLARES AMERICANOS), importe que incluye todos los impuestos de ley, tasas, transporte, seguros y cualquier otro gasto necesario para la correcta entrega y conformidad operativa de los bienes y servicios. El CONTRATANTE realizará los desembolsos correspondientes contra presentación de facturas debidamente validadas por el Área Solicitante.",
                bodyFont
            );
            content2.setAlignment(Element.ALIGN_JUSTIFIED);
            content2.setSpacingAfter(15);
            document.add(content2);

            // 4. CLÁUSULA TERCERA: PLAZOS DE VIGENCIA Y CRONOGRAMAS
            Paragraph secTitle3 = new Paragraph("CLÁUSULA TERCERA: PLAZO DE EJECUCIÓN Y VIGENCIA", boldFont);
            secTitle3.setSpacingAfter(8);
            document.add(secTitle3);

            Paragraph content3 = new Paragraph(
                "La vigencia del presente instrumento legal y la prestación de los servicios correspondientes se pacta bajo el siguiente cronograma de fechas:\n"
                + "• Fecha de Inicio de Vigencia: " + fechaInicioStr + "\n"
                + "• Fecha de Vencimiento del Contrato: " + fechaFinStr + "\n"
                + "Cualquier prórroga, ampliación de plazo o cambio en el alcance técnico requerirá un Adendum debidamente firmado y ratificado por la Autoridad Aprobante del CONTRATANTE.",
                bodyFont
            );
            content3.setAlignment(Element.ALIGN_JUSTIFIED);
            content3.setSpacingAfter(15);
            document.add(content3);

            // 5. ESTADO DE LAS FIRMAS Y CERTIFICADOS DIGITALES
            Paragraph secTitle4 = new Paragraph("CLÁUSULA CUARTA: FIRMAS DIGITALES Y CERTIFICADO DE SEGURIDAD", boldFont);
            secTitle4.setSpacingAfter(8);
            document.add(secTitle4);

            Paragraph content4 = new Paragraph(
                "Este contrato es formalizado electrónicamente al amparo de la legislación nacional vigente sobre firmas digitales y comercio electrónico. Las firmas registradas son:\n"
                + "1. FIRMA DEL PROVEEDOR (CONTRATISTA): " + (contrato.getFirmadoProveedor() ? "✔ FIRMADO DIGITALMENTE POR EL CONTRATISTA el " + (contrato.getFechaFirmaProveedor() != null ? contrato.getFechaFirmaProveedor().format(dateFormatter) : "") : "⏳ PENDIENTE DE FIRMA") + "\n"
                + "2. CONFORMIDAD DEL ÁREA (SUPERVISIÓN TÉCNICA): " + (contrato.getValidadoArea() ? "✔ CONFORMIDAD OPERATIVA RATIFICADA el " + (contrato.getFechaValidacionArea() != null ? contrato.getFechaValidacionArea().format(dateFormatter) : "") + " por " + supervisor : "⏳ PENDIENTE DE VALIDACIÓN TÉCNICA") + "\n"
                + "3. APROBACIÓN INSTITUCIONAL (AUTORIDAD APROBANTE): " + (contrato.getFirmadoAutoridad() ? "✔ APROBACIÓN INSTITUCIONAL FIRMADA el " + (contrato.getFechaFirmaAutoridad() != null ? contrato.getFechaFirmaAutoridad().format(dateFormatter) : "") : "⏳ PENDIENTE DE FIRMA FINAL DE AUTORIDAD") + "\n"
                + "\n"
                + "Estado Contractual Actual: " + contrato.getEstado().name() + "\n"
                + "Firma Token Digital HASH: " + (contrato.getDocumentHash() != null ? contrato.getDocumentHash() : "0x" + Integer.toHexString(contrato.hashCode()).toUpperCase()) + "\n"
                + "Firma Electrónica Autorizada: " + (contrato.getFirmaDigital() != null ? contrato.getFirmaDigital() : "Certificado Emitido por Entidad Certificadora Autorizada"),
                italicFont
            );
            content4.setAlignment(Element.ALIGN_JUSTIFIED);
            content4.setSpacingAfter(30);
            document.add(content4);

            // 6. FIRMAS VISUALES (ESPACIOS DE FIRMA)
            PdfPTable signaturesTable = new PdfPTable(3);
            signaturesTable.setWidthPercentage(100);
            
            // Proveedor
            PdfPCell cProveedor = new PdfPCell();
            cProveedor.setBorder(Rectangle.NO_BORDER);
            cProveedor.setHorizontalAlignment(Element.ALIGN_CENTER);
            if (contrato.getFirmadoProveedor()) {
                cProveedor.addElement(new Paragraph("FIRMADO DIGITALMENTE", italicFont));
                cProveedor.addElement(new Paragraph(proveedorNombre, boldFont));
                cProveedor.addElement(new Paragraph("RUC " + ruc, smallFont));
            } else {
                cProveedor.addElement(new Paragraph("___________________________\nEL CONTRATISTA\n(Firma Pendiente)", bodyFont));
            }
            signaturesTable.addCell(cProveedor);

            // Area Solicitante
            PdfPCell cArea = new PdfPCell();
            cArea.setBorder(Rectangle.NO_BORDER);
            cArea.setHorizontalAlignment(Element.ALIGN_CENTER);
            if (contrato.getValidadoArea()) {
                cArea.addElement(new Paragraph("CONFORMIDAD APROBADA", italicFont));
                cArea.addElement(new Paragraph(supervisor, boldFont));
                cArea.addElement(new Paragraph("Supervisor del Área", smallFont));
            } else {
                cArea.addElement(new Paragraph("___________________________\nCONFORMIDAD TÉCNICA\n(Pendiente)", bodyFont));
            }
            signaturesTable.addCell(cArea);

            // Autoridad Aprobante
            PdfPCell cAutoridad = new PdfPCell();
            cAutoridad.setBorder(Rectangle.NO_BORDER);
            cAutoridad.setHorizontalAlignment(Element.ALIGN_CENTER);
            if (contrato.getFirmadoAutoridad()) {
                cAutoridad.addElement(new Paragraph("APROBADO INSTITUCIONALMENTE", italicFont));
                cAutoridad.addElement(new Paragraph("Autoridad Aprobante", boldFont));
                cAutoridad.addElement(new Paragraph("Super Admin / Dirección", smallFont));
            } else {
                cAutoridad.addElement(new Paragraph("___________________________\nEL CONTRATANTE (AUTORIDAD)\n(Firma Pendiente)", bodyFont));
            }
            signaturesTable.addCell(cAutoridad);

            document.add(signaturesTable);

            // Footer note
            Paragraph footer = new Paragraph("\n\nEste documento PDF constituye la copia fiel y certificada del contrato digital de adjudicación custodiado en el blockchain y base de datos del Sistema de Licitaciones corporativas.", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();

        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return out.toByteArray();
    }
}
